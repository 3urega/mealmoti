'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';

interface ComparisonData {
  name: string;
  averagePrice: number;
  purchaseCount?: number;
  totalSpent?: number;
}

interface PriceComparisonChartProps {
  data: ComparisonData[];
  type: 'store' | 'article';
  showCount?: boolean;
}

export default function PriceComparisonChart({
  data,
  type,
  showCount = false,
}: PriceComparisonChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-lg border border-gray-200 bg-gray-50">
        <p className="text-sm text-gray-500">No hay datos para mostrar</p>
      </div>
    );
  }

  // Preparar datos para el gráfico
  const chartData = data.map((item) => ({
    name: item.name.length > 20 ? item.name.substring(0, 20) + '...' : item.name,
    fullName: item.name,
    'Precio Promedio': Math.round(item.averagePrice * 100) / 100,
    'Veces Comprado': item.purchaseCount || 0,
  }));

  // Ordenar por precio promedio (menor a mayor)
  chartData.sort((a, b) => a['Precio Promedio'] - b['Precio Promedio']);

  // Encontrar mejor y peor precio para colorear
  const minPrice = Math.min(...chartData.map((d) => d['Precio Promedio']));
  const maxPrice = Math.max(...chartData.map((d) => d['Precio Promedio']));

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="rounded-lg border border-gray-200 bg-white p-3 shadow-lg">
          <p className="mb-2 font-semibold">{data.fullName}</p>
          <p className="text-sm text-blue-600">
            Precio Promedio: {data['Precio Promedio'].toFixed(2)} €
          </p>
          {showCount && (
            <p className="text-sm text-gray-600">
              Veces Comprado: {data['Veces Comprado']}
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  // Función para determinar el color según el precio
  const getBarColor = (price: number) => {
    if (price === minPrice) return '#10b981'; // verde para mejor precio
    if (price === maxPrice) return '#ef4444'; // rojo para peor precio
    return '#3b82f6'; // azul para el resto
  };

  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={400}>
        <BarChart
          data={chartData}
          margin={{ top: 5, right: 30, left: 20, bottom: 60 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="name"
            angle={-45}
            textAnchor="end"
            height={100}
            interval={0}
          />
          <YAxis label={{ value: 'Precio (€)', angle: -90, position: 'insideLeft' }} />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          <Bar
            dataKey="Precio Promedio"
            radius={[4, 4, 0, 0]}
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={getBarColor(entry['Precio Promedio'])} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div className="mt-2 flex items-center justify-center gap-4 text-xs text-gray-600">
        <div className="flex items-center gap-1">
          <div className="h-3 w-3 rounded bg-green-500"></div>
          <span>Mejor precio</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="h-3 w-3 rounded bg-red-500"></div>
          <span>Peor precio</span>
        </div>
      </div>
    </div>
  );
}

