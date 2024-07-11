from django.urls import path, include
from django.contrib.auth.views import LogoutView
from .views import CustomLoginView, DashboardView, DepartmentDetailView, WelcomeView, RegisterView
from rest_framework.routers import DefaultRouter
from .views import CustomUserViewSet, DepartmentViewSet, GoalViewSet, UEPViewSet, RecordViewSet, LossViewSet

router = DefaultRouter()
router.register(r'users', CustomUserViewSet)
router.register(r'departments', DepartmentViewSet)
router.register(r'goals', GoalViewSet)
router.register(r'ueps', UEPViewSet)
router.register(r'records', RecordViewSet)
router.register(r'losses', LossViewSet)

app_name = 'track'

urlpatterns = [
    path('welcome/', WelcomeView.as_view(), name='welcome'),
    path('login/', CustomLoginView.as_view(), name='login'),
    path('register/', RegisterView.as_view(), name='register'),
    path('dashboard/', DashboardView.as_view(), name='dashboard'),
    path('department/<int:department_id>/', DepartmentDetailView.as_view(), name='department_detail'),
    path('logout/', LogoutView.as_view(next_page='/'), name='logout'),
    path('api/', include(router.urls)),
    path('', CustomLoginView.as_view(), name='login'),
]
