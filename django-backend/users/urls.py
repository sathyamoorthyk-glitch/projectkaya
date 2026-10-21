from django.urls import path

from . import views as v

urlpatterns = [
    path("signup/", v.SignupView.as_view()),
    path("login/", v.LoginView.as_view()),
    path("logout/", v.LogoutView.as_view()),
    path("check-email/", v.CheckEmailView.as_view()),
    path("me/", v.MeView.as_view()),
    path("accept-terms/", v.AcceptTermsView.as_view()),
    path("password-reset/request/", v.PasswordResetRequestView.as_view()),
    path("password-reset/confirm/", v.PasswordResetConfirmView.as_view()),
    path("change-password/", v.ChangePasswordView.as_view()),
    path("change-email/", v.ChangeEmailView.as_view()),
    path("addresses/", v.AddressList.as_view()),
    path("addresses/<int:pk>/", v.AddressDetail.as_view()),
]
