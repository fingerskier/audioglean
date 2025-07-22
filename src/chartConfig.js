const KEYS = [ 'A', 'A#', 'B', 'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#'];

const PITCH_CLASS_COLORS = {
    'C': 210, 
    'C#': 240, 
    'D': 270, 
    'D#': 300, 
    'E': 330, 
    'F': 0, 
    'F#': 30, 
    'G': 60, 
    'G#': 90, 
    'A': 120, 
    'A#': 150, 
    'B': 180
};

const OCTAVES = [2, 3, 4, 5, 6];

const canvas = document.getElementById("chroma-chart");

const CHART_CONFIG = {
    type: 'doughnut',
    data: {
        labels: KEYS,
        datasets: [
            {
                // hpcp intensity ring
                data: Array(12).fill(1),
                backgroundColor: KEYS.map(k => `hsl(${PITCH_CLASS_COLORS[k]}, 0%, 25%)`),
                borderAlign: 'inner'
            },
            ...OCTAVES.map(() => ({
                data: Array(12).fill(1),
                backgroundColor: Array(12).fill('rgba(0,0,0,0.1)'),
                borderAlign: 'inner'
            }))
        ]
    },
    options: {
        legend: {
            display: false
        },
        responsive: true,
        onResize: function(chart, size) {
            chart.options.plugins.datalabels.offset = 0.04*size.width;
            chart.update();
        },
        title: {
            display: false
        },
        cutoutPercentage: 30,
        animation: {
            animateRotate: false,
            animateScale: true
        },
        tooltips: {
            enabled: false
        },
        plugins: {
            datalabels: {
                color: "#fff",
                formatter: function(value, context) {
                    return context.chart.data.labels[context.dataIndex];
                },
                anchor: 'center',
                align: 'end',
                offset: function(context) {
                    context.chart.options.plugins.datalabels.offset = 0.04*context.chart.width;
                    context.chart.update();
                },
                font: {
                    size: 16
                }
            }
        }
    }
}