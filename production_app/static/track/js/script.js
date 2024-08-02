document.addEventListener('DOMContentLoaded', function() {
    const shiftHours = {
        A: ['06:00-07:00', '07:00-08:00', '08:00-09:00', '09:00-10:00', '10:00-11:00', '11:00-12:00', '12:00-13:00', '13:00-14:00'],
        B: ['14:00-15:00', '15:00-16:00', '16:00-17:00', '17:00-18:00', '18:00-19:00', '19:00-20:00', '20:00-21:00', '21:00-22:00'],
        N: ['22:00-23:00', '23:00-00:00', '00:00-01:00', '01:00-02:00', '02:00-03:00', '03:00-04:00', '04:00-05:00', '05:00-06:00']
    };

    const tableHeader = document.querySelector('#table-header');
    const uepIds = Array.from(tableHeader.querySelectorAll('th[data-uep-id]')).map(th => th.dataset.uepId);

    let selectedDate = null;
    let selectedShift = null;

    async function fetchAndDisplayData(shift, date) {
        if (!shift || !date) {
            console.warn('Shift or date is not selected.');
            return;
        }

        try {
            const response = await fetch(`/api/records/?shift=${shift}&date=${date}`);
            if (!response.ok) throw new Error(`Error fetching data: ${response.status}`);
            const data = await response.json();
            populateTable(shift, data);
        } catch (error) {
            console.error('Error fetching data:', error);
        }
    }

    function populateTable(shift, data) {
        const tableBody = document.getElementById('table-body');
        if (!tableBody) return;

        tableBody.innerHTML = '';

        shiftHours[shift].forEach(hourRange => {
            const row = document.createElement('tr');
            const hourCell = document.createElement('td');
            hourCell.textContent = hourRange;
            row.appendChild(hourCell);

            uepIds.forEach((uepId) => {
                const cell = document.createElement('td');
                const gridContainer = document.createElement('div');
                gridContainer.className = 'grid-container';

                const hourData = data.records ? data.records[hourRange] : [];
                const record = hourData.find(record => record.uep === parseInt(uepId, 10)) || {};
                const numberOfProducts = record.number_of_products || 0;
                const losses = record.losses || [];
                const logisticLoss = losses[0] ? losses[0].logistic_loss : 0;
                const productionLoss = losses[0] ? losses[0].production_loss : 0;
                const totalLoss = 33 - numberOfProducts;

                gridContainer.innerHTML = `
                    <div class="grid-item grid-item-number">${numberOfProducts}</div>
                    <div class="grid-item grid-item-loss">${totalLoss}</div>
                    <div class="grid-item grid-item-logistic-loss">${logisticLoss}</div>
                    <div class="grid-item grid-item-production-loss">${productionLoss}</div>
                `;

                const lossColor = (record && Object.keys(record).length > 0) ?
                    (totalLoss < 3 ? '#93c47d' : (totalLoss <= 10 ? '#f6b26b' : '#e06666')) : '#ffffff';
                gridContainer.style.backgroundColor = lossColor;

                gridContainer.addEventListener('click', () => {
                    $('#dataModal').modal('show');
                    document.getElementById('uepHiddenInput').value = uepId;
                    document.getElementById('shiftHiddenInput').value = selectedShift;
                    document.getElementById('hourHiddenInput').value = `${selectedDate} ${hourRange.split('-')[0]}`;
                    document.getElementById('recordIdHiddenInput').value = record.id || '';

                    document.querySelectorAll('.grid-container').forEach(container => {
                        container.querySelectorAll('.grid-item').forEach(item => item.style.pointerEvents = 'none');
                    });
                });

                cell.appendChild(gridContainer);
                row.appendChild(cell);
            });

            tableBody.appendChild(row);
        });
    }

    function getCookie(name) {
        const cookies = document.cookie.split(';');
        for (const cookie of cookies) {
            const [cookieName, cookieValue] = cookie.trim().split('=');
            if (cookieName === name) return decodeURIComponent(cookieValue);
        }
        return null;
    }

    async function saveRecordAndLosses(formData) {
        const recordData = {
            user: formData.get('user'),
            shift: formData.get('shift'),
            hour: `${selectedDate} ${formData.get('hour').split(' ')[1]}`,
            uep: parseInt(formData.get('uep'), 10),
            number_of_products: parseInt(formData.get('number_of_products'), 10) || 0
        };

        try {
            const recordsResponse = await fetch(`/api/records/?shift=${recordData.shift}&hour=${recordData.hour}`);
            const records = await recordsResponse.json();
            const existingRecord = records.find(record => record.uep === recordData.uep);

            let response;
            if (existingRecord) {
                response = await fetch(`/api/records/${existingRecord.id}/`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRFToken': getCookie('csrftoken')
                    },
                    body: JSON.stringify(recordData)
                });
            } else {
                response = await fetch('/api/records/', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRFToken': getCookie('csrftoken')
                    },
                    body: JSON.stringify(recordData)
                });
            }

            const savedRecord = await response.json();
            if (!savedRecord.id) throw new Error('Record ID is missing in the response.');

            const lossData = {
                record: savedRecord.id,
                logistic_loss: parseFloat(formData.get('logistic_loss')) || 0,
                production_loss: parseFloat(formData.get('production_loss')) || 0,
                logistic_comment: formData.get('logistic_comment'),
                production_comment: formData.get('production_comment')
            };

            const lossResponse = await fetch('/api/losses/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCookie('csrftoken')
                },
                body: JSON.stringify(lossData)
            });

            if (!lossResponse.ok) throw new Error(`Error creating/updating loss: ${await lossResponse.text()}`);

            $('#dataModal').modal('hide');
            fetchAndDisplayData(selectedShift, selectedDate);
        } catch (error) {
            console.error('Error saving data:', error);
        }
    }

    function setupFlatpickr() {
        const flatpickrElement = document.getElementById('flatpickr');
        if (flatpickrElement) {
            flatpickr(flatpickrElement, {
                onChange: function(selectedDates, dateStr) {
                    selectedDate = dateStr;
                    if (selectedShift) fetchAndDisplayData(selectedShift, selectedDate);
                }
            });
        }
    }

    function setupShiftButtons() {
        const shiftButtons = document.querySelectorAll('.btn-group .btn');
        shiftButtons.forEach(button => {
            button.addEventListener('click', function() {
                selectedShift = this.dataset.shift;
                if (selectedDate) fetchAndDisplayData(selectedShift, selectedDate);
            });
        });
    }

    function setupModal() {
        const modalCloseButton = document.querySelector('#dataModal .btn-close');
        if (modalCloseButton) {
            modalCloseButton.addEventListener('click', () => $('#dataModal').modal('hide'));
        }

        const modalDeleteButton = document.querySelector('#dataModal .btn-delete');
        if (modalDeleteButton) {
            modalDeleteButton.addEventListener('click', () => {
                const recordId = document.getElementById('recordIdHiddenInput').value;
                deleteRecord(recordId);
            });
        }
    }

    async function deleteRecord(recordId) {
        if (!recordId) {
            alert('No record ID provided.');
            return;
        }

        try {
            const response = await fetch(`/api/records/${recordId}/`, {
                method: 'DELETE',
                headers: {
                    'X-CSRFToken': getCookie('csrftoken')
                }
            });
            if (!response.ok) throw new Error(`Error deleting record: ${response.status}`);
            console.log('Record deleted successfully.');

            const lossesResponse = await fetch(`/api/losses/?record=${recordId}`, { method: 'GET' });
            const losses = await lossesResponse.json();
            const deletePromises = losses.map(loss =>
                fetch(`/api/losses/${loss.id}/`, {
                    method: 'DELETE',
                    headers: {
                        'X-CSRFToken': getCookie('csrftoken')
                    }
                })
            );
            await Promise.all(deletePromises);
            console.log('Associated losses deleted successfully.');

            $('#dataModal').modal('hide');
            fetchAndDisplayData(selectedShift, selectedDate);
        } catch (error) {
            console.error('Error deleting record and losses:', error);
        }
    }

    function setupFormSubmission() {
        const form = document.getElementById('dataForm');
        if (form) {
            form.addEventListener('submit', async function(event) {
                event.preventDefault();
                const formData = new FormData(form);
                await saveRecordAndLosses(formData);
            });
        }
    }

    function setDefaultDateAndShift() {
        const currentDate = new Date();
        const defaultDate = currentDate.toISOString().split('T')[0];
        selectedDate = defaultDate;

        const currentHour = currentDate.getHours();
        if (currentHour >= 6 && currentHour < 14) {
            selectedShift = 'A';
        } else if (currentHour >= 14 && currentHour < 22) {
            selectedShift = 'B';
        } else {
            selectedShift = 'N';
        }

        const flatpickrElement = document.getElementById('flatpickr');
        if (flatpickrElement) flatpickrElement._flatpickr.setDate(defaultDate);

        const shiftButton = document.querySelector(`.btn-group .btn[data-shift="${selectedShift}"]`);
        if (shiftButton) shiftButton.classList.add('active');

        fetchAndDisplayData(selectedShift, selectedDate);
    }

    setupFlatpickr();
    setupShiftButtons();
    setupModal();
    setupFormSubmission();
    setDefaultDateAndShift();
});
