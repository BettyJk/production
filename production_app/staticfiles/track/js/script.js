document.addEventListener('DOMContentLoaded', function() {
    initializeFlatpickr();
    const departmentId = "{{ department.id }}"; // Assuming this is passed from your Django template
    fetchUEPs(departmentId);

    setupEventListeners();
});

function initializeFlatpickr() {
    flatpickr("#flatpickr", {
        dateFormat: "Y-m-d",
        defaultDate: new Date()
    });
}

function setupEventListeners() {
    document.getElementById('button1').addEventListener('click', () => selectShift('shiftA'));
    document.getElementById('button2').addEventListener('click', () => selectShift('shiftB'));
    document.getElementById('button3').addEventListener('click', () => selectShift('shiftN'));

    document.getElementById('zoneForm').addEventListener('submit', handleSubmit);

    document.querySelectorAll('.zone').forEach(zoneElement => {
        zoneElement.addEventListener('click', handleZoneClick);
    });

    document.getElementById('recordInput').addEventListener('input', updateLossInput);
    document.getElementById('logisticLossInput').addEventListener('input', updateLossInput);
    document.getElementById('productionLossInput').addEventListener('input', updateLossInput);
}

function handleSubmit(event) {
    event.preventDefault();

    const record = document.getElementById('recordInput').value;
    const logisticLoss = document.getElementById('logisticLossInput').value;
    const logisticComment = document.getElementById('logisticCommentInput').value;
    const productionLoss = document.getElementById('productionLossInput').value;
    const productionComment = document.getElementById('productionCommentInput').value;
    const zone = document.getElementById('zoneHiddenInput').value;
    const uep = document.getElementById('uepHiddenInput').value;
    const shift = document.getElementById('shiftHiddenInput').value; // Adjusted field
    const hour = document.getElementById('hourHiddenInput').value; // Adjusted field

    const data = {
    number_of_products: record, // Ensure these fields match your serializer
    logistic_loss: logisticLoss,
    logistic_comment: logisticComment,
    production_loss: productionLoss,
    production_comment: productionComment,
    zone: zone,
    uep: uep,
    shift: shift,
    hour: hour
};


    console.log('Sending data:', data);

    fetch('/api/records/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCookie('csrftoken')
        },
        body: JSON.stringify(data)
    })
    .then(response => {
        if (!response.ok) {
            return response.json().then(err => { throw err; });
        }
        return response.json();
    })
    .then(data => {
        console.log('Success:', data);
        const modal = document.getElementById('exampleModal');
        const modalInstance = bootstrap.Modal.getInstance(modal);
        modalInstance.hide();
        updateTimetableCell(data);
    })
    .catch(error => {
        console.error('Error:', error);
    });
}

function handleZoneClick() {
    const zoneElement = this;
    const zone = zoneElement.getAttribute('data-zone');
    const uep = zoneElement.getAttribute('data-uep');

    document.getElementById('zoneHiddenInput').value = zone;
    document.getElementById('uepHiddenInput').value = uep;

    // Pre-fill form fields if already existing data
    const currentValue = zoneElement.getAttribute('data-value');
    if (currentValue) {
        document.getElementById('recordInput').value = currentValue; // Example, replace with appropriate logic for other fields
        document.getElementById('logisticLossInput').value = ''; // Clear other fields if necessary
        document.getElementById('logisticCommentInput').value = '';
        document.getElementById('productionLossInput').value = '';
        document.getElementById('productionCommentInput').value = '';
    }
}

function selectShift(shift) {
    console.log(`Selected shift: ${shift}`);
    showShiftTimetable(`${shift}-timetable`);
    // Additional logic for selecting shift can go here
}

function fetchUEPs(departmentId) {
    fetch(`/api/ueps/?department=${departmentId}`)
        .then(response => response.json())
        .then(data => {
            window.ueps = data;
            populateShiftTimetables();
        })
        .catch(error => {
            console.error('Error fetching UEPs:', error);
        });
}

function populateShiftTimetables() {
    const shifts = ['shiftA', 'shiftB', 'shiftN'];
    shifts.forEach(shift => populateShiftTimetable(shift));
}

