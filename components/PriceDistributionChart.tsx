'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface DistributionData {
  range: string;
  count: number;
}

interface PriceDistributionChartProps {
  data: DistributionData[];
}

export default function PriceDistributionChart({
  data,
}: PriceDistributionChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-lg border border-gray-200 bg-gray-50">
        <p className="text-sm text-gray-500">No hay datos para mostrar</p>
      </div>
    );
  }

  // Preparar datos para el gráfico
  const chartData = data.map((item) => ({
    range: item.range,
    'Frecuencia': item.count,
  }));

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="rounded-lg border border-gray-200 bg-white p-3 shadow-lg">
          <p className="mb-1 font-semibold">Rango: {data.range} €</p>
          <p className="text-sm text-blue-600">
            Frecuencia: {data.Frecuencia} {data.Frecuencia === 1 ? 'vez' : 'veces'}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={300}>
        <BarChart
          data={chartData}
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="range"
            label={{ value: 'Rango de Precios (€)', position: 'insideBottom', offset: -5 }}
          />
          <YAxis label={{ value: 'Frecuencia', angle: -90, position: 'insideLeft' }} />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="Frecuencia" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

