// Function to fetch data from the API and execute a callback
function fetchData(endpoint, callback) {
    fetch(`http://127.0.0.1:8000/api/${endpoint}`)
        .then(response => response.json())
        .then(data => {
            console.log(`Fetched data from ${endpoint}:`, data);
            callback(data);
        })
        .catch(error => console.error('Error fetching data:', error));
}


function generateDateRange(startDate, numDays) {
    const dates = [];
    const start = new Date(startDate);
    for (let i = 0; i < numDays; i++) {
        const date = new Date(start);
        date.setDate(start.getDate() - i);
        dates.push(date.toISOString().slice(0, 10)); // Format YYYY-MM-DD
    }
    return dates.reverse(); // Return dates from oldest to newest
}
function prepareChart1(dateRange, records, ueps, departments) {
    const departmentProduction = {};
    dateRange.forEach(date => {
        departmentProduction[date] = {};
        departments.forEach(dept => {
            departmentProduction[date][dept.id] = 0;
        });
    });
    records.forEach(record => {
        const recordDate = new Date(record.hour);
        const recordDateStr = recordDate.toISOString().slice(0, 10);

        if (dateRange.includes(recordDateStr)) {
            const uep = ueps.find(uep => uep.id === record.uep);
            if (uep) {
                departmentProduction[recordDateStr][uep.department] += record.number_of_products;
            }
        }
    });
    const seriesData = departments.map(dept => ({
        name: dept.name,
        type: 'line',
        data: dateRange.map(date => departmentProduction[date][dept.id] || 0),
        labelLayout: {
            moveOverlap: 'shiftY'
        },
        emphasis: {
            focus: 'series',
            blurScope: 'coordinateSystem'
        }
    }));

    return seriesData;
}
function calculateROjour(totalProduction, theoTarget) {
    const targett = (theoTarget * 7 * 3 + Math.ceil(37 * theoTarget / 60) * 3);
    const ro = (totalProduction / targett) * 100;
    console.log(`Calculated RO: ${ro}% for production ${totalProduction} and target ${theoTarget} and target jour ${targett}`);
    return ro;
}
// Define a color map for departments
// Define a color map for departments
const departmentColors = {
    'montage': '#FF7F7F',   // Color for Montage
    'peinture': '#FFA756',  // Color for Peinture
    'ferrage': '#90EE90',   // Color for Ferrage
    'O2X': '#ADD8E6',       // Color for O2X
    'Berceau': '#D3D3D3',   // Color for Berceau
};

// Function to get color based on department name
function getROColor(departmentName) {
    return departmentColors[departmentName] || '#D3D3D3'; // Default color if department name is not found
}

// Update prepareChart2 to use department-specific colors
function prepareChart2(today, records, ueps, departments, targetMap) {
    console.log('Starting prepareChart2 with targetMap:', targetMap);

    return departments.map(dept => {
        const uepsInDept = ueps.filter(uep => uep.department === dept.id);

        const totalRO = uepsInDept.reduce((sum, uep) => {
            const uepProduction = records
                .filter(record => record.uep === uep.id &&
                        new Date(record.hour) >= new Date(today + 'T06:00:00Z') &&
                        new Date(record.hour) < new Date(new Date(today + 'T06:00:00Z').getTime() + 24 * 60 * 60 * 1000))
                .reduce((acc, record) => acc + record.number_of_products, 0);

            const theoTarget = 33; // Ensure we're accessing the correct goal
            console.log(`UEP ${uep.name} in department ${dept.name} produced ${uepProduction} units today with theoTarget ${theoTarget}.`);

            return sum + calculateROjour(uepProduction, theoTarget);
        }, 0);

        const avgRO = parseFloat((totalRO / (uepsInDept.length || 1)).toFixed(3));
        console.log(`Department ${dept.name} average RO for today: ${avgRO}%`);

        return {
            name: dept.name,
            value: avgRO,
            itemStyle: {
                color: getROColor(dept.name) // Get color based on department name
            }
        };
    });
}

