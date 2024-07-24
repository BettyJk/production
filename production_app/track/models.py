from django.contrib.auth.models import AbstractUser
from django.db import models
from django.core.exceptions import ValidationError

class Department(models.Model):
    name = models.CharField(max_length=100, verbose_name='Nom du département')

    def __str__(self):
        return self.name

class CustomUser(AbstractUser):
    full_name = models.CharField(max_length=255, blank=True, null=True)
    department = models.ForeignKey(Department, on_delete=models.SET_NULL, null=True, verbose_name='Département')

    def save(self, *args, **kwargs):
        if not self.full_name and self.first_name and self.last_name:
            self.full_name = f"{self.first_name} {self.last_name}"
        super().save(*args, **kwargs)

    def __str__(self):
        return self.username

class Goal(models.Model):
    theoretical_goal = models.IntegerField(default=33, verbose_name='Objectif théorique')
    planned_goal = models.IntegerField(blank=True, null=True, verbose_name='Objectif planifié')

    def __str__(self):
        return f'Théorique: {self.theoretical_goal}, Planifié: {self.planned_goal if self.planned_goal is not None else "Aucun"}'

class UEP(models.Model):
    name = models.CharField(max_length=100, verbose_name='Nom de l\'UEP')
    department = models.ForeignKey(Department, on_delete=models.CASCADE, verbose_name='Département')
    target = models.ForeignKey(Goal, on_delete=models.CASCADE, verbose_name='Objectif')

    def __str__(self):
        return self.name

class Record(models.Model):
    SHIFTS = [
        ('A', 'Shift A'),
        ('B', 'Shift B'),
        ('N', 'Shift N'),
    ]

    user = models.ForeignKey(CustomUser, on_delete=models.CASCADE, verbose_name='Utilisateur')
    number_of_products = models.IntegerField(verbose_name='Nombre de produits')
    uep = models.ForeignKey(UEP, on_delete=models.CASCADE, verbose_name='UEP')
    shift = models.CharField(max_length=1, choices=SHIFTS, verbose_name='Shift')
    hour = models.DateTimeField(verbose_name='Heure')

    @property
    def time_range(self):
        if self.shift == 'A':
            return "6:00 - 14:00"
        elif self.shift == 'B':
            return "14:00 - 22:00"
        elif self.shift == 'N':
            return "22:00 - 6:00"
        else:
            return ""

    def __str__(self):
        return str(self.number_of_products)  # __str__ should return a string

class Loss(models.Model):
    record = models.ForeignKey(Record, on_delete=models.CASCADE, verbose_name='Enregistrement')
    logistic_loss = models.FloatField(default=0, help_text='Perte due à la logistique', verbose_name='Perte logistique')
    production_loss = models.FloatField(default=0, help_text='Perte due à la production', verbose_name='Perte de production')
    logistic_comment = models.TextField(blank=True, help_text='Raison de la perte logistique', verbose_name='Commentaire logistique')
    production_comment = models.TextField(blank=True, help_text='Raison de la perte de production', verbose_name='Commentaire de production')

    def clean(self):
        if self.logistic_loss > 0 and not self.logistic_comment:
            raise ValidationError('Un commentaire logistique doit être fourni en cas de perte logistique.')
        if self.production_loss > 0 and not self.production_comment:
            raise ValidationError('Un commentaire de production doit être fourni en cas de perte de production.')

        theoretical_goal = self.record.uep.target.theoretical_goal
        total_loss = self.logistic_loss + self.production_loss
        if total_loss != (theoretical_goal - self.record.number_of_products):
            raise ValidationError('La perte totale ne correspond pas à la différence entre l\'objectif théorique et les produits enregistrés.')

    def save(self, *args, **kwargs):
        self.clean()
        theoretical_goal = self.record.uep.target.theoretical_goal
        remaining_products = theoretical_goal - (self.logistic_loss + self.production_loss)
        self.record.number_of_products = remaining_products
        self.record.save()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Perte pour {self.record} (Logistique : {self.logistic_loss}, Production : {self.production_loss})"

class Metric(models.Model):
    department = models.ForeignKey(Department, on_delete=models.CASCADE)
    metric_name = models.CharField(max_length=100)
    value = models.FloatField()
    date = models.DateField()

    def __str__(self):
        return f"{self.metric_name} - {self.value}"
