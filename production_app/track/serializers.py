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
        fields = ['id', 'RoP', 'saturation_manque', 'RoP_type', 'saturation_manque_type', 'RoP_comment', 'saturation_manque_comment', 'record']

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

        # Update existing losses or create new ones
        existing_loss_ids = [loss_data.get('id') for loss_data in losses_data if loss_data.get('id')]
        existing_losses = Loss.objects.filter(id__in=existing_loss_ids, record=instance)

        existing_loss_dict = {loss.id: loss for loss in existing_losses}

        for loss_data in losses_data:
            loss_id = loss_data.get('id')
            if loss_id:
                loss = existing_loss_dict.get(loss_id)
                if loss:
                    loss.RoP = loss_data.get('RoP', loss.RoP)
                    loss.saturation_manque = loss_data.get('saturation_manque', loss.saturation_manque)
                    loss.RoP_type = loss_data.get('RoP_type', loss.RoP_type)
                    loss.saturation_manque_type = loss_data.get('saturation_manque_type', loss.saturation_manque_type)
                    loss.RoP_comment = loss_data.get('RoP_comment', loss.RoP_comment)
                    loss.saturation_manque_comment = loss_data.get('saturation_manque_comment', loss.saturation_manque_comment)
                    loss.save()
            else:
                Loss.objects.create(record=instance, **loss_data)
        return instance
