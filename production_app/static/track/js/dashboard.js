document.addEventListener('DOMContentLoaded', function() {
    const datePicker = document.getElementById('datepicker');
    const viewDayButton = document.getElementById('view-day');
    const viewWeekButton = document.getElementById('view-week');
    const viewMonthButton = document.getElementById('view-month');
    const viewYearButton = document.getElementById('view-year');

    // Initialize Flatpickr for date selection
    flatpickr(datePicker, {
        dateFormat: "Y-m-d",
        onChange: function(selectedDates, dateStr, instance) {
            // Trigger data fetch when the date changes
            fetchAndDisplayCharts('day', dateStr);
        }
    });

    // Event listeners for view buttons
    viewDayButton.addEventListener('click', function() {
        fetchAndDisplayCharts('day', datePicker.value);
    });

    viewWeekButton.addEventListener('click', function() {
        fetchAndDisplayCharts('week', datePicker.value);
    });

    viewMonthButton.addEventListener('click', function() {
        fetchAndDisplayCharts('month', datePicker.value);
    });

    viewYearButton.addEventListener('click', function() {
        fetchAndDisplayCharts('year', datePicker.value);
    });

    // Function to fetch data and display charts
    function fetchAndDisplayCharts(viewType, date) {
        const url = `/api/dashboard_data/?view=${viewType}&date=${date}`;
        fetch(url)
            .then(response => response.json())
            .then(data => {
                // Process data and render charts
                renderCharts(data);
            })
            .catch(error => console.error('Error fetching data:', error));
    }

    function renderCharts(data) {
        // Implement chart rendering logic here using a library like ECharts
        // Example: render a bar chart, pie chart, etc.
    }
});
