"""
Email service — sends transactional emails via SMTP.

Supports any SMTP provider:
  - Gmail (SMTP_HOST=smtp.gmail.com, SMTP_PORT=587, use App Password)
  - SendGrid (SMTP_HOST=smtp.sendgrid.net, SMTP_PORT=587)
  - Mailgun, Brevo, Resend, etc.

If SMTP is not configured (SMTP_HOST is empty), emails are printed to the
console instead — useful for local development without any email setup.
"""
import smtplib
import logging
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from src.config import settings

logger = logging.getLogger(__name__)


def _send(to_email: str, subject: str, html_body: str, text_body: str) -> None:
    """
    Internal: send an email via SMTP or fall back to console logging.
    Raises nothing — email failures are logged but never crash the request.
    """
    if not settings.SMTP_HOST:
        # Dev fallback — print to console so developers can see the link
        logger.info("=" * 60)
        logger.info(f"[EMAIL — no SMTP configured]")
        logger.info(f"  To:      {to_email}")
        logger.info(f"  Subject: {subject}")
        logger.info(f"  Body:\n{text_body}")
        logger.info("=" * 60)
        return

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = f"{settings.EMAIL_FROM_NAME} <{settings.EMAIL_FROM_ADDRESS}>"
    msg["To"] = to_email

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
            server.sendmail(
                settings.EMAIL_FROM_ADDRESS,
                to_email,
                msg.as_string(),
            )
        logger.info(f"Email sent to {to_email}: {subject}")
    except Exception as exc:
        logger.error(f"Failed to send email to {to_email}: {exc}")


# ── Public helpers ─────────────────────────────────────────────────────────────

def send_password_reset_email(to_email: str, full_name: str, reset_token: str) -> None:
    """Send a password reset link to the user."""
    reset_url = f"{settings.FRONTEND_URL}/reset-password?token={reset_token}"

    subject = "Reset your Smart Resource Allocation password"

    text_body = f"""Hi {full_name},

We received a request to reset your password.

Click the link below to set a new password (valid for 1 hour):
{reset_url}

If you did not request this, you can safely ignore this email.
Your password will not change until you click the link above.

— Smart Resource Allocation Team
"""

    html_body = f"""
<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; background: #0f172a; color: #e2e8f0; padding: 32px;">
  <div style="max-width: 480px; margin: 0 auto; background: #1e293b; border-radius: 16px; padding: 32px; border: 1px solid #334155;">
    <h2 style="color: #60a5fa; margin-top: 0;">Reset Your Password</h2>
    <p>Hi <strong>{full_name}</strong>,</p>
    <p>We received a request to reset your password for your Smart Resource Allocation account.</p>
    <p>Click the button below to set a new password. This link is valid for <strong>1 hour</strong>.</p>
    <div style="text-align: center; margin: 32px 0;">
      <a href="{reset_url}"
         style="background: #3b82f6; color: white; padding: 14px 28px; border-radius: 8px;
                text-decoration: none; font-weight: bold; display: inline-block;">
        Reset Password
      </a>
    </div>
    <p style="color: #94a3b8; font-size: 13px;">
      If the button doesn't work, copy and paste this link into your browser:<br>
      <a href="{reset_url}" style="color: #60a5fa;">{reset_url}</a>
    </p>
    <hr style="border-color: #334155; margin: 24px 0;">
    <p style="color: #64748b; font-size: 12px;">
      If you did not request a password reset, you can safely ignore this email.
      Your password will not change.
    </p>
  </div>
</body>
</html>
"""
    _send(to_email, subject, html_body, text_body)


def send_admin_invite_email(
    to_email: str,
    invited_by_name: str,
    invite_token: str,
) -> None:
    """Send an admin invite link to the invited person."""
    invite_url = f"{settings.FRONTEND_URL}/register?invite={invite_token}&role=admin"

    subject = "You've been invited as Admin — Smart Resource Allocation"

    text_body = f"""Hi,

{invited_by_name} has invited you to join Smart Resource Allocation as an Administrator.

Click the link below to create your admin account (valid for 48 hours):
{invite_url}

If you were not expecting this invitation, you can safely ignore this email.

— Smart Resource Allocation Team
"""

    html_body = f"""
<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; background: #0f172a; color: #e2e8f0; padding: 32px;">
  <div style="max-width: 480px; margin: 0 auto; background: #1e293b; border-radius: 16px; padding: 32px; border: 1px solid #334155;">
    <h2 style="color: #a78bfa; margin-top: 0;">Admin Invitation</h2>
    <p><strong>{invited_by_name}</strong> has invited you to join
       <strong>Smart Resource Allocation</strong> as an Administrator.</p>
    <p>Click the button below to create your admin account.
       This invitation is valid for <strong>48 hours</strong>.</p>
    <div style="text-align: center; margin: 32px 0;">
      <a href="{invite_url}"
         style="background: #7c3aed; color: white; padding: 14px 28px; border-radius: 8px;
                text-decoration: none; font-weight: bold; display: inline-block;">
        Accept Invitation
      </a>
    </div>
    <p style="color: #94a3b8; font-size: 13px;">
      If the button doesn't work, copy and paste this link:<br>
      <a href="{invite_url}" style="color: #a78bfa;">{invite_url}</a>
    </p>
    <hr style="border-color: #334155; margin: 24px 0;">
    <p style="color: #64748b; font-size: 12px;">
      If you were not expecting this invitation, you can safely ignore this email.
    </p>
  </div>
</body>
</html>
"""
    _send(to_email, subject, html_body, text_body)


def send_welcome_email(to_email: str, full_name: str, role: str) -> None:
    """Send a welcome email after successful registration."""
    dashboard_url = f"{settings.FRONTEND_URL}/dashboard"
    role_label = role.replace("_", " ").title()

    subject = f"Welcome to Smart Resource Allocation, {full_name}!"

    text_body = f"""Hi {full_name},

Welcome to Smart Resource Allocation! Your account has been created as a {role_label}.

Get started here: {dashboard_url}

— Smart Resource Allocation Team
"""

    html_body = f"""
<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; background: #0f172a; color: #e2e8f0; padding: 32px;">
  <div style="max-width: 480px; margin: 0 auto; background: #1e293b; border-radius: 16px; padding: 32px; border: 1px solid #334155;">
    <h2 style="color: #34d399; margin-top: 0;">Welcome aboard, {full_name}!</h2>
    <p>Your account has been created as a <strong>{role_label}</strong> on Smart Resource Allocation.</p>
    <div style="text-align: center; margin: 32px 0;">
      <a href="{dashboard_url}"
         style="background: #10b981; color: white; padding: 14px 28px; border-radius: 8px;
                text-decoration: none; font-weight: bold; display: inline-block;">
        Go to Dashboard
      </a>
    </div>
  </div>
</body>
</html>
"""
    _send(to_email, subject, html_body, text_body)
