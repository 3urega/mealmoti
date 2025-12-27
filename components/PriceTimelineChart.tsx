'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface TimelineDataPoint {
  date: string;
  price: number;
  article: {
    id: string;
    name: string;
    brand: string;
  };
  store: {
    id: string;
    name: string;
  } | null;
  quantity: number;
}

interface PriceTimelineChartProps {
  data: TimelineDataPoint[];
  showMonthlyAverage?: boolean;
}

export default function PriceTimelineChart({
  data,
  showMonthlyAverage = false,
}: PriceTimelineChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-lg border border-gray-200 bg-gray-50">
        <p className="text-sm text-gray-500">No hay datos para mostrar</p>
      </div>
    );
  }

  // Agrupar por artículo para diferentes líneas
  const articlesMap = new Map<string, TimelineDataPoint[]>();
  data.forEach((point) => {
    const articleKey = point.article.id;
    if (!articlesMap.has(articleKey)) {
      articlesMap.set(articleKey, []);
    }
    articlesMap.get(articleKey)!.push(point);
  });

  // Preparar datos para el gráfico
  const chartData: any[] = [];
  const dateMap = new Map<string, any>();

  data.forEach((point) => {
    const date = new Date(point.date).toLocaleDateString('es-ES', {
      month: 'short',
      day: 'numeric',
    });
    if (!dateMap.has(date)) {
      dateMap.set(date, { date });
    }
    const dateData = dateMap.get(date);
    const articleKey = `price_${point.article.id}`;
    dateData[articleKey] = point.price;
    dateData[`article_${point.article.id}`] = `${point.article.brand} ${point.article.name}`;
  });

  chartData.push(...Array.from(dateMap.values()));

  // Colores para diferentes artículos
  const colors = [
    '#3b82f6', // blue
    '#10b981', // green
    '#f59e0b', // amber
    '#ef4444', // red
    '#8b5cf6', // purple
    '#06b6d4', // cyan
  ];

  const articleKeys = Array.from(articlesMap.keys());

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="rounded-lg border border-gray-200 bg-white p-3 shadow-lg">
          <p className="mb-2 font-semibold">{label}</p>
          {payload.map((entry: any, index: number) => {
            const articleId = entry.dataKey.replace('price_', '');
            const articleName = entry.payload[`article_${articleId}`] || 'Artículo';
            return (
              <p key={index} style={{ color: entry.color }} className="text-sm">
                {articleName}: {entry.value?.toFixed(2)} €
              </p>
            );
          })}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={400}>
        <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="date"
            angle={-45}
            textAnchor="end"
            height={80}
            interval="preserveStartEnd"
          />
          <YAxis
            label={{ value: 'Precio (€)', angle: -90, position: 'insideLeft' }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          {articleKeys.map((articleId, index) => (
            <Line
              key={articleId}
              type="monotone"
              dataKey={`price_${articleId}`}
              name={chartData[0]?.[`article_${articleId}`] || `Artículo ${index + 1}`}
              stroke={colors[index % colors.length]}
              strokeWidth={2}
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

