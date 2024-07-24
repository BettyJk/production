from django import forms
from .models import Metric, Record, UEP

class MetricForm(forms.ModelForm):
    class Meta:
        model = Metric
        fields = ['metric_name', 'value', 'date']
# forms.py
from django import forms
from .models import Record, Loss

class RecordForm(forms.ModelForm):
    class Meta:
        model = Record
        fields = ['user', 'uep', 'shift', 'hour', 'number_of_products']

class LossForm(forms.ModelForm):
    class Meta:
        model = Loss
        fields = ['logistic_loss', 'production_loss', 'logistic_comment', 'production_comment']


class InputForm(forms.Form):
    number_of_products = forms.IntegerField(label="Nombre de produits")

    def __init__(self, *args, **kwargs):
        department_id = kwargs.pop('department_id', None)
        super().__init__(*args, **kwargs)
        if department_id:
            uep = UEP.objects.filter(department_id=department_id)
            for uep in uep:
                self.fields[f'logistic_loss_{uep.id}'] = forms.FloatField(required=False, label=f'Perte logistique pour {uep.name}')
                self.fields[f'production_loss_{uep.id}'] = forms.FloatField(required=False, label=f'Perte de production pour {uep.name}')
                self.fields[f'logistic_comment_{uep.id}'] = forms.CharField(required=False, widget=forms.Textarea(attrs={'rows': 2}), label=f'Commentaire logistique pour {uep.name}')
                self.fields[f'production_comment_{uep.id}'] = forms.CharField(required=False, widget=forms.Textarea(attrs={'rows': 2}), label=f'Commentaire de production pour {uep.name}')
