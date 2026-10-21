from django.conf import settings
from django.contrib.auth import authenticate, get_user_model
from django.contrib.auth.password_validation import validate_password
from django.contrib.auth.tokens import default_token_generator
from django.core.exceptions import ValidationError as DjangoValidationError
from django.utils import timezone
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode
from rest_framework import generics, serializers
from rest_framework.authtoken.models import Token
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from core.mailer import send_mail_safe

from .serializers import AddressSerializer, SignupSerializer, UserSerializer, clean_email

User = get_user_model()


class Throttled(APIView):
    """Public endpoints that must be rate limited (stops password / email guessing)."""
    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "auth"


def token_response(user, status=200):
    token, _ = Token.objects.get_or_create(user=user)
    return Response({"token": token.key, "user": UserSerializer(user).data}, status=status)


def check_password_rules(password, user):
    try:
        validate_password(password, user)
    except DjangoValidationError as exc:
        raise serializers.ValidationError({"new_password": list(exc.messages)})


class SignupView(Throttled):
    def post(self, request):
        s = SignupSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        return token_response(s.save(), status=201)


class LoginView(Throttled):
    def post(self, request):
        email = clean_email(str(request.data.get("email", "")))
        user = authenticate(request, email=email, password=request.data.get("password", ""))
        if user is None:
            raise serializers.ValidationError({"detail": "Invalid email or password."})
        return token_response(user)


class CheckEmailView(Throttled):
    """Does this email already exist? Used by Signup and by the 'Forgot user id' page."""
    def post(self, request):
        email = clean_email(str(request.data.get("email", "")))
        return Response({"exists": bool(email) and User.objects.filter(email__iexact=email).exists()})


class LogoutView(APIView):
    def post(self, request):
        Token.objects.filter(user=request.user).delete()
        return Response(status=204)


class MeView(generics.RetrieveUpdateAPIView):
    serializer_class = UserSerializer

    def get_object(self):
        return self.request.user


class AcceptTermsView(APIView):
    def post(self, request):
        if not request.user.terms_accepted_at:
            request.user.terms_accepted_at = timezone.now()
            request.user.save(update_fields=["terms_accepted_at"])
        return Response(UserSerializer(request.user).data)


class PasswordResetRequestView(Throttled):
    """Always answers the same way, so nobody can use it to discover who has an account."""
    def post(self, request):
        email = clean_email(str(request.data.get("email", "")))
        user = User.objects.filter(email__iexact=email, is_active=True).first()
        if user:
            uid = urlsafe_base64_encode(force_bytes(user.pk))
            token = default_token_generator.make_token(user)
            link = f"{settings.FRONTEND_URL}/reset?uid={uid}&token={token}"
            send_mail_safe(
                f"Reset your {settings.SHOP_NAME} password",
                f"Hi {user.full_name},\n\nUse this link to set a new password:\n{link}\n\n"
                "If you did not ask for this, you can ignore this email.",
                user.email,
            )
        return Response({"detail": "If this email is registered, a reset link has been sent to it."})


class PasswordResetConfirmView(Throttled):
    def post(self, request):
        try:
            user = User.objects.get(pk=force_str(urlsafe_base64_decode(request.data.get("uid", ""))))
        except (User.DoesNotExist, ValueError, TypeError, OverflowError):
            user = None
        if not user or not default_token_generator.check_token(user, request.data.get("token", "")):
            raise serializers.ValidationError({"detail": "This reset link is invalid or has expired."})
        new_password = request.data.get("new_password", "")
        check_password_rules(new_password, user)
        user.set_password(new_password)
        user.save()
        Token.objects.filter(user=user).delete()
        return Response({"detail": "Password updated. You can sign in now."})


class ChangePasswordView(APIView):
    def post(self, request):
        user = request.user
        if not user.check_password(request.data.get("current_password", "")):
            raise serializers.ValidationError({"detail": "Current password is incorrect."})
        new_password = request.data.get("new_password", "")
        check_password_rules(new_password, user)
        user.set_password(new_password)
        user.save()
        Token.objects.filter(user=user).delete()
        return token_response(user)  # fresh token so this session stays signed in


class ChangeEmailView(APIView):
    """Updates the email (the user id) in the database. Needs the current password."""
    def post(self, request):
        user = request.user
        if not user.check_password(request.data.get("current_password", "")):
            raise serializers.ValidationError({"detail": "Current password is incorrect."})
        new_email = clean_email(str(request.data.get("new_email", "")))
        try:
            serializers.EmailField().run_validation(new_email)
        except serializers.ValidationError:
            raise serializers.ValidationError({"new_email": ["Enter a valid email address."]})
        if User.objects.filter(email__iexact=new_email).exclude(pk=user.pk).exists():
            raise serializers.ValidationError({"new_email": ["This email is already in use."]})
        old_email = user.email
        user.email = new_email
        user.save(update_fields=["email"])
        send_mail_safe(f"Your {settings.SHOP_NAME} email was changed",
                       f"The email on your account was changed to {new_email}. "
                       "If this was not you, please contact us immediately.", old_email)
        return Response(UserSerializer(user).data)


class AddressList(generics.ListCreateAPIView):
    serializer_class = AddressSerializer

    def get_queryset(self):
        return self.request.user.addresses.all()


class AddressDetail(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = AddressSerializer

    def get_queryset(self):
        return self.request.user.addresses.all()

    def perform_destroy(self, instance):
        was_default = instance.is_default
        user = instance.user
        instance.delete()
        if was_default:
            nxt = user.addresses.first()
            if nxt:
                nxt.is_default = True
                nxt.save(update_fields=["is_default"])
