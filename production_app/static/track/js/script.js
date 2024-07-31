document.addEventListener('DOMContentLoaded', function() {
    const shiftHours = {
        A: ['06:00-07:00', '07:00-08:00', '08:00-09:00', '09:00-10:00', '10:00-11:00', '11:00-12:00', '12:00-13:00', '13:00-14:00'],
        B: ['14:00-15:00', '15:00-16:00', '16:00-17:00', '17:00-18:00', '18:00-19:00', '19:00-20:00', '20:00-21:00', '21:00-22:00'],
        N: ['22:00-23:00', '23:00-00:00', '00:00-01:00', '01:00-02:00', '02:00-03:00', '03:00-04:00', '04:00-05:00', '05:00-06:00']
    };

    const tableHeader = document.querySelector('#table-header');
    const uepIds = [];
    tableHeader.querySelectorAll('th').forEach((th, index) => {
        if (index > 0) {  // Skip the first column (hours)
            uepIds.push(th.dataset.uepId);  // Ensure UEP id is stored in data-uep-id attribute
        }
    });

    let selectedDate = null;
    let selectedShift = null;
    let selectedUepIndex = null;

    function fetchAndDisplayData(shift, hour) {
        if (!shift || !hour) {
            console.warn('Shift or hour is not selected.');
            return;
        }

        console.log(`Fetching data for shift: ${shift}, hour: ${hour}`);
        fetch(`/api/records/?shift=${shift}&hour=${hour}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Error fetching data: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                console.log('Data fetched:', data);
                populateTable(shift, data);
            })
            .catch(error => {
                console.error('Error fetching data:', error);
                alert(`Error fetching data: ${error.message || 'Unknown error'}`);
            });
    }

    function fetchAndDisplayLosses(shift, hour) {
        if (!shift || !hour) {
            console.warn('Shift or hour is not selected.');
            return;
        }

        console.log(`Fetching losses for shift: ${shift}, hour: ${hour}`);
        fetch(`/api/losses/?shift=${shift}&hour=${hour}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Error fetching losses: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                console.log('Losses data fetched:', data);
                // Handle the fetched data as needed, e.g., update the UI
            })
            .catch(error => {
                console.error('Error fetching losses:', error);
                alert(`Error fetching losses: ${error.message || 'Unknown error'}`);
            });
    }

    function populateTable(shift, data) {
        console.log('Populating table with data:', data);
        const tableBody = document.getElementById('table-body');
        if (!tableBody) return;

        tableBody.innerHTML = '';

        shiftHours[shift].forEach(hourRange => {
            const row = document.createElement('tr');
            const hourCell = document.createElement('td');
            hourCell.textContent = hourRange;
            row.appendChild(hourCell);

            for (let i = 0; i < uepIds.length; i++) {
                const cell = document.createElement('td');
                const gridContainer = document.createElement('div');
                gridContainer.className = 'grid-container';

                const hourData = data.records ? data.records[hourRange] : [];
                const record = hourData[i] || {};
                const numberOfProducts = record.number_of_products || 0;
                const losses = record.losses || [];
                const logisticLoss = losses[0] ? losses[0].logistic_loss : 0;
                const productionLoss = losses[0] ? losses[0].production_loss : 0;

                const gridItemNumber = document.createElement('div');
                gridItemNumber.className = 'grid-item grid-item-number';
                gridItemNumber.textContent = numberOfProducts;
                gridContainer.appendChild(gridItemNumber);

                const gridItemLogisticLoss = document.createElement('div');
                gridItemLogisticLoss.className = 'grid-item grid-item-logistic-loss';
                gridItemLogisticLoss.textContent = logisticLoss;
                gridContainer.appendChild(gridItemLogisticLoss);

                const gridItemProductionLoss = document.createElement('div');
                gridItemProductionLoss.className = 'grid-item grid-item-production-loss';
                gridItemProductionLoss.textContent = productionLoss;
                gridContainer.appendChild(gridItemProductionLoss);

                const gridItemLoss = document.createElement('div');
                gridItemLoss.className = 'grid-item grid-item-loss';
                const totalLoss = logisticLoss + productionLoss;
                gridItemLoss.textContent = totalLoss;
                gridContainer.appendChild(gridItemLoss);

                gridContainer.addEventListener('click', () => {
                    $('#dataModal').modal('show');
                    selectedUepIndex = i;
                    document.getElementById('uepHiddenInput').value = uepIds[selectedUepIndex];
                    document.getElementById('shiftHiddenInput').value = selectedShift;
                    document.getElementById('hourHiddenInput').value = `${selectedDate} ${hourRange.split('-')[0]}`;
                });

                cell.appendChild(gridContainer);
                row.appendChild(cell);
            }

            tableBody.appendChild(row);
        });
    }

    function getCookie(name) {
        let cookieValue = null;
        if (document.cookie && document.cookie !== '') {
            const cookies = document.cookie.split(';');
            for (let i = 0; i < cookies.length; i++) {
                const cookie = cookies[i].trim();
                if (cookie.substring(0, name.length + 1) === (name + '=')) {
                    cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                    break;
                }
            }
        }
        return cookieValue;
    }

    function saveRecordAndLosses(formData) {
        const uep = formData.get('uep');
        const shift = formData.get('shift');
        const hour = formData.get('hour');
        const number_of_products = parseInt(formData.get('number_of_products'), 10) || 0;
        const logistic_loss = parseFloat(formData.get('logistic_loss')) || 0;
        const production_loss = parseFloat(formData.get('production_loss')) || 0;
        const logistic_comment = formData.get('logistic_comment');
        const production_comment = formData.get('production_comment');

        // Create or update record
        const recordData = {
            user: formData.get('user'),
            shift,
            hour: `${selectedDate} ${hour.split(' ')[1]}`,
            uep: parseInt(uep, 10),
            number_of_products
        };

        return fetch('/api/records/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCookie('csrftoken')
            },
            body: JSON.stringify(recordData)
        })
        .then(response => {
            if (!response.ok) {
                return response.json().then(data => {
                    throw new Error(`Error creating/updating record: ${data.detail || 'Unknown error'}`);
                });
            }
            return response.json();
        })
        .then(recordData => {
            console.log('Record saved successfully:', recordData);

            // Check if record ID is present
            if (!recordData.id) {
                throw new Error('Record ID is missing in the response.');
            }

            // Create or update loss
            const lossData = {
                record: recordData.id,
                logistic_loss,
                production_loss,
                logistic_comment,
                production_comment
            };

            return fetch('/api/losses/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCookie('csrftoken')
                },
                body: JSON.stringify(lossData)
            })
            .then(response => {
                if (!response.ok) {
                    return response.text().then(text => {
                        console.error('Error response:', text);
                        throw new Error(`Error creating/updating loss: ${text}`);
                    });
                }
                return response.json();
            })
            .then(data => {
                console.log('Loss saved successfully:', data);
            });
        })
        .catch(error => {
            console.error('Error saving data:', error);
            alert(`Error saving data: ${error.message || 'Unknown error'}`);
        });
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
        });
    }

    const flatpickrElement = document.getElementById('flatpickr');
    if (flatpickrElement) {
        flatpickr(flatpickrElement, {
            onChange: function(selectedDates, dateStr) {
                selectedDate = dateStr;
                console.log(`Selected date: ${selectedDate}`);
                if (selectedShift) {
                    shiftHours[selectedShift].forEach(hourRange => {
                        const hour = `${selectedDate} ${hourRange.split('-')[0]}`;
                        fetchAndDisplayData(selectedShift, hour);
                        fetchAndDisplayLosses(selectedShift, hour);
                    });
                }
            }
        });
    }

    const button1 = document.getElementById('button1');
    if (button1) {
        button1.addEventListener('click', function() {
            selectedShift = 'A';
            console.log('Selected shift: A');
            if (selectedDate) {
                shiftHours[selectedShift].forEach(hourRange => {
                    const hour = `${selectedDate} ${hourRange.split('-')[0]}`;
                    fetchAndDisplayData(selectedShift, hour);
                    fetchAndDisplayLosses(selectedShift, hour);
                });
            }
        });
    }

    const button2 = document.getElementById('button2');
    if (button2) {
        button2.addEventListener('click', function() {
            selectedShift = 'B';
            console.log('Selected shift: B');
            if (selectedDate) {
                shiftHours[selectedShift].forEach(hourRange => {
                    const hour = `${selectedDate} ${hourRange.split('-')[0]}`;
                    fetchAndDisplayData(selectedShift, hour);
                    fetchAndDisplayLosses(selectedShift, hour);
                });
            }
        });
    }

    const button3 = document.getElementById('button3');
    if (button3) {
        button3.addEventListener('click', function() {
            selectedShift = 'N';
            console.log('Selected shift: N');
            if (selectedDate) {
                shiftHours[selectedShift].forEach(hourRange => {
                    const hour = `${selectedDate} ${hourRange.split('-')[0]}`;
                    fetchAndDisplayData(selectedShift, hour);
                    fetchAndDisplayLosses(selectedShift, hour);
                });
            }
        });
    }
});
