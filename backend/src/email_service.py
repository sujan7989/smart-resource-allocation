"""
Email service — sends transactional emails to ANY user.

HOW IT WORKS:
  You (the server owner) configure ONE sender account ONCE on Render.
  The server then sends emails to every user automatically — password resets,
  welcome emails, admin invites — no per-user setup needed.

PROVIDER OPTIONS (choose one, set env vars on Render):

  Option 1 — Resend (RECOMMENDED, free, 2-minute setup):
    RESEND_API_KEY = re_xxxxxxxxxxxx
    Get key: https://resend.com → Sign up free → API Keys → Create Key
    Free tier: 3,000 emails/month, no credit card needed.

  Option 2 — Gmail SMTP:
    SMTP_HOST     = smtp.gmail.com
    SMTP_PORT     = 587
    SMTP_USER     = your-gmail@gmail.com
    SMTP_PASSWORD = xxxx xxxx xxxx xxxx   (16-char App Password from Google)

  Option 3 — Any other SMTP provider (SendGrid, Mailgun, Brevo, etc.)

If NEITHER is configured, the reset link is returned directly in the API
response so users can still reset passwords without email.
"""
import json
import smtplib
import logging
import urllib.request
import urllib.error
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from src.config import settings

logger = logging.getLogger(__name__)


# ── Internal send dispatcher ───────────────────────────────────────────────────

def _send(to_email: str, subject: str, html_body: str, text_body: str) -> bool:
    """
    Send an email. Returns True on success, False on failure.
    Tries Resend API first, then SMTP, then logs to console.
    Never raises — email failure must never crash a user request.
    """
    # 1. Resend API (recommended — simple HTTP call, no SMTP config)
    if settings.RESEND_API_KEY:
        return _send_via_resend(to_email, subject, html_body, text_body)

    # 2. SMTP fallback (Gmail, SendGrid, etc.)
    if settings.SMTP_HOST:
        return _send_via_smtp(to_email, subject, html_body, text_body)

    # 3. No email configured — log to console (dev mode)
    logger.warning("=" * 60)
    logger.warning("[EMAIL — no provider configured]")
    logger.warning(f"  To:      {to_email}")
    logger.warning(f"  Subject: {subject}")
    logger.warning(f"  Body:\n{text_body}")
    logger.warning("=" * 60)
    return False


def _send_via_resend(to_email: str, subject: str, html_body: str, text_body: str) -> bool:
    """Send via Resend REST API — no SMTP, just one API key."""
    payload = json.dumps({
        "from": f"{settings.EMAIL_FROM_NAME} <{settings.EMAIL_FROM_ADDRESS}>",
        "to": [to_email],
        "subject": subject,
        "html": html_body,
        "text": text_body,
    }).encode("utf-8")

    req = urllib.request.Request(
        "https://api.resend.com/emails",
        data=payload,
        headers={
            "Authorization": f"Bearer {settings.RESEND_API_KEY}",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            logger.info(f"[Resend] Email sent to {to_email}: {subject} (status {resp.status})")
            return True
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="replace")
        logger.error(f"[Resend] Failed to send to {to_email}: HTTP {e.code} — {body}")
        return False
    except Exception as exc:
        logger.error(f"[Resend] Failed to send to {to_email}: {exc}")
        return False


def _send_via_smtp(to_email: str, subject: str, html_body: str, text_body: str) -> bool:
    """Send via SMTP (Gmail, SendGrid, Mailgun, etc.)."""
    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"]    = f"{settings.EMAIL_FROM_NAME} <{settings.EMAIL_FROM_ADDRESS}>"
    msg["To"]      = to_email
    msg.attach(MIMEText(text_body, "plain"))
    msg.attach(MIMEText(html_body, "html"))

    try:
        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=10) as server:
            server.ehlo()
            if settings.SMTP_PORT == 587:
                server.starttls()
                server.ehlo()
            if settings.SMTP_USER and settings.SMTP_PASSWORD:
                server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            server.sendmail(settings.EMAIL_FROM_ADDRESS, to_email, msg.as_string())
        logger.info(f"[SMTP] Email sent to {to_email}: {subject}")
        return True
    except Exception as exc:
        logger.error(f"[SMTP] Failed to send to {to_email}: {exc}")
        return False


# ── Public helpers ─────────────────────────────────────────────────────────────

def is_email_configured() -> bool:
    """Return True if any email provider is configured."""
    return bool(settings.RESEND_API_KEY or settings.SMTP_HOST)


