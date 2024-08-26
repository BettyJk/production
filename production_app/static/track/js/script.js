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

function setupFlatpickr() {
    const flatpickrElement = document.getElementById('flatpickr');
    if (flatpickrElement) {
        flatpickr(flatpickrElement, {
            onChange: function(selectedDates, dateStr) {
                console.log(`Flatpickr date changed to: ${dateStr}`);
                selectedDate = dateStr;
                fetchAndDisplayData(selectedShift, selectedDate);
            },
            dateFormat: 'Y-m-d',
            defaultDate: new Date(),
        });
    }
}
function setupShiftButtons() {
    const shiftButtons = document.querySelectorAll('.shift-button');
    shiftButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Remove 'active' class from all buttons
            shiftButtons.forEach(btn => btn.classList.remove('active'));

            // Add 'active' class to the clicked button
            button.classList.add('active');

            selectedShift = button.dataset.shift;
            console.log(`Shift selected: ${selectedShift}`);
            fetchAndDisplayData(selectedShift, selectedDate);
        });
    });
}
async function fetchAndDisplayData(shift, date) {
    if (!shift || !date) {
        console.warn('Shift or date is not selected.');
        return;
    }

    try {
        const response = await fetch(`/api/records/by_shift_and_date/?shift=${shift}&date=${date}`);
        if (!response.ok) throw new Error(`Error fetching data: ${response.status}`);
        const data = await response.json();
        console.log('API Response:', data);
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

    tableBody.innerHTML = '';

    const recordsByHour = {};
    data.forEach(record => {
        const utcHour = record.hour.slice(11, 16); // Extract hour:minute from 'YYYY-MM-DDTHH:MM:SSZ'
        console.log(`Original hour (UTC): ${record.hour}, Treated as Local hour: ${utcHour}`);

        if (!recordsByHour[utcHour]) {
            recordsByHour[utcHour] = [];
        }
        recordsByHour[utcHour].push(record);
    });

    shiftHours[shift].forEach(hourRange => {
        const [startHour, endHour] = hourRange.split('-');
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

            const hourData = recordsByHour[startHour] || [];
            const record = hourData.find(record => record.uep === parseInt(uepId, 10)) || {};
            let numberOfProducts = record.number_of_products || 0;
            let logisticLoss = 0;
            let productionLoss = 0;
            let totalLoss = 0;

            if (numberOfProducts !== 0) {
                const losses = record.losses || [];
                logisticLoss = losses.length > 0 ? losses[0].RoP : 0;
                productionLoss = losses.length > 0 ? losses[0].saturation_manque : 0;
                totalLoss = logisticLoss + productionLoss; // Adjusted logic for total loss calculation

                const RO = (numberOfProducts / 33) * 100;
                if (RO < 92) {
                    gridContainer.style.backgroundColor = '#e35656'; // Red
                } else if (RO >= 92 && RO < 99) {
                    gridContainer.style.backgroundColor = '#f6b26b'; // Orange
                } else {
                    gridContainer.style.backgroundColor = '#b6d7a8'; // Green
                }
            }

            gridContainer.innerHTML = `
                <div class="grid-item grid-item-number">${numberOfProducts}</div>
                <div class="grid-item grid-item-loss">${totalLoss}</div>
                <div class="grid-item grid-item-logistic-loss">${logisticLoss}</div>
                <div class="grid-item grid-item-production-loss">${productionLoss}</div>
            `;

            gridContainer.addEventListener('click', () => openModal(record, uepId, hourRange, cellId));

            cell.appendChild(gridContainer);
            row.appendChild(cell);
        });

        tableBody.appendChild(row);
    });
}
async function openModal(record, uepId, hourRange, cellId) {
    $('#dataModal').modal('show');

    // Check if elements exist before setting their values
    const numberOfProductsElement = document.getElementById('number_of_products');
    const logisticLossLogElement = document.getElementById('logistic_loss_log');
    const logisticLossAndonElement = document.getElementById('logistic_loss_andon');
    const logisticLossMaiElement = document.getElementById('logistic_loss_mai');
    const productionLossProduitElement = document.getElementById('production_loss_produit');
    const productionLossSaturationElement = document.getElementById('production_loss_saturation');
    const logisticCommentElement = document.getElementById('logistic_comment');
    const productionCommentElement = document.getElementById('production_comment');
    const productionTheoriqueElement = document.getElementById('production_theorique');
    const productionPlanifieeElement = document.getElementById('production_planifiee');

    if (numberOfProductsElement) numberOfProductsElement.value = record.number_of_products || '';
    if (logisticLossLogElement) logisticLossLogElement.value = record.losses?.[0]?.RoP || '';
    if (logisticLossAndonElement) logisticLossAndonElement.value = record.losses?.[0]?.RoP || '';
    if (logisticLossMaiElement) logisticLossMaiElement.value = record.losses?.[0]?.RoP || '';
    if (productionLossProduitElement) productionLossProduitElement.value = record.losses?.[0]?.saturation_manque || '';
    if (productionLossSaturationElement) productionLossSaturationElement.value = record.losses?.[0]?.saturation_manque || '';
    if (logisticCommentElement) logisticCommentElement.value = record.losses?.[0]?.RoP_comment || '';
    if (productionCommentElement) productionCommentElement.value = record.losses?.[0]?.saturation_manque_comment || '';

    try {
        // Fetch and populate goal data
        const goals = await fetchGoals(uepId, selectedShift, selectedDate);
        if (goals) {
            if (productionTheoriqueElement) productionTheoriqueElement.value = goals.theoretical_goal || '';
            if (productionPlanifieeElement) productionPlanifieeElement.value = goals.planned_goal || '';
        } else {
            // Clear the goal fields if no goals data is found
            if (productionTheoriqueElement) productionTheoriqueElement.value = '';
            if (productionPlanifieeElement) productionPlanifieeElement.value = '';
        }
    } catch (error) {
        console.error('Failed to fetch goals:', error);
        // Optionally, handle the error (e.g., show an alert to the user)
    }

    // Populate hidden fields with relevant data
    document.getElementById('uepHiddenInput').value = uepId || '';
    document.getElementById('shiftHiddenInput').value = selectedShift || '';
    document.getElementById('hourHiddenInput').value = `${selectedDate} ${hourRange.split('-')[0]}` || '';
    document.getElementById('recordIdHiddenInput').value = record.id || '';
}

