"""
Email service — sends transactional emails to ANY user.
One-time server setup, works for all users automatically.
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


def is_email_configured() -> bool:
    return bool(settings.BREVO_API_KEY or settings.RESEND_API_KEY or settings.SMTP_HOST)


def _send(to_email: str, subject: str, html_body: str, text_body: str) -> bool:
    """
    Try Brevo first (works on Render free tier), then Resend, then SMTP.
    Returns True on success, False on failure.
    """
    if settings.BREVO_API_KEY:
        ok = _send_via_brevo(to_email, subject, html_body, text_body)
        if ok:
            return True

    if settings.RESEND_API_KEY:
        ok = _send_via_resend(to_email, subject, html_body, text_body)
        if ok:
            return True

    if settings.SMTP_HOST:
        ok = _send_via_smtp(to_email, subject, html_body, text_body)
        if ok:
            return True

    logger.warning(f"[Email] All providers failed or none configured. To: {to_email}")
    return False


def _send_via_brevo(to_email: str, subject: str, html_body: str, text_body: str) -> bool:
    """Send via Brevo (Sendinblue) HTTP API — works on Render free tier."""
    payload = json.dumps({
        "sender": {"name": settings.EMAIL_FROM_NAME, "email": settings.EMAIL_FROM_ADDRESS},
        "to": [{"email": to_email}],
        "subject": subject,
        "htmlContent": html_body,
        "textContent": text_body,
    }).encode("utf-8")

    req = urllib.request.Request(
        "https://api.brevo.com/v3/smtp/email",
        data=payload,
        headers={
            "api-key": settings.BREVO_API_KEY,
            "Content-Type": "application/json",
            "Accept": "application/json",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            logger.info(f"[Brevo] ✓ Sent to {to_email} (status {resp.status})")
            return True
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="replace")
        logger.error(f"[Brevo] HTTP {e.code} sending to {to_email}: {body}")
        return False
    except Exception as e:
        logger.error(f"[Brevo] Error sending to {to_email}: {e}")
        return False


def _send_via_smtp(to_email: str, subject: str, html_body: str, text_body: str) -> bool:
    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"]    = f"{settings.EMAIL_FROM_NAME} <{settings.EMAIL_FROM_ADDRESS}>"
    msg["To"]      = to_email
    msg.attach(MIMEText(text_body, "plain"))
    msg.attach(MIMEText(html_body, "html"))

    try:
        logger.info(f"[SMTP] Connecting to {settings.SMTP_HOST}:{settings.SMTP_PORT} as {settings.SMTP_USER}")
        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=15) as server:
            server.ehlo()
            server.starttls()
            server.ehlo()
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            server.sendmail(settings.EMAIL_FROM_ADDRESS, to_email, msg.as_string())
        logger.info(f"[SMTP] ✓ Sent to {to_email}: {subject}")
        return True
    except smtplib.SMTPAuthenticationError as e:
        logger.error(f"[SMTP] Auth failed — wrong SMTP_USER or SMTP_PASSWORD: {e}")
        return False
    except smtplib.SMTPException as e:
        logger.error(f"[SMTP] SMTP error sending to {to_email}: {e}")
        return False
    except Exception as e:
        logger.error(f"[SMTP] Unexpected error sending to {to_email}: {e}")
        return False


def _send_via_resend(to_email: str, subject: str, html_body: str, text_body: str) -> bool:
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
            logger.info(f"[Resend] ✓ Sent to {to_email} (status {resp.status})")
            return True
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="replace")
        logger.error(f"[Resend] HTTP {e.code} sending to {to_email}: {body}")
        return False
    except Exception as e:
        logger.error(f"[Resend] Error sending to {to_email}: {e}")
        return False


# ── Diagnostic ─────────────────────────────────────────────────────────────────

def test_email_config(to_email: str) -> dict:
    """Test all configured email providers and return detailed diagnostics."""
    result = {
        "brevo_configured": bool(settings.BREVO_API_KEY),
        "resend_configured": bool(settings.RESEND_API_KEY),
        "smtp_configured": bool(settings.SMTP_HOST),
        "smtp_host": settings.SMTP_HOST or None,
        "smtp_user": settings.SMTP_USER or None,
        "from_address": settings.EMAIL_FROM_ADDRESS,
        "brevo_result": None,
        "resend_result": None,
        "smtp_result": None,
        "overall": False,
        "error": None,
    }

    test_subject = "Test Email — Smart Resource Allocation"
    test_text    = "This is a test email. Email is working correctly!"

    # 1. Test Brevo
    if settings.BREVO_API_KEY:
        payload = json.dumps({
            "sender": {"name": settings.EMAIL_FROM_NAME, "email": settings.EMAIL_FROM_ADDRESS},
            "to": [{"email": to_email}],
            "subject": test_subject,
            "textContent": test_text,
        }).encode("utf-8")
        req = urllib.request.Request(
            "https://api.brevo.com/v3/smtp/email",
            data=payload,
            headers={"api-key": settings.BREVO_API_KEY, "Content-Type": "application/json"},
            method="POST",
        )
        try:
            with urllib.request.urlopen(req, timeout=15) as resp:
                result["brevo_result"] = f"success (status {resp.status})"
                result["overall"] = True
        except urllib.error.HTTPError as e:
            body = e.read().decode("utf-8", errors="replace")
            result["brevo_result"] = f"HTTP {e.code}: {body}"
            result["error"] = body
        except Exception as e:
            result["brevo_result"] = f"error: {str(e)}"
            result["error"] = str(e)

    # 2. Test Resend (only if Brevo failed)
    if settings.RESEND_API_KEY and not result["overall"]:
        payload = json.dumps({
            "from": f"{settings.EMAIL_FROM_NAME} <{settings.EMAIL_FROM_ADDRESS}>",
            "to": [to_email], "subject": test_subject, "text": test_text,
        }).encode("utf-8")
        req = urllib.request.Request(
            "https://api.resend.com/emails", data=payload,
            headers={"Authorization": f"Bearer {settings.RESEND_API_KEY}", "Content-Type": "application/json"},
            method="POST",
        )
        try:
            with urllib.request.urlopen(req, timeout=10) as resp:
                result["resend_result"] = f"success (status {resp.status})"
                result["overall"] = True
        except urllib.error.HTTPError as e:
            body = e.read().decode("utf-8", errors="replace")
            result["resend_result"] = f"HTTP {e.code}: {body}"
        except Exception as e:
            result["resend_result"] = f"error: {str(e)}"

    # 3. Test SMTP (only if others failed)
    if settings.SMTP_HOST and not result["overall"]:
        try:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = test_subject
            msg["From"] = f"{settings.EMAIL_FROM_NAME} <{settings.EMAIL_FROM_ADDRESS}>"
            msg["To"] = to_email
            msg.attach(MIMEText(test_text, "plain"))
            with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=15) as server:
                server.ehlo(); server.starttls(); server.ehlo()
                server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
                server.sendmail(settings.EMAIL_FROM_ADDRESS, to_email, msg.as_string())
            result["smtp_result"] = "success"
            result["overall"] = True
        except smtplib.SMTPAuthenticationError as e:
            result["smtp_result"] = f"auth_failed: {str(e)}"
            result["error"] = "SMTP auth failed. Check SMTP_USER and SMTP_PASSWORD."
        except Exception as e:
            result["smtp_result"] = f"error: {str(e)}"
            result["error"] = str(e)

    return result


# ── Public email helpers ────────────────────────────────────────────────────────

def send_password_reset_email(to_email: str, full_name: str, reset_token: str) -> bool:
    reset_url = f"{settings.FRONTEND_URL}/reset-password?token={reset_token}"
    subject   = "Reset your Smart Resource Allocation password"
    text_body = f"Hi {full_name},\n\nReset your password (valid 1 hour):\n{reset_url}\n\nIgnore if you didn't request this.\n\n— Smart Resource Allocation"
    html_body = f"""<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;background:#0f172a;color:#e2e8f0;padding:32px;">