function prepareChart3(date, records, ueps, departments) {
    return departments.map(dept => {
        const uepsInDept = ueps.filter(uep => uep.department === dept.id);

        const totalTR = uepsInDept.reduce((sum, uep) => {
            const uepRecords = records.filter(record =>
                record.uep === uep.id &&
                new Date(record.hour) >= new Date(date + 'T06:00:00Z') &&
                new Date(record.hour) < new Date(new Date(date + 'T06:00:00Z').getTime() + 24 * 60 * 60 * 1000)
            );

            const trUEP = (uepRecords.length / 24) * 100;
            console.log(`UEP ${uep.name}, Records: ${uepRecords.length}, TR: ${trUEP}`);
            return sum + trUEP;
        }, 0);

        const avgTR = parseFloat((totalTR / (uepsInDept.length || 1)).toFixed(3));
        console.log(`Department: ${dept.name}, Total TR for ${date}: ${totalTR}, Avg TR: ${avgTR}`);

        return {
            name: dept.name,
            value: avgTR
        };
    });
}
function prepareChart4(startDate, records, ueps, departments) {
    const weeks = [];
    const start = new Date(startDate);
    const dayOfWeek = start.getDay();
    const distanceToMonday = (dayOfWeek === 0 ? 6 : dayOfWeek - 1);
    start.setDate(start.getDate() - distanceToMonday);
    start.setHours(6, 0, 0, 0);
    for (let i = 0; i < 4; i++) {
        const weekStart = new Date(start);
        weekStart.setDate(start.getDate() - (i * 7));
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 7);
        weekEnd.setHours(6, 0, 0, 0);
        const weekData = {
            week: `Semaine ${i + 1}`,
            data: departments.map(dept => {
                const production = records
                    .filter(record => new Date(record.hour) >= weekStart && new Date(record.hour) < weekEnd && ueps.find(uep => uep.id === record.uep && uep.department === dept.id))
                    .reduce((sum, record) => sum + record.number_of_products, 0);

                return {
                    name: dept.name,
                    value: production
                };
            })
        };

        console.log(`Records for ${weekData.week}:`);
        records.forEach(record => {
            const recordDate = new Date(record.hour);
            if (recordDate >= weekStart && recordDate < weekEnd) {
                console.log(`Record ID: ${record.id}, Date: ${recordDate.toISOString()}, Dept: ${departments.find(dept => dept.id === ueps.find(uep => uep.id === record.uep).department)?.name || "Unknown"}, UEP: ${ueps.find(uep => uep.id === record.uep)?.name || "Unknown"}, Production: ${record.number_of_products}`);
            }
        });

        weeks.push(weekData);
    }

    return weeks;
}
function calculateROweek(uepProduction, theoTarget) {
    const targett = (theoTarget * 7 * 7 + Math.ceil(7 * 37 * theoTarget / 60) * 3);
    const ro = (uepProduction / targett) * 100;
    console.log(`Calculated weekly RO: ${ro}% for production ${uepProduction} and target ${theoTarget} and weekly target ${targett}`);
    return ro;
}
function prepareChart5(weekStart, records, ueps, departments, targetMap) {
    return departments.map(dept => {
        const uepsInDept = ueps.filter(uep => uep.department === dept.id);
        const totalRO = uepsInDept.reduce((sum, uep) => {
            const uepProduction = records
                .filter(record => record.uep === uep.id && new Date(record.hour) >= new Date(weekStart + 'T06:00:00Z') && new Date(record.hour) < new Date(new Date(weekStart + 'T06:00:00Z').getTime() + 7 * 24 * 60 * 60 * 1000)) // Filter for 06:00 week start to 06:00 next week start
                .reduce((acc, record) => acc + record.number_of_products, 0);

            const theoTarget = 33; // Fetch the correct theoretical_goal value
            console.log(`UEP ${uep.name} in department ${dept.name} produced ${uepProduction} units in week starting ${weekStart} with theoTarget ${theoTarget}.`);
            return sum + calculateROweek(uepProduction, theoTarget);
        }, 0);

        const avgRO = parseFloat((totalRO / (uepsInDept.length || 1)).toFixed(3));
        console.log(`Department ${dept.name} average RO for week starting ${weekStart}: ${avgRO}%`);
        return {
            name: dept.name,
            value: avgRO,
            itemStyle: {
                color: getROColor(dept.name)
            }
        };
    });
}
function prepareChart6(weekStart, records, ueps, departments) {
    return departments.map(dept => {
        const uepsInDept = ueps.filter(uep => uep.department === dept.id);

        const totalTR = uepsInDept.reduce((sum, uep) => {
            const uepRecords = records.filter(record =>
                record.uep === uep.id &&
                new Date(record.hour) >= new Date(weekStart + 'T06:00:00Z') &&
                new Date(record.hour) < new Date(new Date(weekStart + 'T06:00:00Z').getTime() + 7 * 24 * 60 * 60 * 1000)
            );

            const trUEP = (uepRecords.length / (7 * 24)) * 100;
            console.log(`UEP ${uep.name}, Records: ${uepRecords.length}, TR: ${trUEP}`);
            return sum + trUEP;
        }, 0);

        const avgTR = parseFloat((totalTR / (uepsInDept.length || 1)).toFixed(3));
        console.log(`Department: ${dept.name}, Total TR for week starting ${weekStart}: ${totalTR}, Avg TR: ${avgTR}`);

        return {
            name: dept.name,
            value: avgTR
        };
    });
}
function prepareChart7(dateRange, records, ueps, departments) {
    const departmentProduction = {};
    dateRange.forEach(date => {
        departmentProduction[date] = {};
        departments.forEach(dept => {
            departmentProduction[date][dept.id] = 0;
        });
    });
    records.forEach(record => {
        const recordDate = new Date(record.hour);
        const recordDateStr = recordDate.toISOString().slice(0, 10);

        if (dateRange.includes(recordDateStr)) {
            const uep = ueps.find(uep => uep.id === record.uep);
            if (uep) {
                departmentProduction[recordDateStr][uep.department] += record.number_of_products;
            }
        }
    });
    const seriesData = departments.map(dept => ({
        name: dept.name,
        type: 'line',
        data: dateRange.map(date => departmentProduction[date][dept.id] || 0),
        labelLayout: {
            moveOverlap: 'shiftY'
        },
        emphasis: {
            focus: 'series',
            blurScope: 'coordinateSystem'
        }
    }));

    return seriesData;
}
function prepareChart8(dateRange, records, ueps, departments, targetMap) {
    return departments.map(dept => {
        const uepsInDept = ueps.filter(uep => uep.department === dept.id);
        const totalRO = uepsInDept.reduce((sum, uep) => {
            const uepProduction = records
                .filter(record => {
                    const recordDate = new Date(record.hour);
                    return record.uep === uep.id && dateRange.some(date => {
                        const dateObj = new Date(date + 'T06:00:00Z');
                        return recordDate >= dateObj && recordDate < new Date(dateObj.getTime() + 24 * 60 * 60 * 1000);
                    });
                })
                .reduce((acc, record) => acc + record.number_of_products, 0);

            const theoTarget = 33;// Fetch the correct theoretical_goal value
            console.log(`UEP ${uep.name} in department ${dept.name} produced ${uepProduction} units over month with theoTarget ${theoTarget}.`);
            return sum + calculateROweek(uepProduction, theoTarget);
        }, 0);

        const avgRO = parseFloat((totalRO / (uepsInDept.length || 1)).toFixed(3));
        console.log(`Department ${dept.name} average RO over month: ${avgRO}%`);
        return {
            name: dept.name,
            value: avgRO,
            itemStyle: {
                color: getROColor(dept.name)
            }
        };
    });
}
function prepareChart9(dateRange, records, ueps, departments) {
    return departments.map(dept => {
        const uepsInDept = ueps.filter(uep => uep.department === dept.id);

        const totalTR = uepsInDept.reduce((sum, uep) => {
            const uepRecords = records.filter(record =>
                record.uep === uep.id &&
                dateRange.some(date => {
                    const dateObj = new Date(date + 'T06:00:00Z');
                    const recordDate = new Date(record.hour);
                    return recordDate >= dateObj && recordDate < new Date(dateObj.getTime() + 24 * 60 * 60 * 1000);
                })
            );

            const trUEP = (uepRecords.length / (dateRange.length * 24)) * 100;
            console.log(`UEP ${uep.name}, Records: ${uepRecords.length}, TR: ${trUEP}`);
            return sum + trUEP;
        }, 0);

        const avgTR = parseFloat((totalTR / (uepsInDept.length || 1)).toFixed(3));
        console.log(`Department: ${dept.name}, Total TR over month: ${totalTR}, Avg TR: ${avgTR}`);

        return {
            name: dept.name,
            value: avgTR
        };
    });
}
document.addEventListener('DOMContentLoaded', function () {
    // Fetch required data
    fetchData('departments', departments => {
        fetchData('ueps', ueps => {
            fetchData('records', records => {
                const targetMap = {}; // Populate this with your actual data
                const today = new Date().toISOString().slice(0, 10);

                // Prepare chart data
                const chart1Data = prepareChart1(generateDateRange(today, 30), records, ueps, departments);
                const chart2Data = prepareChart2(today, records, ueps, departments, targetMap);
                const chart3Data = prepareChart3(today, records, ueps, departments);
                const chart4Data = prepareChart4(today, records, ueps, departments);
                const chart5Data = prepareChart5(today, records, ueps, departments, targetMap);
                const chart6Data = prepareChart6(today, records, ueps, departments);
                const chart7Data = prepareChart7(generateDateRange(today, 30), records, ueps, departments);
                const chart8Data = prepareChart8(generateDateRange(today, 30), records, ueps, departments, targetMap);
                const chart9Data = prepareChart9(generateDateRange(today, 30), records, ueps, departments);

                // Initialize ECharts instances and set options with the prepared data
                const charts = [
                    { id: 'chart1', data: chart1Data, option: getLineChartOption('Department Production Over 30 Days', generateDateRange(today, 30), chart1Data) },
                    { id: 'chart2', data: chart2Data, option: getPieChartOption('RO for Today by Department', chart2Data) },
                    { id: 'chart3', data: chart3Data, option: getPieChartOption('TR for Today by Department', chart3Data) },
                    { id: 'chart4', data: chart4Data, option: getBarChartOption('Weekly Production by Department', ['Semaine 1', 'Semaine 2', 'Semaine 3', 'Semaine 4'], chart4Data) },
                    { id: 'chart5', data: chart5Data, option: getPieChartOption('Weekly RO by Department', chart5Data) },
                    { id: 'chart6', data: chart6Data, option: getPieChartOption('Weekly TR by Department', chart6Data) },
                    { id: 'chart7', data: chart7Data, option: getLineChartOption('Department Production Over 30 Days', generateDateRange(today, 30), chart7Data) },
                    { id: 'chart8', data: chart8Data, option: getPieChartOption('Monthly RO by Department', chart8Data) },
                    { id: 'chart9', data: chart9Data, option: getPieChartOption('Monthly TR by Department', chart9Data) }
                ];

                charts.forEach(({ id, option }) => {
                    const chart = echarts.init(document.getElementById(id));
                    chart.setOption(option);
                });

                // Modal chart display logic
                setupModalChartDisplay();
            });
        });
    });

    function getLineChartOption(title, xAxisData, seriesData) {
        return {
            title: { text: title },
            tooltip: { trigger: 'axis' },
            xAxis: { type: 'category', data: xAxisData },
            yAxis: { type: 'value' },
            series: seriesData
        };
    }

    function getPieChartOption(title, seriesData) {
        return {
            title: { text: title },
            tooltip: { trigger: 'item' },
            series: [{
                type: 'pie',
                radius: '50%',
                data: seriesData,
                emphasis: { itemStyle: { shadowBlur: 10, shadowOffsetX: 0, shadowColor: 'rgba(0, 0, 0, 0.5)' } }
            }]
        };
    }

    function getBarChartOption(title, xAxisData, seriesData) {
        return {
            title: { text: title },
            tooltip: { trigger: 'axis' },
            xAxis: { type: 'category', data: xAxisData },
            yAxis: { type: 'value' },
            series: seriesData.map(weekData => ({
                name: weekData.week,
                type: 'bar',
                data: weekData.data.map(dept => dept.value)
            }))
        };
    }


});
