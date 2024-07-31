from django.contrib.auth.models import AbstractUser
from django.db import models
from django.core.exceptions import ValidationError

# Department model
class Department(models.Model):
    name = models.CharField(max_length=100, verbose_name='Nom du département')

    def __str__(self):
        return self.name

# CustomUser model extending AbstractUser
class CustomUser(AbstractUser):
    full_name = models.CharField(max_length=255, blank=True, null=True)
    department = models.ForeignKey(
        Department,
        on_delete=models.SET_NULL,
        null=True,
        verbose_name='Département',
        related_name='users'
    )

    def save(self, *args, **kwargs):
        if not self.full_name and self.first_name and self.last_name:
            self.full_name = f"{self.first_name} {self.last_name}"
        super().save(*args, **kwargs)

    def __str__(self):
        return self.username

# Goal model
class Goal(models.Model):
    theoretical_goal = models.IntegerField(default=33, verbose_name='Objectif théorique')
    planned_goal = models.IntegerField(blank=True, null=True, verbose_name='Objectif planifié')

    def __str__(self):
        return f'Théorique: {self.theoretical_goal}, Planifié: {self.planned_goal if self.planned_goal is not None else "Aucun"}'

# UEP model
class UEP(models.Model):
    name = models.CharField(max_length=100, verbose_name='Nom de l\'UEP')
    department = models.ForeignKey(
        Department,
        on_delete=models.CASCADE,
        verbose_name='Département',
        related_name='ueps'
    )
    target = models.ForeignKey(
        Goal,
        on_delete=models.CASCADE,
        verbose_name='Objectif',
        related_name='ueps'
    )

    def __str__(self):
        return self.name

from django.db import models
from django.contrib.auth.models import User

class Record(models.Model):
    user = models.ForeignKey(CustomUser, on_delete=models.CASCADE)
    number_of_products = models.IntegerField()
    uep = models.ForeignKey('UEP', on_delete=models.CASCADE)
    shift = models.CharField(max_length=1, choices=[('A', 'Shift A'), ('B', 'Shift B'), ('N', 'Shift N')])
    hour = models.DateTimeField()

    def __str__(self):
        return f"Record for {self.uep} at {self.hour}"

class Loss(models.Model):
    record = models.ForeignKey(Record, related_name='losses', on_delete=models.CASCADE)
    logistic_loss = models.FloatField()
    production_loss = models.FloatField()
    logistic_comment = models.TextField(blank=True, null=True)
    production_comment = models.TextField(blank=True, null=True)

    def __str__(self):
        return f"Loss for record {self.record.id}"

# Metric model
class Metric(models.Model):
    department = models.ForeignKey(
        Department,
        on_delete=models.CASCADE,
        related_name='metrics'
    )
    metric_name = models.CharField(max_length=100)
    value = models.FloatField()
    date = models.DateField()

    class Meta:
        unique_together = ('department', 'metric_name', 'date')

    def __str__(self):
        return f"{self.metric_name} - {self.value}"
