from django.contrib import admin
from .models import CustomUser, Department, Goal, UEP, Record, Loss

@admin.register(CustomUser)
class CustomUserAdmin(admin.ModelAdmin):
    list_display = ('username',)

@admin.register(Department)
class DepartmentAdmin(admin.ModelAdmin):
    list_display = ('name',)

@admin.register(Goal)
class GoalAdmin(admin.ModelAdmin):
    list_display = ('theoretical_goal', 'planned_goal')

@admin.register(UEP)
class UEPAdmin(admin.ModelAdmin):
    list_display = ('name', 'department', 'target')

@admin.register(Record)
class RecordAdmin(admin.ModelAdmin):
    list_display = ('user', 'number_of_products', 'uep', 'shift', 'hour')
    list_filter = ('user', 'uep', 'shift')
    search_fields = ('user__username', 'uep__name', 'shift')

@admin.register(Loss)
class LossAdmin(admin.ModelAdmin):
    list_display = ('record', 'logistic_loss', 'production_loss', 'logistic_comment', 'production_comment')
    list_filter = ('record',)
    search_fields = ('record__number_of_products',)
