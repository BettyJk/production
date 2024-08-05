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
        fields = ['id', 'logistic_loss', 'production_loss', 'logistic_comment', 'production_comment', 'record']

class RecordSerializer(serializers.ModelSerializer):
    losses = LossSerializer(many=True, required=False)

    class Meta:
        model = Record
        fields = ['id', 'user', 'shift', 'hour', 'uep', 'number_of_products', 'losses']

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

        for loss_data in losses_data:
            loss_id = loss_data.get('id')
            if loss_id:
                loss = Loss.objects.get(id=loss_id, record=instance)
                loss.logistic_loss = loss_data.get('logistic_loss', loss.logistic_loss)
                loss.production_loss = loss_data.get('production_loss', loss.production_loss)
                loss.logistic_comment = loss_data.get('logistic_comment', loss.logistic_comment)
                loss.production_comment = loss_data.get('production_comment', loss.production_comment)
                loss.save()
            else:
                Loss.objects.create(record=instance, **loss_data)
        return instance
