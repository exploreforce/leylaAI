'use client';

import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ChartOptions,
} from 'chart.js';
import { HourDistribution } from '@/types/stats';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface HourChartProps {
  distribution: HourDistribution[];
}

export default function HourChart({ distribution }: HourChartProps) {
  // Create labels for 24 hours (00:00 - 23:00)
  const hourLabels = Array.from({ length: 24 }, (_, i) => `${i.toString().padStart(2, '0')}:00`);
  
  // Ensure we have data for all 24 hours
  const hourData = Array.from({ length: 24 }, (_, hour) => {
    const hourEntry = distribution.find(d => d.hour === hour);
    return hourEntry ? hourEntry.count : 0;
  });

  const chartData = {
    labels: hourLabels,
    datasets: [
      {
        label: 'Buchungen',
        data: hourData,
        borderColor: 'rgb(147, 51, 234)',
        backgroundColor: 'rgba(147, 51, 234, 0.1)',
        tension: 0.4,
        fill: true,
      },
    ],
  };

  const options: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          color: '#9ca3af',
          font: {
            size: 12,
          },
        },
      },
      title: {
        display: true,
        text: 'Buchungen nach Uhrzeit',
        color: '#F3F4F6',
        font: {
          size: 16,
          weight: 'bold',
        },
      },
      tooltip: {
        backgroundColor: 'rgba(17, 24, 39, 0.9)',
        titleColor: '#ffffff',
        bodyColor: '#9ca3af',
        borderColor: '#9333ea',
        borderWidth: 1,
      },
    },
    scales: {
      x: {
        grid: {
          color: '#374151',
        },
        ticks: {
          color: '#9ca3af',
          maxTicksLimit: 12, // Show every other hour for better readability
        },
      },
      y: {
        grid: {
          color: '#374151',
        },
        ticks: {
          color: '#9ca3af',
        },
        beginAtZero: true,
      },
    },
  };

  return (
    <div className="bg-dark-800 rounded-lg p-6 border border-dark-700">
      <div style={{ height: '400px' }}>
        <Line data={chartData} options={options} />
      </div>
    </div>
  );
}