async function fetchGoals(uepId, shift, date) {
    try {
        const response = await fetch(`/api/goals/?uep=${uepId}&shift=${shift}&date=${date}`);
        if (!response.ok) throw new Error(`Error fetching goals: ${response.status}`);
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error fetching goals:', error);
        return null; // or handle the error as needed
    }
}

function getCookie(name) {
    const cookies = document.cookie.split(';');
    for (const cookie of cookies) {
        const [cookieName, cookieValue] = cookie.split('=');
        if (cookieName.trim() === name) {
            return decodeURIComponent(cookieValue);
        }
    }
    return null;
}

async function saveRecordAndLosses(formData) {
    const uep = formData.get('uep');
    const shift = formData.get('shift');
    const hour = formData.get('hour');
    const number_of_products = parseInt(formData.get('number_of_products'), 10) || 0;

    // Retrieve logistic losses
    const logistic_loss_log = parseFloat(formData.get('log_mancaise')) || 0;
    const logistic_loss_andon = parseFloat(formData.get('andon_fab')) || 0;
    const logistic_loss_mai = parseFloat(formData.get('mai')) || 0;

    // Retrieve production losses
    const production_loss_produit = parseFloat(formData.get('saturation_manque_product')) || 0;
    const production_loss_saturation = parseFloat(formData.get('saturation')) || 0;

    // Retrieve comments
    const logistic_comment_log = formData.get('log_mancaise_comment') || '';
    const logistic_comment_andon = formData.get('andon_fab_comment') || '';
    const logistic_comment_mai = formData.get('mai_comment') || '';

    const production_comment_product = formData.get('saturation_manque_comment_product') || '';
    const production_comment_saturation = formData.get('saturation_comment') || '';

    const user = formData.get('user');
    const existingRecordId = formData.get('record_id');

    if (existingRecordId) {
        alert('Record already exists. Edit the record if you want to make changes.');
        return;
    }

    // Calculate the total RoP and saturation/manque
    const totalRoP = logistic_loss_log + logistic_loss_andon + logistic_loss_mai;
    const totalSaturationManque = production_loss_produit + production_loss_saturation;

    console.log("Total RoP:", totalRoP); // Debug log
    console.log("Total Saturation/Manque:", totalSaturationManque); // Debug log

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

        // Prepare loss data
        const lossData = {
            record: recordDataResponse.id,
            RoP: totalRoP,
            saturation_manque: totalSaturationManque,
            RoP_comment: `${logistic_comment_log} ${logistic_comment_andon} ${logistic_comment_mai}`,
            saturation_manque_comment: `${production_comment_product} ${production_comment_saturation}`
        };

        console.log("Loss Data to be sent:", lossData); // Debug log

        const lossResponse = await fetch('/api/losses/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCookie('csrftoken')
            },
            body: JSON.stringify(lossData)
        });

        if (!lossResponse.ok) {
            const lossErrorData = await lossResponse.json();
            throw new Error(`Error creating/updating loss: ${JSON.stringify(lossErrorData)}`);
        }

        const lossDataResponse = await lossResponse.json();
        console.log('Loss saved successfully:', lossDataResponse);

        // Fetch and display the updated data after saving
        fetchAndDisplayData(shift, selectedDate);

        // Close the modal
        $('#dataModal').modal('hide');

    } catch (error) {
        console.error('Error saving data:', error);
        alert(`Error saving data: ${error.message || 'Unknown error'}`);
    }
}


