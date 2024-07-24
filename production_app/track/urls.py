from django.urls import path, include
from django.views.generic import TemplateView
from rest_framework.routers import DefaultRouter

from . import views
from .views import CustomLoginView, WelcomeView, RegisterView, InputView, DepartmentViewSet, \
    UEPViewSet, RecordViewSet, LossViewSet, CustomUserViewSet, GoalViewSet, save_data, get_data, \
    DepartementListCreateView, DeleteRecordView

router = DefaultRouter()
router.register(r'users', CustomUserViewSet)
router.register(r'departments', DepartmentViewSet)
router.register(r'ueps', UEPViewSet)
router.register(r'records', RecordViewSet)
router.register(r'losses', LossViewSet)
router.register(r'goals', GoalViewSet)

app_name = 'track'

urlpatterns = [
    path('', CustomLoginView.as_view(), name='login'),
    path('login/', CustomLoginView.as_view(), name='login'),
    path('welcome/', WelcomeView.as_view(), name='welcome'),
    path('register/', RegisterView.as_view(), name='register'),
    path('input/<int:department_id>/', InputView.as_view(), name='input'),
    path('error/', TemplateView.as_view(template_name='track/error.html'), name='error'),
    path('api/', include(router.urls)),
    path('api/save-data/', save_data, name='save_data'),
    path('api/get-data/', get_data, name='get_data'),
    path('departements/<int:pk>/', DepartementListCreateView.as_view(), name='departement-detail'),
    path('dashboard/', views.DashboardView, name='dashboard'),
    path('delete-record/<int:record_id>/', DeleteRecordView.as_view(), name='delete_record'),

]
