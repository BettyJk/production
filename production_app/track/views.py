import json
from datetime import datetime
from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.contrib.auth.mixins import LoginRequiredMixin
from django.contrib.auth.views import LoginView
from django.http import JsonResponse, Http404
from django.shortcuts import render, redirect, get_object_or_404
from django.urls import reverse
from django.views import View
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST
from django.views.generic import TemplateView
from rest_framework import viewsets, status
from django.contrib.auth import get_user_model, authenticate, login
from rest_framework.decorators import api_view, action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.utils import timezone
from rest_framework.views import APIView

from . import serializers
from .models import Department, UEP, Record, Loss, CustomUser, Goal
from .serializers import DepartmentSerializer, UEPSerializer, RecordSerializer, LossSerializer, CustomUserSerializer, GoalSerializer

User = get_user_model()

class CustomLoginView(LoginView):
    template_name = 'registration/login.html'

    def get_success_url(self):
        return self.get_redirect_url() or '/welcome/'

class RegisterView(View):
    template_name = 'track/register.html'

    def get(self, request):
        return render(request, self.template_name)

    def post(self, request):
        error_message = None

        username = request.POST.get('username')
        full_name = request.POST.get('full_name')
        password1 = request.POST.get('password1')
        password2 = request.POST.get('password2')

        if User.objects.filter(username=username).exists():
            error_message = 'Le nom d\'utilisateur existe déjà. Veuillez choisir un autre nom d\'utilisateur.'
        else:
            if password1 != password2:
                error_message = 'Les mots de passe ne correspondent pas.'

            if full_name:
                names = full_name.split()
                first_name = names[0]
                last_name = ' '.join(names[1:]) if len(names) > 1 else ''
            else:
                first_name = ''
                last_name = ''

            if not error_message:
                try:
                    user = User.objects.create_user(username=username, password=password1, first_name=first_name, last_name=last_name, full_name=full_name)

                    user = authenticate(username=username, password=password1)
                    if user is not None:
                        login(request, user)
                        return redirect('track:welcome')
                except Exception as e:
                    error_message = f'Échec de la création de l\'utilisateur : {str(e)}'

        if error_message:
            messages.error(request, error_message)

        return render(request, self.template_name, {'error_message': error_message})

class WelcomeView(LoginRequiredMixin, TemplateView):
    template_name = 'track/welcome.html'

class DepartementListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk=None):
        user = request.user
        if pk is None:
            departements = Department.objects.all()
            serializer = DepartmentSerializer(departements, many=True)
            return Response(serializer.data)
        else:
            try:
                departement = Department.objects.get(pk=pk)
                if departement.id != user.department.id:
                    messages.error(request, "Vous n'avez pas la permission d'accéder à ce département.")
                    return redirect(reverse('track:dashboard'))
                serializer = DepartmentSerializer(departement)
                return Response(serializer.data)
            except Department.DoesNotExist:
                raise Http404

    def put(self, request, pk):
        try:
            departement = Department.objects.get(pk=pk)
            if departement.id != request.user.department.id:
                return Response({'detail': 'Vous n\'avez pas la permission de modifier ce département.'},
                                status=status.HTTP_403_FORBIDDEN)
        except Department.DoesNotExist:
            raise Http404

        serializer = DepartmentSerializer(departement, data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        try:
            departement = Department.objects.get(pk=pk)
            if departement.id != request.user.department.id:
                return Response({'detail': 'Vous n\'avez pas la permission de supprimer ce département.'},
                                status=status.HTTP_403_FORBIDDEN)
        except Department.DoesNotExist:
            raise Http404

        departement.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

@login_required
def DashboardView(request):
    if request.user.is_superuser:
        departements = Department.objects.all()
    else:
        departements = Department.objects.filter(id=request.user.department.id)
    return render(request, 'track/dashboard.html', {'departements': departements})
class InputView(LoginRequiredMixin, View):
    template_name = 'track/input.html'

    def get(self, request, *args, **kwargs):
        department_id = kwargs.get('department_id')
        department = get_object_or_404(Department, id=department_id)
        ueps = UEP.objects.filter(department=department)
        hours = range(24)  # Representing hours in a day

        records = Record.objects.filter(user=request.user, uep__in=ueps)
        losses = Loss.objects.filter(record__in=records)

        records_dict = {}
        for record in records:
            if record.hour not in records_dict:
                records_dict[record.hour] = {}
            records_dict[record.hour][record.uep.id] = {
                'number_of_products': record.number_of_products,
                'logistic_loss': 0,
                'production_loss': 0,
                'logistic_comment': '',
                'production_comment': ''
            }

        for loss in losses:
            record = loss.record
            records_dict[record.hour][record.uep.id].update({
                'logistic_loss': loss.logistic_loss,
                'production_loss': loss.production_loss,
                'logistic_comment': loss.logistic_comment,
                'production_comment': loss.production_comment
            })

        context = {
            'department': department,
            'ueps': ueps,
            'hours': hours,
            'records_dict': records_dict
        }

        return render(request, self.template_name, context)

    def post(self, request, *args, **kwargs):
        department_id = kwargs.get('department_id')
        department = get_object_or_404(Department, id=department_id)
        ueps = UEP.objects.filter(department=department)

        for hour in range(24):
            for uep in ueps:
                shift = request.POST.get(f'shift_{uep.id}_{hour}')  # Get shift value from form
                number_of_products = request.POST.get(f'number_of_products_{uep.id}_{hour}')
                logistic_loss = request.POST.get(f'logistic_loss_{uep.id}_{hour}')
                production_loss = request.POST.get(f'production_loss_{uep.id}_{hour}')
                logistic_comment = request.POST.get(f'logistic_comment_{uep.id}_{hour}')
                production_comment = request.POST.get(f'production_comment_{uep.id}_{hour}')

                if number_of_products:
                    record, created = Record.objects.update_or_create(
                        user=request.user,
                        uep=uep,
                        shift=shift,
                        hour=hour,
                        defaults={'number_of_products': number_of_products}
                    )

                    if logistic_loss or production_loss or logistic_comment or production_comment:
                        Loss.objects.update_or_create(
                            record=record,
                            defaults={
                                'logistic_loss': logistic_loss,
                                'production_loss': production_loss,
                                'logistic_comment': logistic_comment,
                                'production_comment': production_comment
                            }
                        )

        return redirect(reverse('track:input', kwargs={'department_id': department_id}))

class RecordViewSet(viewsets.ModelViewSet):
    queryset = Record.objects.all()
    serializer_class = RecordSerializer

    @action(detail=False, methods=['get'])
    def by_shift_and_hour(self, request):
        shift = request.query_params.get('shift')
        hour = request.query_params.get('hour')
        if shift and hour:
            records = self.queryset.filter(shift=shift, hour=hour)
            serializer = self.get_serializer(records, many=True)
            return Response(serializer.data)
        return Response({'error': 'Shift and hour are required'}, status=status.HTTP_400_BAD_REQUEST)

class LossViewSet(viewsets.ModelViewSet):
    queryset = Loss.objects.all()
    serializer_class = LossSerializer

    @action(detail=False, methods=['get'])
    def by_record(self, request):
        record_id = request.query_params.get('record')
        if record_id:
            losses = self.queryset.filter(record__id=record_id)
            serializer = self.get_serializer(losses, many=True)
            return Response(serializer.data)
        return Response({'error': 'Record ID is required'}, status=status.HTTP_400_BAD_REQUEST)


class GoalViewSet(viewsets.ModelViewSet):
    queryset = Goal.objects.all()
    serializer_class = GoalSerializer

class UEPListView(LoginRequiredMixin, View):
    template_name = 'track/ueps.html'

    def get(self, request, *args, **kwargs):
        department_id = kwargs.get('department_id')
        department = get_object_or_404(Department, id=department_id)
        ueps = UEP.objects.filter(department=department)
        return render(request, self.template_name, {'department': department, 'ueps': ueps})

class DepartmentViewSet(viewsets.ModelViewSet):
    queryset = Department.objects.all()
    serializer_class = DepartmentSerializer

class UEPViewSet(viewsets.ModelViewSet):
    queryset = UEP.objects.all()
    serializer_class = UEPSerializer


class GoalViewSet(viewsets.ModelViewSet):
    queryset = Goal.objects.all()
    serializer_class = GoalSerializer

class UEPListView(LoginRequiredMixin, View):
    template_name = 'track/ueps.html'

    def get(self, request, *args, **kwargs):
        department_id = kwargs.get('department_id')
        department = get_object_or_404(Department, id=department_id)
        ueps = UEP.objects.filter(department=department)
        return render(request, self.template_name, {'department': department, 'ueps': ueps})

@api_view(['GET'])
def department_records(request, department_id, shift, date):
    try:
        department = Department.objects.get(id=department_id)
        records = Record.objects.filter(uep__department=department, shift=shift, hour=date)  # Fixed date to hour
        serializer = RecordSerializer(records, many=True)
        return Response(serializer.data)
    except Department.DoesNotExist:
        return Response({"error": "Département non trouvé"}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class CustomUserViewSet(viewsets.ModelViewSet):
    queryset = CustomUser.objects.all()
    serializer_class = CustomUserSerializer

class DeleteRecordView(View):
    def post(self, request, record_id):
        try:
            record = get_object_or_404(Record, id=record_id)
            record.delete()
            return JsonResponse({'status': 'success'})
        except Record.DoesNotExist:
            return JsonResponse({'status': 'error', 'message': 'Enregistrement non trouvé'}, status=404)
@api_view(['GET'])
def get_statistics(request, department_id, interval='day'):
    department = get_object_or_404(Department, id=department_id)
    current_date = timezone.now().date()
    if interval == 'day':
        start_date = current_date
    elif interval == 'month':
        start_date = current_date.replace(day=1)
    elif interval == 'year':
        start_date = current_date.replace(month=1, day=1)
    else:
        return Response({"error": "Invalid interval specified."}, status=status.HTTP_400_BAD_REQUEST)

    end_date = current_date

    records = Record.objects.filter(uep__department=department, hour__date__range=[start_date, end_date])
    statistics = {}
    for record in records:
        uep = record.uep
        if uep not in statistics:
            statistics[uep.name] = 0
        statistics[uep.name] += record.number_of_products

    return Response(statistics)
def create_record(request):
    serializer = RecordSerializer(data=request.data)
    if serializer.is_valid():
        record = serializer.save()
        return Response({'id': record.id, **serializer.data}, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
