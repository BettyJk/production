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

from rest_framework import serializers
from .models import Record, Loss

class LossSerializer(serializers.ModelSerializer):
    class Meta:
        model = Loss
        fields = ['logistic_loss', 'production_loss', 'logistic_comment', 'production_comment']

class RecordSerializer(serializers.ModelSerializer):
    losses = LossSerializer(many=True, required=False)

    class Meta:
        model = Record
        fields = ['user', 'number_of_products', 'uep', 'shift', 'hour', 'losses']

    def create(self, validated_data):
        losses_data = validated_data.pop('losses', [])
        record = Record.objects.create(**validated_data)
        for loss_data in losses_data:
            Loss.objects.create(record=record, **loss_data)
        return record

    def update(self, instance, validated_data):
        losses_data = validated_data.pop('losses', [])
        instance.number_of_products = validated_data.get('number_of_products', instance.number_of_products)
        instance.uep = validated_data.get('uep', instance.uep)
        instance.shift = validated_data.get('shift', instance.shift)
        instance.hour = validated_data.get('hour', instance.hour)
        instance.save()

        # Handle losses
        for loss_data in losses_data:
            loss_id = loss_data.get('id')
            if loss_id:
                loss = Loss.objects.get(id=loss_id, record=instance)
                for attr, value in loss_data.items():
                    setattr(loss, attr, value)
                loss.save()
            else:
                Loss.objects.create(record=instance, **loss_data)
        return instance

