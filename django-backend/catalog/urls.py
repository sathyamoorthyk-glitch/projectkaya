from django.urls import path

from . import views as v

urlpatterns = [
    path("stores/", v.StoreList.as_view()),
    path("categories/", v.CategoryList.as_view()),
    path("categories/<slug:slug>/", v.CategoryDetail.as_view()),
    path("products/<int:pk>/", v.ProductDetail.as_view()),
    path("search/", v.SearchView.as_view()),
    path("sync/", v.SyncView.as_view()),
]
