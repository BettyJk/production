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
        console.log(`Fetching data for shift: ${shift}, date: ${date}`);
        const response = await fetch(`/api/records/?shift=${shift}&date=${date}`);
        if (!response.ok) throw new Error(`Error fetching data: ${response.status}`);
        const data = await response.json();
        console.log('Fetched data:', data);
        populateTable(shift, date, data);
    } catch (error) {
        console.error('Error fetching data:', error);
    }
}

function populateTable(shift, date, data) {
    const tableBody = document.getElementById('table-body');
    if (!tableBody) {
        console.error('Table body not found!');
        return;
    }

    console.log('Populating table with data:', data);

    // Clear the table body
    tableBody.innerHTML = '';

    // Group records by hour for easy access
    const recordsByHour = {};
    data.forEach(record => {
        const hour = record.hour.split('T')[1].slice(0, 5); // Extract the hour in HH:MM format
        if (!recordsByHour[hour]) {
            recordsByHour[hour] = [];
        }
        recordsByHour[hour].push(record);
    });

    console.log('Grouped records by hour:', recordsByHour);

    shiftHours[shift].forEach(hourRange => {
        const row = document.createElement('tr');
        const hourCell = document.createElement('td');
        hourCell.textContent = hourRange;
        row.appendChild(hourCell);

        uepIds.forEach((uepId) => {
            const cell = document.createElement('td');
            const gridContainer = document.createElement('div');
            gridContainer.className = 'grid-container';

            const cellId = `${date}-${shift}-${uepId}-${hourRange.replace(':', '')}`;
            gridContainer.dataset.cellId = cellId;

            const hourData = recordsByHour[hourRange] || [];
            const record = hourData.find(record => record.uep === parseInt(uepId, 10)) || {};
            const numberOfProducts = record.number_of_products || 0;
            const losses = record.losses || [];
            const logisticLoss = losses.length > 0 ? losses[0].logistic_loss : 0;
            const productionLoss = losses.length > 0 ? losses[0].production_loss : 0;
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

            gridContainer.addEventListener('click', () => openModal(record, uepId, hourRange, cellId));

            cell.appendChild(gridContainer);
            row.appendChild(cell);
        });

        tableBody.appendChild(row);
    });

    console.log('Table populated successfully.');
}
    function openModal(record, uepId, hourRange, cellId) {
        $('#dataModal').modal('show');
        const recordJson = {
            uep: uepId,
            date: selectedDate,
            hour: hourRange,
            cellId: cellId
        };
        document.getElementById('jsonDisplay').textContent = JSON.stringify(recordJson, null, 2);

        document.getElementById('uepHiddenInput').value = uepId;
        document.getElementById('shiftHiddenInput').value = selectedShift;
        document.getElementById('hourHiddenInput').value = `${selectedDate} ${hourRange.split('-')[0]}`;
        document.getElementById('recordIdHiddenInput').value = record.id || '';

        document.querySelectorAll('.grid-container').forEach(container => {
            container.querySelectorAll('.grid-item').forEach(item => item.style.pointerEvents = 'none');
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
        const uep = formData.get('uep');
        const shift = formData.get('shift');
        const hour = formData.get('hour');
        const number_of_products = parseInt(formData.get('number_of_products'), 10) || 0;
        const logistic_loss = parseFloat(formData.get('logistic_loss')) || 0;
        const production_loss = parseFloat(formData.get('production_loss')) || 0;
        const logistic_comment = formData.get('logistic_comment');
        const production_comment = formData.get('production_comment');
        const user = formData.get('user');
        const cellId = formData.get('cellId');
        const existingRecordId = formData.get('recordIdHiddenInput');

        // Check if the record ID already exists
        if (existingRecordId) {
            alert('Record already exists. Edit the record if you want to make changes.');
            return;
        }

        // Create or update record
        const recordData = {
            user,
            shift,
            hour,
            uep: parseInt(uep, 10),
            number_of_products
        };

        try {
            const response = await fetch('/api/records/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCookie('csrftoken')
                },
                body: JSON.stringify(recordData)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`Error creating/updating record: ${errorData.detail || 'Unknown error'}`);
            }

            const recordDataResponse = await response.json();
            console.log('Record saved successfully:', recordDataResponse);

            // Check if record ID is present
            if (!recordDataResponse.id) {
                throw new Error('Record ID is missing in the response.');
            }

            // Create or update loss
            const lossData = {
                record: recordDataResponse.id,
                logistic_loss,
                production_loss,
                logistic_comment,
                production_comment
            };

            const lossResponse = await fetch('/api/losses/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCookie('csrftoken')
                },
                body: JSON.stringify(lossData)
            });

            if (!lossResponse.ok) {
                const lossErrorData = await lossResponse.text();
                console.error('Error response:', lossErrorData);
                throw new Error(`Error creating/updating loss: ${lossErrorData}`);
            }

            const lossDataResponse = await lossResponse.json();
            console.log('Loss saved successfully:', lossDataResponse);

        } catch (error) {
            console.error('Error saving data:', error);
            alert(`Error saving data: ${error.message || 'Unknown error'}`);
        }
    }

    const dataForm = document.getElementById('dataForm');
    if (dataForm) {
        dataForm.addEventListener('submit', function(event) {
            event.preventDefault();
            const formData = new FormData(this);
            saveRecordAndLosses(formData)
                .catch(error => {
                    console.error('Error saving data:', error);
                    alert(`Error saving data: ${error.message || 'Unknown error'}`);
                });
            $('#dataModal').modal('hide');
        });
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
                fetchAndDisplayData(selectedShift, selectedDate);
            });
        });
    }

    function setupModal() {
        const closeModalBtn = document.getElementById('closeModal');
        const deleteRecordBtn = document.getElementById('deleteRecord');
        const deleteConfirmBtn = document.getElementById('confirmDelete');

        if (closeModalBtn) {
            closeModalBtn.addEventListener('click', function() {
                $('#dataModal').modal('hide');
            });
        }

        if (deleteRecordBtn) {
            deleteRecordBtn.addEventListener('click', function() {
                const recordId = document.getElementById('recordIdHiddenInput').value;
                if (recordId) {
                    deleteRecord(recordId);
                } else {
                    alert('No record ID found for deletion.');
                }
                $('#dataModal').modal('hide');
            });
        }
    }

    async function deleteRecord(recordId) {
        try {
            const response = await fetch(`/api/records/${recordId}/`, {
                method: 'DELETE',
                headers: {
                    'X-CSRFToken': getCookie('csrftoken')
                }
            });

            if (!response.ok) throw new Error(`Error deleting record: ${response.status}`);
            console.log(`Record with ID ${recordId} deleted successfully`);
            fetchAndDisplayData(selectedShift, selectedDate);
        } catch (error) {
            console.error('Error deleting record:', error);
        }
    }



    function setDefaultDateAndShift() {
        const now = new Date();
        const currentHour = now.getHours();
        selectedDate = now.toISOString().split('T')[0];

        if (currentHour >= 6 && currentHour < 14) {
            selectedShift = 'A';
        } else if (currentHour >= 14 && currentHour < 22) {
            selectedShift = 'B';
        } else {
            selectedShift = 'N';
        }

        const flatpickrElement = document.getElementById('flatpickr');
        if (flatpickrElement) flatpickrElement.value = selectedDate;

        fetchAndDisplayData(selectedShift, selectedDate);
    }

    setupFlatpickr();
    setupShiftButtons();
    setupModal();
    setDefaultDateAndShift();
});
