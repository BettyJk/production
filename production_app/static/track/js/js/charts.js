document.addEventListener('DOMContentLoaded', function () {
    fetch('/api/records/')
        .then(response => response.json())
        .then(data => {
            createCharts(data);
        })
        .catch(error => console.error('Error fetching data:', error));
});

function createCharts(data) {
    const theoricalGoal = 33;
    const numberOfProducts = data.reduce((sum, record) => sum + record.number_of_products, 0);
    const ro = numberOfProducts / (theoricalGoal * 8 + 21);
    const tr = data.length / 8;

    const roChart = echarts.init(document.getElementById('roChart'));
    const trChart = echarts.init(document.getElementById('trChart'));

    const roOption = {
        title: {
            text: 'RO: Number of Products Produced out of Theoretical Goal',
            left: 'center'
        },
        series: [
            {
                name: 'RO',
                type: 'pie',
                radius: '50%',
                data: [
                    { value: ro, name: 'Produced' },
                    { value: 1 - ro, name: 'Remaining' }
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

    const trOption = {
        title: {
            text: 'TR: Number of Cases Registered out of 8',
            left: 'center'
        },
        series: [
            {
                name: 'TR',
                type: 'pie',
                radius: '50%',
                data: [
                    { value: tr, name: 'Cases Registered' },
                    { value: 1 - tr, name: 'Remaining' }
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

    roChart.setOption(roOption);
    trChart.setOption(trOption);
}
