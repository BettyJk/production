from datetime import date
from django.contrib.auth.mixins import LoginRequiredMixin
from django.shortcuts import render, redirect, get_object_or_404
from django.views.generic import TemplateView, View
from django.contrib.auth import authenticate, login
from django.contrib.auth.views import LoginView
from rest_framework import viewsets, serializers
from django.contrib.auth import get_user_model
from .models import CustomUser, Department, Goal, UEP, Record, Loss
from .serializers import CustomUserSerializer, DepartmentSerializer, GoalSerializer, UEPSerializer, RecordSerializer, LossSerializer

User = get_user_model()

class RegisterView(View):
    template_name = 'track/register.html'

    def get(self, request):
        return render(request, self.template_name)

    def post(self, request):
        username = request.POST.get('username')
        email = request.POST.get('email')
        first_name = request.POST.get('first_name')
        last_name = request.POST.get('last_name')
        password1 = request.POST.get('password1')
        password2 = request.POST.get('password2')

        if password1 != password2:
            return render(request, self.template_name, {'error_message': 'Passwords do not match'})

        if User.objects.filter(username=username).exists():
            return render(request, self.template_name, {'error_message': 'Username already exists'})

        if User.objects.filter(email=email).exists():
            return render(request, self.template_name, {'error_message': 'Email already exists'})

        user = User.objects.create_user(username=username, email=email, password=password1, first_name=first_name,
                                        last_name=last_name)

        if user is not None:
            login(request, user)
            return redirect('/welcome/')
        else:
            return render(request, self.template_name, {'error_message': 'Registration failed'})


class CustomLoginView(LoginView):
    template_name = 'registration/login.html'

    def get_success_url(self):
        return self.get_redirect_url() or '/welcome/'

class WelcomeView(LoginRequiredMixin, TemplateView):
    template_name = 'track/welcome.html'

    def get(self, request, *args, **kwargs):
        print(request.user.is_authenticated)
        return super().get(request, *args, **kwargs)

class DashboardView(LoginRequiredMixin, TemplateView):
    template_name = 'track/dashboard.html'

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context['departments'] = Department.objects.all()
        return context

class DepartmentDetailView(LoginRequiredMixin, TemplateView):
    template_name = 'track/department_detail.html'
    login_url = '/login/'

    def get_context_data(self, **kwargs):
        department_id = self.kwargs['department_id']
        department = get_object_or_404(Department, id=department_id)

        today = date.today()
        ueps = UEP.objects.filter(department=department)
        records = Record.objects.filter(uep__in=ueps, hour__date=today).order_by('hour')

        context = {
            'department': department,
            'ueps': ueps,
            'records': records
        }
        return context

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
