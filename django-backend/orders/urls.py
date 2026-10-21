from django.urls import path

from . import views as v

urlpatterns = [
    path("", v.OrderList.as_view()),
    path("checkout/", v.CheckoutView.as_view()),
    path("verify/", v.VerifyPaymentView.as_view()),
    path("razorpay/webhook/", v.RazorpayWebhookView.as_view()),
    path("<int:pk>/bill/", v.BillDownload.as_view()),
    path("<int:pk>/packing-list/", v.PackingDownload.as_view()),
]