function setupModal() {
    const closeModalButton = document.querySelector('#dataModal .close');
    if (closeModalButton) {
        closeModalButton.addEventListener('click', function() {
            $('#dataModal').modal('hide');
        });
    }

    const deleteRecordButton = document.querySelector('#deleteRecordButton');
    if (deleteRecordButton) {
        deleteRecordButton.addEventListener('click', function() {
            const recordId = document.getElementById('recordIdHiddenInput').value;
            if (recordId) {
                deleteRecord(recordId);
            }
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

        if (response.ok) {
            $('#dataModal').modal('hide');
            fetchAndDisplayData(selectedShift, selectedDate);
        } else {
            console.error('Error deleting record:', response.statusText);
            alert('Error deleting record.');
        }
    } catch (error) {
        console.error('Error deleting record:', error);
        alert('Error deleting record.');
    }
}

function setupFormSubmission() {
    const form = document.getElementById('dataForm');
    if (form) {
        form.addEventListener('submit', function(event) {
            event.preventDefault();
            const formData = new FormData(form);
            saveRecordAndLosses(formData);
        });
    }
}

    function setDefaultDateAndShift() {
        const currentTime = new Date();
        const currentHour = currentTime.getHours();
        selectedDate = currentTime.toISOString().split('T')[0];

        if (currentHour >= 6 && currentHour < 14) {
            selectedShift = 'A';
        } else if (currentHour >= 14 && currentHour < 22) {
            selectedShift = 'B';
        } else {
            selectedShift = 'N';
        }

        const shiftButton = document.querySelector(`.shift-button[data-shift="${selectedShift}"]`);
        if (shiftButton) {
            shiftButton.classList.add('active');
        } else {
            console.error(`No shift button found for shift ${selectedShift}`);
        }

        fetchAndDisplayData(selectedShift, selectedDate);
    }
   setupFlatpickr();
    setupShiftButtons();
    setupModal();
    setupFormSubmission();
    setDefaultDateAndShift();
});
document.addEventListener('DOMContentLoaded', function () {
    console.log('DOM fully loaded and parsed');

    const dropdownItems = document.querySelectorAll('.dropdown-item');
    console.log('Dropdown items:', dropdownItems);

    dropdownItems.forEach(item => {
        item.addEventListener('click', function (event) {
            console.log('Dropdown item clicked');
            event.preventDefault();

            const exportType = this.getAttribute('data-download');  // day, month, or year
            const departmentId = document.body.getAttribute('data-department-id');

            console.log(`Export Type: ${exportType}`);
            console.log(`Department ID: ${departmentId}`);

            if (exportType && departmentId) {
                // Construct the API URL to include the period and department ID
                const apiUrl = `/api/download_data/${exportType}/${departmentId}/`;
                console.log(`Constructed API URL: ${apiUrl}`);

                // Show loading indicator
                const loadingIndicator = document.createElement('div');
                loadingIndicator.textContent = 'Loading...';
                loadingIndicator.style.position = 'fixed';
                loadingIndicator.style.top = '50%';
                loadingIndicator.style.left = '50%';
                loadingIndicator.style.transform = 'translate(-50%, -50%)';
                loadingIndicator.style.backgroundColor = '#fff';
                loadingIndicator.style.padding = '10px';
                loadingIndicator.style.borderRadius = '5px';
                loadingIndicator.style.boxShadow = '0 0 10px rgba(0,0,0,0.1)';
                document.body.appendChild(loadingIndicator);

                fetch(apiUrl)
                    .then(response => {
                        console.log('Response status:', response.status);
                        if (!response.ok) {
                            throw new Error('Network response was not ok');
                        }
                        return response.json();
                    })
                    .then(data => {
                        console.log('Data received:', data);

                        // Check if records exist
                        if (Array.isArray(data.records) && data.records.length > 0) {
                            // Create a new workbook
                            const wb = XLSX.utils.book_new();
                            const ws = XLSX.utils.json_to_sheet(data.records);
                            XLSX.utils.book_append_sheet(wb, ws, "Records");

                            // Generate a download link and click it
                            const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'binary' });
                            const blob = new Blob([s2ab(wbout)], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
                            const url = window.URL.createObjectURL(blob);
                            console.log('Generated Blob URL:', url);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `records_${exportType}_${departmentId}.xlsx`;
                            document.body.appendChild(a);
                            a.click();
                            document.body.removeChild(a);
                            window.URL.revokeObjectURL(url);
                        } else {
                            console.log('No records found or incorrect data format.');
                            alert('No records found.');
                        }

                        // Hide loading indicator
                        document.body.removeChild(loadingIndicator);
                    })
                    .catch(error => {
                        console.error('Fetch error: ', error);
                        alert('Failed to fetch data. Please try again later.');

                        // Hide loading indicator
                        document.body.removeChild(loadingIndicator);
                    });
            } else {
                alert('Required data attributes are missing.');
            }
        });
    });

    function s2ab(s) {
        const buf = new ArrayBuffer(s.length);
        const view = new Uint8Array(buf);
        for (let i = 0; i < s.length; ++i) {
            view[i] = s.charCodeAt(i) & 0xFF;
        }
        return buf;
    }
});

