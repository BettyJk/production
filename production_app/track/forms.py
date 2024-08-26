from django import forms
from .models import Record, Loss, UEP

class RecordForm(forms.ModelForm):
    class Meta:
        model = Record
        fields = ['user', 'uep', 'shift', 'hour', 'number_of_products']

class LossForm(forms.ModelForm):
    class Meta:
        model = Loss
        fields = ['RoP', 'saturation_manque', 'RoP_type', 'saturation_manque_type', 'RoP_comment', 'saturation_manque_comment']

class InputForm(forms.Form):
    number_of_products = forms.IntegerField(label="Nombre de produits")

    def __init__(self, *args, **kwargs):
        department_id = kwargs.pop('department_id', None)
        super().__init__(*args, **kwargs)
        if department_id:
            ueps = UEP.objects.filter(department_id=department_id)
            for uep in ueps:
                self.fields[f'RoP_{uep.id}'] = forms.FloatField(required=False, label=f'Perte logistique pour {uep.name}')
                self.fields[f'saturation_manque_{uep.id}'] = forms.FloatField(required=False, label=f'Perte de production pour {uep.name}')
                self.fields[f'RoP_comment_{uep.id}'] = forms.CharField(required=False, widget=forms.Textarea(attrs={'rows': 2}), label=f'Commentaire logistique pour {uep.name}')
                self.fields[f'saturation_manque_comment_{uep.id}'] = forms.CharField(required=False, widget=forms.Textarea(attrs={'rows': 2}), label=f'Commentaire de production pour {uep.name}')
