from django.contrib import admin
from django.urls import include, path

admin.site.site_header = "Kaya Global Admin"

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/users/", include("users.urls")),
    path("api/catalog/", include("catalog.urls")),
    path("api/orders/", include("orders.urls")),
    path("api/", include("core.urls")),
]
