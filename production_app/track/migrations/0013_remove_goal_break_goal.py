# Generated by Django 4.2.14 on 2024-08-10 13:34

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('track', '0012_goal_break_goal'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='goal',
            name='break_goal',
        ),
    ]
