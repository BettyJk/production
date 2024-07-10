from django.shortcuts import render
from django.views import View
from rest_framework import viewsets, serializers
from rest_framework.response import Response
from rest_framework import status
from .models import CustomUser, Department, Goal, UEP, Record, Loss
from .serializers import CustomUserSerializer, DepartmentSerializer, GoalSerializer, UEPSerializer, RecordSerializer, LossSerializer

# Class-based views for rendering HTML pages
class WelcomePageView(View):
    def get(self, request):
        departments = Department.objects.all()
        return render(request, 'track/welcome.html', {'departments': departments})

class DepartmentDetailView(View):
    def get(self, request, department_id):
        department = Department.objects.get(id=department_id)
        ueps = UEP.objects.filter(department=department)
        records = Record.objects.filter(uep__in=ueps).order_by('hour')

        # Calculate theoretical_goal_minus_3 for each uep
        for uep in ueps:
            uep.target.theoretical_goal_minus_3 = uep.target.theoretical_goal - 3

        return render(request, 'track/department_detail.html', {
            'department': department,
            'ueps': ueps,
            'records': records
        })

# Viewsets for REST API
class RecordViewSet(viewsets.ModelViewSet):
    queryset = Record.objects.all()
    serializer_class = RecordSerializer

    def perform_create(self, serializer):
        losses_data = self.request.data.get('losses', [])
        theoretical_goal = 33

        total_loss = sum(loss.get('logistic_loss', 0) + loss.get('production_loss', 0) for loss in losses_data)
        number_of_products = serializer.validated_data['number_of_products']

        if total_loss != (theoretical_goal - number_of_products):
            raise serializers.ValidationError("La perte totale ne correspond pas à la différence entre l'objectif théorique et les produits enregistrés.")

        for loss in losses_data:
            if loss.get('logistic_loss', 0) > 0 and not loss.get('logistic_comment'):
                raise serializers.ValidationError("Un commentaire logistique doit être fourni en cas de perte logistique.")
            if loss.get('production_loss', 0) > 0 and not loss.get('production_comment'):
                raise serializers.ValidationError("Un commentaire de production doit être fourni en cas de perte de production.")

        record = serializer.save()

        for loss in losses_data:
            Loss.objects.create(
                record=record,
                logistic_loss=loss.get('logistic_loss', 0),
                production_loss=loss.get('production_loss', 0),
                logistic_comment=loss.get('logistic_comment', ''),
                production_comment=loss.get('production_comment', '')
            )

class CustomUserViewSet(viewsets.ModelViewSet):
    queryset = CustomUser.objects.all()
    serializer_class = CustomUserSerializer

class DepartmentViewSet(viewsets.ModelViewSet):
    queryset = Department.objects.all()
    serializer_class = DepartmentSerializer

class GoalViewSet(viewsets.ModelViewSet):
    queryset = Goal.objects.all()
    serializer_class = GoalSerializer

class UEPViewSet(viewsets.ModelViewSet):
    queryset = UEP.objects.all()
    serializer_class = UEPSerializer

class LossViewSet(viewsets.ModelViewSet):
    queryset = Loss.objects.all()
    serializer_class = LossSerializer
