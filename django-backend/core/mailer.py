import logging

from django.conf import settings
from django.core.mail import EmailMessage

log = logging.getLogger(__name__)


def send_mail_safe(subject, body, to, attachments=(), reply_to=None):
    """Send an email without ever raising. attachments = [(filename, bytes, mimetype)]. Returns True/False."""
    recipients = [to] if isinstance(to, str) else list(to or [])
    recipients = [r for r in recipients if r]
    if not recipients:
        return False
    try:
        msg = EmailMessage(subject, body, settings.DEFAULT_FROM_EMAIL, recipients,
                           reply_to=[reply_to] if reply_to else None)
        for name, data, mime in attachments:
            msg.attach(name, data, mime)
        msg.send()
        return True
    except Exception:
        log.exception("Email failed: %s", subject)
        return False
