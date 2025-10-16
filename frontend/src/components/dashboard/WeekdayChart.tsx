'use client';

import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ChartOptions,
} from 'chart.js';
import { WeekdayDistribution } from '@/types/stats';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface WeekdayChartProps {
  distribution: WeekdayDistribution[];
}

export default function WeekdayChart({ distribution }: WeekdayChartProps) {
  const dayNames = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];
  
  // Ensure we have data for all days of the week
  const weekdayData = dayNames.map((dayName, index) => {
    const dayData = distribution.find(d => d.dayOfWeek === index + 1);
    return dayData ? dayData.count : 0;
  });

  const chartData = {
    labels: dayNames,
    datasets: [
      {
        label: 'Buchungen',
        data: weekdayData,
        backgroundColor: 'rgba(236, 72, 153, 0.6)',
        borderColor: 'rgb(236, 72, 153)',
        borderWidth: 2,
      },
    ],
  };

  const options: ChartOptions<'bar'> = {
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
        text: 'Buchungen nach Wochentag',
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
        borderColor: '#ec4899',
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
        <Bar data={chartData} options={options} />
      </div>
    </div>
  );
}

