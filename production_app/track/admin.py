from django.contrib import admin
from .models import Department, CustomUser, Goal, UEP, Record, Loss, Metric

@admin.register(Department)
class DepartmentAdmin(admin.ModelAdmin):
    list_display = ('name',)
    search_fields = ('name',)

@admin.register(CustomUser)
class CustomUserAdmin(admin.ModelAdmin):
    list_display = ('username', 'full_name', 'department')
    search_fields = ('username', 'full_name', 'department__name')

@admin.register(Goal)
class GoalAdmin(admin.ModelAdmin):
    list_display = ('theoretical_goal', 'planned_goal')
    search_fields = ('theoretical_goal', 'planned_goal')

@admin.register(UEP)
class UEPAdmin(admin.ModelAdmin):
    list_display = ('name', 'department', 'target')
    search_fields = ('name', 'department__name', 'target__theoretical_goal')

@admin.register(Record)
class RecordAdmin(admin.ModelAdmin):
    list_display = ('user', 'number_of_products', 'uep', 'shift', 'hour')
    list_filter = ('shift',)
    search_fields = ('user__username', 'uep__name', 'shift', 'hour')

@admin.register(Loss)
class LossAdmin(admin.ModelAdmin):
    list_display = ('record', 'logistic_loss', 'production_loss', 'logistic_comment', 'production_comment')
    search_fields = ('record__number_of_products', 'logistic_loss', 'production_loss', 'logistic_comment', 'production_comment')

@admin.register(Metric)
class MetricAdmin(admin.ModelAdmin):
    list_display = ('department', 'metric_name', 'value', 'date')
    search_fields = ('department__name', 'metric_name', 'value', 'date')