function populateShiftTimetable(shift) {
    const tbody = document.getElementById(`${shift}-timetable`);
    if (!tbody) {
        console.error(`Table body for shift ${shift} not found.`);
        return;
    }

    const hours = shiftHours[shift];
    const template = document.getElementById('row-template').content;
    tbody.innerHTML = '';
    hours.forEach(hour => {
        const row = document.importNode(template, true);
        row.querySelector('.hour').textContent = hour;
        tbody.appendChild(row);
    });

    fetch(`/api/records/?shift=${shift}`)
        .then(response => response.json())
        .then(records => {
            records.forEach(record => updateTimetableCell(record));
        })
        .catch(error => {
            console.error('Error fetching records:', error);
        });
}

function updateTimetableCell(record) {
    try {
        const shift = typeof record.shift === 'string' ? record.shift.toLowerCase() : '';
        const tbody = document.getElementById(`${shift}-timetable`);
        if (!tbody) {
            console.error(`Table body for shift ${shift} not found.`);
            return;
        }

        const recordHour = extractHourFromTimestamp(record.timestamp);
        const hourRow = Array.from(tbody.rows).find(row => row.querySelector('.hour').textContent === recordHour);
        if (!hourRow) {
            console.error(`Hour row for ${recordHour} not found in shift ${shift}.`);
            return;
        }

        const cell = hourRow.querySelector(`td[data-uep="${record.uep.id}"]`);
        if (!cell) {
            console.error(`Cell for UEP ${record.uep.id} not found in hour ${recordHour}.`);
            return;
        }

        const zoneElement = cell.querySelector(`.zone[data-zone="${record.zone}"]`);
        if (zoneElement) {
            zoneElement.innerHTML = `
                <div>Record: ${record.record}</div>
                <div>Calculated Loss: ${record.calculated_loss}</div>
                <div>Logistic Loss: ${record.logistic_loss}</div>
                <div>Production Loss: ${record.production_loss}</div>
            `;
            updateCellStyling(zoneElement, record.calculated_loss);
        } else {
            console.error(`Zone element for zone ${record.zone} not found in cell.`);
        }
    } catch (error) {
        console.error('Error updating timetable cell:', error);
    }
}

const shiftHours = {
    shiftA: ['06:00-07:00', '07:00-08:00', '08:00-09:00', '09:00-10:00', '10:00-11:00', '11:00-12:00', '12:00-13:00', '13:00-14:00'],
    shiftB: ['14:00-15:00', '15:00-16:00', '16:00-17:00', '17:00-18:00', '18:00-19:00', '19:00-20:00', '20:00-21:00', '21:00-22:00'],
    shiftN: ['22:00-23:00', '23:00-00:00', '00:00-01:00', '01:00-02:00', '02:00-03:00', '03:00-04:00', '04:00-05:00', '05:00-06:00']
};

function showShiftTimetable(shiftId) {
    document.querySelectorAll('.shift-timetable').forEach(el => el.style.display = 'none');
    const selectedShift = document.getElementById(shiftId);
    if (selectedShift) {
        selectedShift.style.display = 'table-row-group';
    } else {
        console.error(`Shift timetable for ${shiftId} not found.`);
    }
}

function updateLossInput() {
    const record = document.getElementById('recordInput').value;
    const theoreticalGoal = 33;
    const loss = theoreticalGoal - record;
    document.getElementById('lossInput').value = loss;
}

function extractHourFromTimestamp(timestamp) {
    const date = new Date(timestamp);
    const hour = date.getHours().toString().padStart(2, '0');
    const minute = date.getMinutes().toString().padStart(2, '0');
    return `${hour}:${minute}`;
}

function updateCellStyling(element, loss) {
    if (loss > 0) {
        element.style.backgroundColor = '#FFAAAA';
    } else {
        element.style.backgroundColor = '';
    }
}

function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (const cookie of cookies) {
            const trimmedCookie = cookie.trim();
            if (trimmedCookie.startsWith(`${name}=`)) {
                cookieValue = decodeURIComponent(trimmedCookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}
