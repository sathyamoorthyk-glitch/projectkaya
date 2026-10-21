from django.conf import settings
from rest_framework import serializers
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from .mailer import send_mail_safe
from .models import ContactMessage


class ContactSerializer(serializers.ModelSerializer):
    class Meta:
        model = ContactMessage
        fields = ["name", "email", "phone", "subject", "message"]


class ContactView(APIView):
    """Saves the message, mails the owner, and auto-replies to the visitor."""
    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "contact"

    def post(self, request):
        s = ContactSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        msg = s.save()

        send_mail_safe(
            f"[Website enquiry] {msg.subject or 'New message'} - {msg.name}",
            f"Name: {msg.name}\nEmail: {msg.email}\nPhone: {msg.phone or '-'}\n\n{msg.message}",
            settings.OWNER_EMAIL, reply_to=msg.email,
        )
        send_mail_safe(
            f"Thanks for contacting {settings.SHOP_NAME}",
            f"Hi {msg.name},\n\nThanks for reaching out. We have received your message and "
            f"will get back to you soon.\n\nWarm regards,\n{settings.SHOP_NAME}",
            msg.email,
        )
        return Response({"detail": "Thanks for reaching out. We will get back to you soon."}, status=201)