function displayChart(chartData, targetLine) {
    const chart = echarts.init(document.getElementById('prodChart'));

    const targetMapping = {};
    chartData.forEach((data, index) => {
        targetMapping[data.hour] = targetLine[index];
    });

    const option = {
        xAxis: {
            type: 'category',
            data: chartData.map(data => data.hour),
        },
        yAxis: {
            type: 'value',
        },
        series: [
            {
                type: 'bar',
                data: chartData.map(data => data.value),
                itemStyle: {
                    color: function (params) {
                        const hour = chartData[params.dataIndex].hour;
                        const target = targetMapping[hour];
                        if (params.value < target) return '#FF6242'; // Red for values below target
                        if (params.value >= target) return '#83f28f'; // Light green for values above or equal to target
                    }
                }
            },
            {
                name: 'TARGET',
                type: 'line',
                data: targetLine,
                itemStyle: {
                    color: '#58AFDD' // Line color for target
                }
            }
        ]
    };
    chart.setOption(option);

    console.log('Displaying chart...');
}

function displayPieCharts(production, theoTarget) {
    const totalTheoTarget = theoTarget * 7 + 21;
    const ropieValue = (production / totalTheoTarget) * 100;

    console.log(production);

    const ropieChart = echarts.init(document.getElementById('ROpie'));
    const ropieOption = {
        title: {
            text: 'RO',
            left: 'center'
        },
        tooltip: {
            trigger: 'item'
        },
        series: [{
            name: 'Production',
            type: 'pie',
            radius: '50%',
            data: [
                {
                    value: production,
                    name: 'Production',
                    itemStyle: {
                        color: '#83f28f'
                    }
                },
                {
                    value: totalTheoTarget - production,
                    name: 'Restant',
                    itemStyle: {
                        color: '#FF8164'
                    }
                }
            ],
            emphasis: {
                itemStyle: {
                    shadowBlur: 10,
                    shadowOffsetX: 0,
                    shadowColor: 'rgba(0, 0, 0, 0.5)'
                }
            }
        }]
    };
    ropieChart.setOption(ropieOption);
}

function displayTRpie(emptyHours, totalHours) {
    const trPieChart = echarts.init(document.getElementById('TRpie'));
    const option = {
        title: {
            text: 'TR',
            left: 'center'
        },
        tooltip: {
            trigger: 'item',
        },
        series: [
            {
                name: 'Heures',
                type: 'pie',
                radius: '50%',
                data: [
                    {
                        value: totalHours - emptyHours,
                        name: 'Heures remplies',
                        itemStyle: {
                            color: '#83f28f'
                        }
                    },
                    {
                        value: emptyHours,
                        name: 'Heures non remplies',
                        itemStyle: {
                            color: '#FFFF60'
                        }
                    }
                ],
                emphasis: {
                    itemStyle: {
                        shadowBlur: 10,
                        shadowOffsetX: 0,
                        shadowColor: 'rgba(0, 0, 0, 0.5)'
                    }
                }
            }
        ]
    };
    trPieChart.setOption(option);
}


