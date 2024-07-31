from django.urls import path, include
from django.views.generic import TemplateView
from rest_framework.routers import DefaultRouter

from .views import (
    CustomLoginView, WelcomeView, RegisterView, InputView, DepartmentViewSet,
    UEPViewSet, RecordViewSet, LossViewSet, CustomUserViewSet, GoalViewSet,
    DepartementListCreateView, DeleteRecordView, DashboardView, department_records,
)

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
    path('departments/<int:pk>/', DepartementListCreateView.as_view(), name='department-detail'),
    path('dashboard/', DashboardView, name='dashboard'),
    path('delete-record/<int:record_id>/', DeleteRecordView.as_view(), name='delete_record'),
    path('api/records/<int:department_id>/<str:shift>/<str:hour>/', department_records, name='department_records'),
    path('records/shift-and-hour/', RecordViewSet.as_view({'get': 'by_shift_and_hour'}), name='records-by-shift-and-hour')
]
