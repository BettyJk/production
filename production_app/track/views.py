from django.contrib import messages
from django.contrib.auth import get_user_model, authenticate, login
from django.contrib.auth.decorators import login_required
from django.contrib.auth.mixins import LoginRequiredMixin
from django.contrib.auth.views import LoginView
from django.db.models import Sum
from django.http import JsonResponse, Http404
from django.shortcuts import render, redirect, get_object_or_404
from django.urls import reverse
from django.utils import timezone
from django.views import View
from django.views.generic import TemplateView
from rest_framework import viewsets, status
from rest_framework.decorators import api_view, action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Department, UEP, Record, Loss, CustomUser, Goal
from .serializers import DepartmentSerializer, UEPSerializer, RecordSerializer, LossSerializer, CustomUserSerializer, \
    GoalSerializer

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


from django.utils.dateparse import parse_date
from django.utils.timezone import make_aware
from datetime import datetime, timedelta


class RecordViewSet(viewsets.ModelViewSet):
    queryset = Record.objects.all()
    serializer_class = RecordSerializer

    @action(detail=False, methods=['get'])
    def by_shift_and_date(self, request):
        shift = request.query_params.get('shift')
        date_str = request.query_params.get('date')  # Expecting 'YYYY-MM-DD'

        if shift and date_str:
            # Parse the date string into a datetime object
            date = parse_date(date_str)
            if not date:
                return Response({'error': 'Invalid date format'}, status=status.HTTP_400_BAD_REQUEST)

            # Create the date range for the day
            start_of_day = make_aware(datetime.combine(date, datetime.min.time()))
            end_of_day = start_of_day + timedelta(days=1)

            # Filter records by shift and date range (i.e., the entire day)
            records = self.queryset.filter(shift=shift, hour__range=(start_of_day, end_of_day))
            serializer = self.get_serializer(records, many=True)
            return Response(serializer.data)

        return Response({'error': 'Shift and date are required'}, status=status.HTTP_400_BAD_REQUEST)


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


import openpyxl
from django.http import HttpResponse
from django.utils import timezone
from datetime import datetime, timedelta
from .models import Record


