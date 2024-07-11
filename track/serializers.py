from rest_framework import serializers
from .models import CustomUser, Department, Goal, UEP, Record, Loss

class CustomUserSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomUser
        fields = '__all__'

class DepartmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Department
        fields = '__all__'

class GoalSerializer(serializers.ModelSerializer):
    class Meta:
        model = Goal
        fields = '__all__'

class UEPSerializer(serializers.ModelSerializer):
    class Meta:
        model = UEP
        fields = '__all__'

class LossSerializer(serializers.ModelSerializer):
    class Meta:
        model = Loss
        fields = '__all__'

class RecordSerializer(serializers.ModelSerializer):
    losses = LossSerializer(many=True, required=False)

    class Meta:
        model = Record
        fields = '__all__'

    def create(self, validated_data):
        losses_data = validated_data.pop('losses', [])
        record = Record.objects.create(**validated_data)
        for loss_data in losses_data:
            Loss.objects.create(record=record, **loss_data)
        return record