def send_password_reset_email(to_email: str, full_name: str, reset_token: str) -> bool:
    reset_url = f"{settings.FRONTEND_URL}/reset-password?token={reset_token}"
    subject   = "Reset your Smart Resource Allocation password"

    text_body = f"""Hi {full_name},

We received a request to reset your password.

Click the link below to set a new password (valid for 1 hour):
{reset_url}

If you did not request this, you can safely ignore this email.

— Smart Resource Allocation Team
"""
    html_body = f"""<!DOCTYPE html>
<html>
<body style="font-family:Arial,sans-serif;background:#0f172a;color:#e2e8f0;padding:32px;">
<div style="max-width:480px;margin:0 auto;background:#1e293b;border-radius:16px;padding:32px;border:1px solid #334155;">
  <h2 style="color:#60a5fa;margin-top:0;">Reset Your Password</h2>
  <p>Hi <strong>{full_name}</strong>,</p>
  <p>We received a request to reset your password. Click the button below — valid for <strong>1 hour</strong>.</p>
  <div style="text-align:center;margin:32px 0;">
    <a href="{reset_url}" style="background:#3b82f6;color:white;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:bold;display:inline-block;">
      Reset Password
    </a>
  </div>
  <p style="color:#94a3b8;font-size:13px;">Or copy this link:<br>
    <a href="{reset_url}" style="color:#60a5fa;">{reset_url}</a>
  </p>
  <hr style="border-color:#334155;margin:24px 0;">
  <p style="color:#64748b;font-size:12px;">If you didn't request this, ignore this email.</p>
</div>
</body></html>"""

    return _send(to_email, subject, html_body, text_body)


def send_admin_invite_email(to_email: str, invited_by_name: str, invite_token: str) -> bool:
    invite_url = f"{settings.FRONTEND_URL}/register?invite={invite_token}&role=admin"
    subject    = "You've been invited as Admin — Smart Resource Allocation"

    text_body = f"""Hi,

{invited_by_name} has invited you to join Smart Resource Allocation as an Administrator.

Click the link below to create your admin account (valid for 48 hours):
{invite_url}

— Smart Resource Allocation Team
"""
    html_body = f"""<!DOCTYPE html>
<html>
<body style="font-family:Arial,sans-serif;background:#0f172a;color:#e2e8f0;padding:32px;">
<div style="max-width:480px;margin:0 auto;background:#1e293b;border-radius:16px;padding:32px;border:1px solid #334155;">
  <h2 style="color:#a78bfa;margin-top:0;">Admin Invitation</h2>
  <p><strong>{invited_by_name}</strong> has invited you to join <strong>Smart Resource Allocation</strong> as an Administrator.</p>
  <p>Valid for <strong>48 hours</strong>.</p>
  <div style="text-align:center;margin:32px 0;">
    <a href="{invite_url}" style="background:#7c3aed;color:white;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:bold;display:inline-block;">
      Accept Invitation
    </a>
  </div>
  <p style="color:#94a3b8;font-size:13px;">Or copy this link:<br>
    <a href="{invite_url}" style="color:#a78bfa;">{invite_url}</a>
  </p>
</div>
</body></html>"""

    return _send(to_email, subject, html_body, text_body)


def send_welcome_email(to_email: str, full_name: str, role: str) -> bool:
    dashboard_url = f"{settings.FRONTEND_URL}/dashboard"
    role_label    = role.replace("_", " ").title()
    subject       = f"Welcome to Smart Resource Allocation, {full_name}!"

    text_body = f"Hi {full_name},\n\nWelcome! Your {role_label} account is ready.\n\n{dashboard_url}\n\n— Smart Resource Allocation Team"
    html_body = f"""<!DOCTYPE html>
<html>
<body style="font-family:Arial,sans-serif;background:#0f172a;color:#e2e8f0;padding:32px;">
<div style="max-width:480px;margin:0 auto;background:#1e293b;border-radius:16px;padding:32px;border:1px solid #334155;">
  <h2 style="color:#34d399;margin-top:0;">Welcome aboard, {full_name}!</h2>
  <p>Your <strong>{role_label}</strong> account is ready.</p>
  <div style="text-align:center;margin:32px 0;">
    <a href="{dashboard_url}" style="background:#10b981;color:white;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:bold;display:inline-block;">
      Go to Dashboard
    </a>
  </div>
</div>
</body></html>"""

    return _send(to_email, subject, html_body, text_body)
