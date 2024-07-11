from django.urls import path, include
from .views import WelcomePageView, DepartmentDetailView
from rest_framework.routers import DefaultRouter
from .views import CustomUserViewSet, DepartmentViewSet, GoalViewSet, UEPViewSet, RecordViewSet, LossViewSet

# Define a router for registering API endpoints
router = DefaultRouter()
router.register(r'users', CustomUserViewSet)
router.register(r'departments', DepartmentViewSet)
router.register(r'goals', GoalViewSet)
router.register(r'ueps', UEPViewSet)
router.register(r'records', RecordViewSet)
router.register(r'losses', LossViewSet)


urlpatterns = [
    path('', WelcomePageView.as_view(), name='welcome'),  # URL for the welcome page
    path('department/<int:department_id>/', DepartmentDetailView.as_view(), name='department_detail'),  # URL for department detail view
    path('api/', include(router.urls)),  # Include API URLs from the router
]