def download_data(request, period):
    now = timezone.now()
    start_time = now.replace(hour=6, minute=0, second=0, microsecond=0)

    if period == 'day':
        start_time = start_time
    elif period == 'month':
        start_time = start_time.replace(day=1)
    elif period == 'year':
        start_time = start_time.replace(month=1, day=1)
    else:
        return HttpResponse("Invalid period", status=400)

    records = Record.objects.filter(hour__gte=start_time, hour__lte=now)

    # Create an in-memory Excel file
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Records"

    # Write headers
    headers = ['User', 'Number of Products', 'UEP', 'Shift', 'Hour', 'Logistic Loss', 'Production Loss']
    ws.append(headers)

    # Write data rows
    for record in records:
        row = [
            record.user.username,
            record.number_of_products,
            record.uep.name,
            record.shift,
            record.hour,
            record.loss_set.aggregate(logistic_loss_sum=Sum('logistic_loss'))['logistic_loss_sum'],
            record.loss_set.aggregate(production_loss_sum=Sum('production_loss'))['production_loss_sum']
        ]
        ws.append(row)

    # Create a response object
    response = HttpResponse(content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    response['Content-Disposition'] = f'attachment; filename="records_{period}.xlsx"'

    # Save the workbook to the response
    wb.save(response)

    return response
## views.py
from django.http import JsonResponse
from django.views.decorators.http import require_GET
from .models import Record, Loss

@require_GET
def get_cell_data(request):
    uep_id = request.GET.get('uep')
    date = request.GET.get('date')
    hour = request.GET.get('hour')

    try:
        record = Record.objects.get(uep=uep_id, date=date, hour=hour)
        try:
            loss = Loss.objects.get(record=record)
            data = {
                'number_of_products': record.number_of_products,
                'logistic_loss': loss.logistic_loss,
                'production_loss': loss.production_loss,
                'logistic_comment': loss.logistic_comment,
                'production_comment': loss.production_comment,
            }
        except Loss.DoesNotExist:
            data = {
                'number_of_products': record.number_of_products,
                'logistic_loss': '',
                'production_loss': '',
                'logistic_comment': '',
                'production_comment': '',
            }
    except Record.DoesNotExist:
        data = {
            'number_of_products': '',
            'logistic_loss': '',
            'production_loss': '',
            'logistic_comment': '',
            'production_comment': '',
        }

    return JsonResponse(data)


def download_data_api(request, period, department_id):
    now = timezone.now()

    # Determine start time based on period
    if period == 'day':
        start_time = now.replace(hour=6, minute=0, second=0, microsecond=0)
    elif period == 'month':
        start_time = now.replace(day=1, hour=6, minute=0, second=0, microsecond=0)
    elif period == 'year':
        start_time = now.replace(month=1, day=1, hour=6, minute=0, second=0, microsecond=0)
    else:
        return JsonResponse({"error": "Invalid period"}, status=400)

    end_time = now

    # Check if department exists
    department = get_object_or_404(Department, id=department_id)

    # Retrieve and aggregate records
    records = Record.objects.filter(
        uep__department=department,
        hour__gte=start_time,
        hour__lte=end_time
    ).select_related('user', 'uep')  # Optimize by fetching related data

    record_list = []
    for record in records:
        # Use the correct related name 'losses'
        logistic_loss_sum = record.losses.aggregate(Sum('logistic_loss'))['logistic_loss__sum']
        production_loss_sum = record.losses.aggregate(Sum('production_loss'))['production_loss__sum']

        record_list.append({
            "user": record.user.username,
            "number_of_products": record.number_of_products,
            "uep": record.uep.name,
            "shift": record.shift,
            "hour": record.hour.strftime('%Y-%m-%d %H:%M:%S'),
            "logistic_loss": logistic_loss_sum if logistic_loss_sum else 0,
            "production_loss": production_loss_sum if production_loss_sum else 0
        })

    return JsonResponse({"records": record_list})

from django.db.models import Sum
from rest_framework.response import Response
from rest_framework.decorators import api_view
from rest_framework import status
from .models import Department, UEP, Record

@api_view(['GET'])
def get_chart_data(request, department_id, shift, date, uep_id):
    try:
        # Retrieve the department
        department = Department.objects.get(id=department_id)

        # Retrieve the specific UEP
        uep = UEP.objects.get(id=uep_id, department=department)

        # Print debug information
        print(f"Department: {department}")
        print(f"UEP: {uep}")

        # Retrieve records for the specific UEP and date (regardless of shift)
        records = Record.objects.filter(
            uep=uep,
            hour__date=date
        )

        # Print debug information
        print(f"Records: {list(records)}")

        # Generate chart data and target line
        chart_data = []
        target_line = []
        for record in records:
            chart_data.append({
                'hour': record.hour.strftime('%H:%M'),  # Formatting for easier display
                'value': record.number_of_products
            })
            target_line.append(uep.target.theoretical_goal)  # Assuming UEP has a 'target' related to Goal

        # Calculate the total number of products for the specific UEP
        production = records.aggregate(total=Sum('number_of_products'))['total'] or 0

        # Print debug information
        print(f"Production calculated: {production}")

        # Retrieve the theoretical target for this UEP (assuming each UEP has a related Goal)
        theo_target = uep.target.theoretical_goal

        # Calculate empty hours (example logic)
        empty_hours = 24 - records.count()  # Assuming you have 24 hours in a day and each hour should have a record

        total_hours = 24  # Assuming a full day is 24 hours

        return Response({
            'chartData': chart_data,
            'targetLine': target_line,
            'production': production,
            'theoTarget': theo_target,
            'emptyHours': empty_hours,
            'totalHours': total_hours
        })

    except Department.DoesNotExist:
        return Response({"error": "Département non trouvé"}, status=status.HTTP_404_NOT_FOUND)
    except UEP.DoesNotExist:
        return Response({"error": "UEP non trouvé"}, status=status.HTTP_404_NOT_FOUND)
    except Goal.DoesNotExist:
        return Response({"error": "Objectif non trouvé"}, status=status.HTTP_404_NOT_FOUND)
