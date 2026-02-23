import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const HealthGraph = ({ readings }) => {
  const data = {
    labels: readings.map(r => new Date(r.timestamp).toLocaleDateString()),
    datasets: [
      {
        label: 'Systolic BP',
        data: readings.map(r => parseInt(r.value.split('/')[0]) || 0),
        borderColor: '#6d5dfc',
        backgroundColor: 'rgba(109, 93, 252, 0.1)',
        tension: 0.4, // Curved lines
        fill: true,
        pointRadius: 4,
        pointHoverRadius: 6,
      },
      {
        label: 'Diastolic BP',
        data: readings.map(r => parseInt(r.value.split('/')[1]) || 0),
        borderColor: '#ff6b6b',
        backgroundColor: 'rgba(255, 107, 107, 0.1)',
        tension: 0.4,
        fill: true,
        pointRadius: 4,
        pointHoverRadius: 6,
      }
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top' },
      tooltip: { mode: 'index', intersect: false },
    },
    scales: {
      y: { beginAtZero: false, grid: { display: false } },
      x: { grid: { display: false } }
    },
  };

  return (
    <div style={{ height: '300px', width: '100%' }}>
      <Line data={data} options={options} />
    </div>
  );
};

export default HealthGraph;