<div style="max-width:480px;margin:0 auto;background:#1e293b;border-radius:16px;padding:32px;border:1px solid #334155;">
  <h2 style="color:#60a5fa;margin-top:0;">Reset Your Password</h2>
  <p>Hi <strong>{full_name}</strong>,</p>
  <p>Click below to reset your password. Valid for <strong>1 hour</strong>.</p>
  <div style="text-align:center;margin:32px 0;">
    <a href="{reset_url}" style="background:#3b82f6;color:white;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:bold;display:inline-block;">Reset Password</a>
  </div>
  <p style="color:#94a3b8;font-size:13px;">Or copy: <a href="{reset_url}" style="color:#60a5fa;">{reset_url}</a></p>
  <p style="color:#64748b;font-size:12px;">Ignore this email if you didn't request a reset.</p>
</div></body></html>"""
    return _send(to_email, subject, html_body, text_body)


def send_admin_invite_email(to_email: str, invited_by_name: str, invite_token: str) -> bool:
    invite_url = f"{settings.FRONTEND_URL}/register?invite={invite_token}&role=admin"
    subject    = "You've been invited as Admin — Smart Resource Allocation"
    text_body  = f"Hi,\n\n{invited_by_name} invited you as Admin.\n\nAccept here (48 hours):\n{invite_url}\n\n— Smart Resource Allocation"
    html_body  = f"""<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;background:#0f172a;color:#e2e8f0;padding:32px;">
<div style="max-width:480px;margin:0 auto;background:#1e293b;border-radius:16px;padding:32px;border:1px solid #334155;">
  <h2 style="color:#a78bfa;margin-top:0;">Admin Invitation</h2>
  <p><strong>{invited_by_name}</strong> invited you as Administrator. Valid 48 hours.</p>
  <div style="text-align:center;margin:32px 0;">
    <a href="{invite_url}" style="background:#7c3aed;color:white;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:bold;display:inline-block;">Accept Invitation</a>
  </div>
  <p style="color:#94a3b8;font-size:13px;">Or copy: <a href="{invite_url}" style="color:#a78bfa;">{invite_url}</a></p>
</div></body></html>"""
    return _send(to_email, subject, html_body, text_body)


def send_welcome_email(to_email: str, full_name: str, role: str) -> bool:
    dashboard_url = f"{settings.FRONTEND_URL}/dashboard"
    role_label    = role.replace("_", " ").title()
    subject       = f"Welcome to Smart Resource Allocation, {full_name}!"
    text_body     = f"Hi {full_name},\n\nYour {role_label} account is ready.\n\n{dashboard_url}\n\n— Smart Resource Allocation"
    html_body     = f"""<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;background:#0f172a;color:#e2e8f0;padding:32px;">
<div style="max-width:480px;margin:0 auto;background:#1e293b;border-radius:16px;padding:32px;border:1px solid #334155;">
  <h2 style="color:#34d399;margin-top:0;">Welcome, {full_name}!</h2>
  <p>Your <strong>{role_label}</strong> account is ready.</p>
  <div style="text-align:center;margin:32px 0;">
    <a href="{dashboard_url}" style="background:#10b981;color:white;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:bold;display:inline-block;">Go to Dashboard</a>
  </div>
</div></body></html>"""
    return _send(to_email, subject, html_body, text_body)
