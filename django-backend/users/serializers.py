import re

from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers

from .models import MAX_ADDRESSES, Address

User = get_user_model()
PHONE_RE = re.compile(r"^[6-9]\d{9}$")
PIN_RE = re.compile(r"^[1-9]\d{5}$")
ADDRESS_LIMIT_MSG = f"You can store only {MAX_ADDRESSES} addresses. Please delete one to add a new address."


def clean_email(value):
    return value.strip().lower()


class UserSerializer(serializers.ModelSerializer):
    terms_accepted = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ["id", "email", "full_name", "phone", "terms_accepted", "is_staff"]
        read_only_fields = ["id", "email", "is_staff"]

    def get_terms_accepted(self, obj):
        return obj.terms_accepted_at is not None

    def validate_phone(self, v):
        if v and not PHONE_RE.match(v):
            raise serializers.ValidationError("Enter a valid 10-digit mobile number.")
        return v


class SignupSerializer(serializers.Serializer):
    full_name = serializers.CharField(max_length=150)
    email = serializers.EmailField()
    phone = serializers.CharField(max_length=10)
    password = serializers.CharField(write_only=True, min_length=8)

    def validate_email(self, v):
        v = clean_email(v)
        if User.objects.filter(email__iexact=v).exists():
            raise serializers.ValidationError("An account with this email already exists.")
        return v

    def validate_phone(self, v):
        if not PHONE_RE.match(v):
            raise serializers.ValidationError("Enter a valid 10-digit mobile number.")
        return v

    def validate(self, attrs):
        validate_password(attrs["password"], User(email=attrs["email"], full_name=attrs["full_name"]))
        return attrs

    def create(self, data):
        return User.objects.create_user(**data)


class AddressSerializer(serializers.ModelSerializer):
    class Meta:
        model = Address
        fields = ["id", "full_name", "phone", "line1", "line2", "landmark", "city",
                  "state_code", "pincode", "is_default"]
        read_only_fields = ["id"]

    def validate_phone(self, v):
        if not PHONE_RE.match(v):
            raise serializers.ValidationError("Enter a valid 10-digit mobile number.")
        return v

    def validate_pincode(self, v):
        if not PIN_RE.match(v):
            raise serializers.ValidationError("Enter a valid 6-digit pincode.")
        return v

    def validate(self, attrs):
        request = self.context["request"]
        if self.instance is None and request.user.addresses.count() >= MAX_ADDRESSES:
            raise serializers.ValidationError({"detail": ADDRESS_LIMIT_MSG})
        return attrs

    def save(self, **kwargs):
        user = self.context["request"].user
        make_default = self.validated_data.get("is_default") or (
            self.instance is None and not user.addresses.exists())
        obj = super().save(user=user, **kwargs)
        if make_default:
            user.addresses.exclude(pk=obj.pk).update(is_default=False)
            if not obj.is_default:
                obj.is_default = True
                obj.save(update_fields=["is_default"])
        return obj
