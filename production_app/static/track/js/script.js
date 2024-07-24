document.addEventListener('DOMContentLoaded', function() {
    const shiftHours = {
        shiftA: ['06:00-07:00', '07:00-08:00', '08:00-09:00', '09:00-10:00', '10:00-11:00', '11:00-12:00', '12:00-13:00', '13:00-14:00'],
        shiftB: ['14:00-15:00', '15:00-16:00', '16:00-17:00', '17:00-18:00', '18:00-19:00', '19:00-20:00', '20:00-21:00', '21:00-22:00'],
        shiftN: ['22:00-23:00', '23:00-00:00', '00:00-01:00', '01:00-02:00', '02:00-03:00', '03:00-04:00', '04:00-05:00', '05:00-06:00']
    };

    let selectedDate = null;

    function fetchAndDisplayData() {
        fetch('/api/get-data/', {
            method: 'GET'
        })
        .then(response => response.json())
        .then(data => {
            data.forEach(entry => {
                const { uep_id, shift, hour, number_of_products, logistic_loss, production_loss } = entry;
                const zoneElement = document.querySelector(`.zone[data-uep="${uep_id}"][data-hour="${hour}"]`);
                if (zoneElement) {
                    const theoreticalGoal = 33;
                    const loss = theoreticalGoal - number_of_products;

                    zoneElement.querySelector('.record').textContent = number_of_products;
                    zoneElement.querySelector('.loss').textContent = loss;
                    zoneElement.querySelector('.logistic-loss').textContent = logistic_loss;
                    zoneElement.querySelector('.production-loss').textContent = production_loss;
                }
            });
        })
        .catch(error => console.error('Error fetching data:', error));
    }

    function generateTimetableRows(tbodyId, shift) {
        const tbody = document.getElementById(tbodyId);
        if (!tbody) return;
        tbody.innerHTML = '';

        const rowTemplate = document.getElementById('row-template');
        if (!rowTemplate) return;
        const hours = shiftHours[shift];

        hours.forEach(hour => {
            const newRow = rowTemplate.content.cloneNode(true);
            newRow.querySelector('.hour').textContent = hour;
            newRow.querySelectorAll('.zone').forEach(zone => {
                if (selectedDate) {
                    const [startHour] = hour.split('-');
                    const fullDateTime = `${selectedDate} ${startHour}:00`;
                    zone.dataset.hour = fullDateTime;
                } else {
                    zone.dataset.hour = hour;
                }
                zone.dataset.shift = shift;
            });
            tbody.appendChild(newRow);
        });

        fetchAndDisplayData(); // Fetch data for the newly generated rows
    }

    const flatpickrInput = document.getElementById('flatpickr');
    if (flatpickrInput) {
        flatpickr(flatpickrInput, {
            dateFormat: 'Y-m-d',
            onChange: function(selectedDates, dateStr) {
                selectedDate = dateStr;
                fetchAndDisplayData();
            }
        });
    }

    document.getElementById('button1').addEventListener('click', function() {
        document.getElementById('shiftA-timetable').style.display = 'table-row-group';
        document.getElementById('shiftB-timetable').style.display = 'none';
        document.getElementById('shiftN-timetable').style.display = 'none';
        generateTimetableRows('shiftA-timetable', 'shiftA');
    });

    document.getElementById('button2').addEventListener('click', function() {
        document.getElementById('shiftA-timetable').style.display = 'none';
        document.getElementById('shiftB-timetable').style.display = 'table-row-group';
        document.getElementById('shiftN-timetable').style.display = 'none';
        generateTimetableRows('shiftB-timetable', 'shiftB');
    });

    document.getElementById('button3').addEventListener('click', function() {
        document.getElementById('shiftA-timetable').style.display = 'none';
        document.getElementById('shiftB-timetable').style.display = 'none';
        document.getElementById('shiftN-timetable').style.display = 'table-row-group';
        generateTimetableRows('shiftN-timetable', 'shiftN');
    });

    document.addEventListener('click', function(event) {
        if (event.target.classList.contains('enter-data')) {
            const zoneElement = event.target.closest('.zone');
            if (zoneElement) {
                const uep = zoneElement.dataset.uep;
                const hour = zoneElement.dataset.hour;
                const shift = zoneElement.dataset.shift;

                const uepHiddenInput = document.getElementById('uepHiddenInput');
                const shiftHiddenInput = document.getElementById('shiftHiddenInput');
                const hourHiddenInput = document.getElementById('hourHiddenInput');

                if (uepHiddenInput && shiftHiddenInput && hourHiddenInput) {
                    uepHiddenInput.value = uep;
                    shiftHiddenInput.value = shift;
                    hourHiddenInput.value = hour;
                } else {
                    console.error('One or more hidden input elements not found');
                }

                console.log(`Selected: UEP=${uep}, Shift=${shift}, Hour=${hour}`);
            }
        }
    });

    document.getElementById('zoneForm').addEventListener('submit', function(event) {
        event.preventDefault();
        const formData = new FormData(this);
        const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]').value;

        const data = {
            uep_id: formData.get('uep_id'),
            shift: formData.get('shift'),
            hour: formData.get('hour'),
            number_of_products: formData.get('number_of_products'),
            logistic_loss: formData.get('logistic_loss') || 0,
            logistic_comment: formData.get('logistic_comment') || '',
            production_loss: formData.get('production_loss') || 0,
            production_comment: formData.get('production_comment') || ''
        };

        fetch('/api/save-data/', {
            method: 'POST',
            body: JSON.stringify(data),
            headers: {
                'X-CSRFToken': csrfToken,
                'Content-Type': 'application/json'
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                const uep = formData.get('uep_id');
                const hour = formData.get('hour');
                const record = parseInt(formData.get('number_of_products'), 10);
                const logisticLoss = parseInt(formData.get('logistic_loss'), 10);
                const logisticComment = formData.get('logistic_comment');
                const productionLoss = parseInt(formData.get('production_loss'), 10);
                const productionComment = formData.get('production_comment');

                const theoreticalGoal = 33;
                const loss = theoreticalGoal - record;

                const zoneElement = document.querySelector(`.zone[data-uep="${uep}"][data-hour="${hour}"]`);
                if (zoneElement) {
                    zoneElement.querySelector('.record').textContent = record;
                    zoneElement.querySelector('.loss').textContent = loss;
                    zoneElement.querySelector('.logistic-loss').textContent = logisticLoss;
                    zoneElement.querySelector('.logistic-comment').textContent = logisticComment;
                    zoneElement.querySelector('.production-loss').textContent = productionLoss;
                    zoneElement.querySelector('.production-comment').textContent = productionComment;
                }

                const modal = bootstrap.Modal.getInstance(document.getElementById('dataModal'));
                modal.hide();
            } else {
                console.error('Failed to save data:', data.error);
            }
        })
        .catch(error => console.error('Error:', error));
    });

    fetchAndDisplayData(); // Initial call to fetch and display data
});