document.addEventListener('DOMContentLoaded', function() {
    const departmentIdElement = document.querySelector('body').getAttribute('data-department-id');
    const dateElement = document.getElementById('flatpickr');
    let uepIdElement = document.getElementById('data-uep-id');
    let shiftElement = document.querySelector('.shift-button.active'); // Initial active shift

    console.log('departmentId', departmentIdElement);
    console.log('dateElement', dateElement);
    console.log('uepIdElement', uepIdElement);

    // Ensure shift buttons update the active shift
    document.querySelectorAll('.shift-button').forEach(function(button) {
        button.addEventListener('click', function() {
            document.querySelector('.shift-button.active').classList.remove('active');
            this.classList.add('active');
            shiftElement = this;
            fetchAndDisplayChartData();
        });
    });

    document.querySelectorAll('.eye').forEach(function(eyeIcon) {
        eyeIcon.addEventListener('click', function() {
            const uepId = this.getAttribute('data-uep-id');
            console.log('Selected UEP ID:', uepId);

            if (!uepIdElement) {
                uepIdElement = document.createElement('input');
                uepIdElement.type = 'hidden';
                uepIdElement.id = 'data-uep-id';
                document.body.appendChild(uepIdElement);
                console.log('Created uepIdElement:', uepIdElement);
            }
            uepIdElement.value = uepId;

            fetchAndDisplayChartData();
        });
    });

    function fetchAndDisplayChartData() {
    const departmentId = departmentIdElement;
    const date = dateElement ? dateElement.value : null;
    const uepId = uepIdElement ? uepIdElement.value : null;

    console.log('Fetching data with:', { departmentId, date, uepId });

    if (departmentId && date && uepId) {
        fetch(`/api/get-chart-data/${departmentId}/${date}/${uepId}/`)
            .then(response => response.json())
            .then(data => {
                console.log('API Response:', data);

                const chartData = data.chartData;
                const targetLine = data.targetLine;
                const production = data.production;
                const theoTarget = data.theoTarget;
                const emptyHours = data.emptyHours;
                const totalHours = data.totalHours;

                displayChart(chartData, targetLine);
                displayPieCharts(production, theoTarget);
                displayTRpie(emptyHours, totalHours);
            })
            .catch(error => console.error('Error fetching chart data:', error));
    } else {
        console.error('One or more elements are missing in the DOM');
    }
}
function fetchAndDisplayChartData() {
        const departmentId = departmentIdElement;
        const shift = shiftElement ? shiftElement.getAttribute('data-shift') : null;
        const date = dateElement ? dateElement.value : null;
        const uepId = uepIdElement ? uepIdElement.value : null;

        console.log('Fetching data with:', { departmentId, shift, date, uepId });

        if (departmentId && shift && date && uepId) {
            fetch(`/api/get-chart-data/${departmentId}/${shift}/${date}/${uepId}/`)
                .then(response => response.json())
                .then(data => {
                    console.log('API Response:', data);

                    const chartData = data.chartData;
                    const targetLine = data.targetLine;
                    const production = data.production;
                    const theoTarget = data.theoTarget;
                    const emptyHours = data.emptyHours;
                    const totalHours = data.totalHours;

                    displayChart(chartData, targetLine);
                    displayPieCharts(production, theoTarget);
                    displayTRpie(emptyHours, totalHours);
                })
                .catch(error => console.error('Error fetching chart data:', error));
        } else {
            console.error('One or more elements are missing in the DOM');
        }
    }
});
document.addEventListener('DOMContentLoaded', function() {
    const departmentIdElement = document.querySelector('body').getAttribute('data-department-id');
    const dateElement = document.getElementById('flatpickr');

    const departmentId = parseInt(departmentIdElement, 10);

    console.log('departmentId', departmentId);
    console.log('dateElement', dateElement);

    function fetchAndDisplayDepartmentChartData() {
        const date = dateElement.value;

        fetch(`/api/get-department-chart-data/${departmentId}/${date}/`)
            .then(response => response.json())
            .then(data => {
                console.log('API Response:', data);

                const chartData = data.chartData;
                const targetLine = data.targetLine;
                const production = data.production;
                const theoTarget = data.theoTarget;
                const emptyHours = data.emptyHours;
                const totalHours = data.totalHours;

                displayDepartmentChart(chartData, targetLine);
                displayDepartmentPieCharts(production, theoTarget);
                displayDepartmentTRpie(emptyHours, totalHours);
            })
            .catch(error => console.error('Error fetching department chart data:', error));
    }

    document.querySelectorAll('.shift-button').forEach(function(button) {
        button.addEventListener('click', function() {
            document.querySelector('.shift-button.active').classList.remove('active');
            this.classList.add('active');
            fetchAndDisplayDepartmentChartData();
        });
    });

    document.getElementById('showGraphsButton').addEventListener('click', function() {
        fetchAndDisplayDepartmentChartData();
    });

    function displayDepartmentChart(chartData, targetLine) {
        const chart = echarts.init(document.getElementById('proddepartmentChart'));

        const targetMapping = {};
        chartData.forEach((data, index) => {
            targetMapping[data.hour] = targetLine[index];
        });

        const option = {
            title: {
                text: 'Department Production Over Time',
                left: 'center'
            },
            xAxis: {
                type: 'category',
                data: chartData.map(data => `${data.hour}-${addHour(data.hour)}`), // Format time ranges
                axisLabel: {
                    formatter: function(value) {
                        return value;
                    }
                }
            },
            yAxis: {
                type: 'value',
                name: 'Number of Products',
            },
            series: [
                {
                    name: 'Production',
                    type: 'bar',
                    data: chartData.map(data => data.value),
                    itemStyle: {
                        color: function (params) {
                            const hour = chartData[params.dataIndex].hour;
                            const target = targetMapping[hour];
                            return params.value < target ? '#FF6242' : '#83f28f'; // Color logic
                        }
                    },
                    label: {
                        show: true,
                        position: 'top',
                        formatter: '{c}'
                    }
                },
                {
                    name: 'Target',
                    type: 'line',
                    data: targetLine,
                    itemStyle: {
                        color: '#58AFDD'
                    },
                    label: {
                        show: true,
                        position: 'top',
                        formatter: '{c}'
                    }
                }
            ]
        };
        chart.setOption(option);
    }

    function displayDepartmentPieCharts(production, theoTarget) {
        const totalTheoTarget = theoTarget * 7 + 21;
        const ropieValue = (production / totalTheoTarget) * 100;

        const ropieChart = echarts.init(document.getElementById('ROpiedepartment'));
        const ropieOption = {
            title: {
                text: 'RO (Ratio of Production to Goal)',
                left: 'center'
            },
            tooltip: {
                trigger: 'item',
                formatter: '{a} <br/>{b}: {c} ({d}%)'
            },
            series: [{
                name: 'Production',
                type: 'pie',
                radius: '50%',
                data: [
                    {
                        value: production,
                        name: 'Production',
                        itemStyle: {
                            color: '#83f28f'
                        }
                    },
                    {
                        value: totalTheoTarget - production,
                        name: 'Remaining Target',
                        itemStyle: {
                            color: '#FF8164'
                        }
                    }
                ],
                emphasis: {
                    itemStyle: {
                        shadowBlur: 10,
                        shadowOffsetX: 0,
                        shadowColor: 'rgba(0, 0, 0, 0.5)'
                    }
                }
            }]
        };
        ropieChart.setOption(ropieOption);
    }

    function displayDepartmentTRpie(emptyHours, totalHours) {
        const trPieChart = echarts.init(document.getElementById('TRpiedepartment'));
        const option = {
            title: {
                text: 'TR (Filled vs Empty Hours)',
                left: 'center'
            },
            tooltip: {
                trigger: 'item',
                formatter: '{a} <br/>{b}: {c} ({d}%)'
            },
            series: [
                {
                    name: 'Hours',
                    type: 'pie',
                    radius: '50%',
                    data: [
                        {
                            value: totalHours - emptyHours,
                            name: 'Filled Hours',
                            itemStyle: {
                                color: '#83f28f'
                            }
                        },
                        {
                            value: emptyHours,
                            name: 'Empty Hours',
                            itemStyle: {
                                color: '#FFFF60'
                            }
                        }
                    ],
                    emphasis: {
                        itemStyle: {
                            shadowBlur: 10,
                            shadowOffsetX: 0,
                            shadowColor: 'rgba(0, 0, 0, 0.5)'
                        }
                    }
                }
            ]
        };
        trPieChart.setOption(option);
    }

    function addHour(time) {
        const [hour, minute] = time.split(':').map(Number);
        const newHour = (hour + 1) % 24;
        return `${newHour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
    }
});

