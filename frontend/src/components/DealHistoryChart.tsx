import React, { useState, useEffect, useMemo } from 'react';
import { API_BASE_URL } from '../config';

interface HistoryEntry {
  id: number;
  gameId: number;
  price: number;
  originalPrice: number | null;
  discount: number;
  savings: number;
  isActive: boolean;
  recordedAt: string;
}

interface HistoryStats {
  minPrice: number | null;
  maxPrice: number | null;
  avgPrice: number | null;
  maxDiscount: number;
  avgDiscount: number;
  maxSavings: number;
  totalRecords: number;
}

interface DealHistoryData {
  gameId: number;
  gameTitle: string;
  currentPrice: number;
  originalPrice: number;
  currentDiscount: number;
  history: HistoryEntry[];
  stats: HistoryStats;
  dateRange: {
    start: string;
    end: string;
  };
}

interface DealHistoryChartProps {
  gameId: number;
  className?: string;
}

type TimeRange = '7d' | '30d' | '90d' | '1y' | 'all';

const DealHistoryChart: React.FC<DealHistoryChartProps> = ({ gameId, className = '' }) => {
  const [data, setData] = useState<DealHistoryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<TimeRange>('30d');
  const [viewMode, setViewMode] = useState<'price' | 'discount'>('price');

  const getDateRange = (range: TimeRange): { start: Date; end: Date } => {
    const end = new Date();
    const start = new Date();
    
    switch (range) {
      case '7d':
        start.setDate(end.getDate() - 7);
        break;
      case '30d':
        start.setDate(end.getDate() - 30);
        break;
      case '90d':
        start.setDate(end.getDate() - 90);
        break;
      case '1y':
        start.setFullYear(end.getFullYear() - 1);
        break;
      case 'all':
        start.setFullYear(2020); // Far enough back
        break;
    }
    
    return { start, end };
  };

  useEffect(() => {
    const fetchHistory = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const { start, end } = getDateRange(timeRange);
        const params = new URLSearchParams({
          start_date: start.toISOString(),
          end_date: end.toISOString()
        });
        
        const response = await fetch(`${API_BASE_URL}/api/products/${gameId}/history?${params}`);
        if (!response.ok) {
          throw new Error('Failed to fetch history');
        }
        const historyData = await response.json();
        setData(historyData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [gameId, timeRange]);

  // Calculate chart dimensions and data points
  const chartData = useMemo(() => {
    if (!data || data.history.length === 0) return null;

    const history = data.history;
    const values = viewMode === 'price' 
      ? history.map(h => h.price)
      : history.map(h => h.discount);
    
    const minVal = Math.min(...values);
    const maxVal = Math.max(...values);
    const range = maxVal - minVal || 1;
    
    // Add padding
    const paddedMin = viewMode === 'price' ? Math.max(0, minVal - range * 0.1) : 0;
    const paddedMax = viewMode === 'discount' ? 100 : maxVal + range * 0.1;
    const paddedRange = paddedMax - paddedMin;

    return {
      points: history.map((h, i) => ({
        x: (i / (history.length - 1 || 1)) * 100,
        y: ((values[i] - paddedMin) / paddedRange) * 100,
        value: values[i],
        date: new Date(h.recordedAt),
        isActive: h.isActive,
        savings: h.savings,
        original: h.originalPrice
      })),
      minVal: paddedMin,
      maxVal: paddedMax,
      history
    };
  }, [data, viewMode]);

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const formatValue = (val: number) => {
    return viewMode === 'price' ? `$${val.toFixed(2)}` : `${val}%`;
  };

  if (loading) {
    return (
      <div className={`bg-gray-900 rounded-lg p-6 ${className}`}>
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-gray-900 rounded-lg p-6 ${className}`}>
        <div className="text-center text-red-400 py-8">
          <p>Failed to load price history</p>
          <p className="text-sm text-gray-500 mt-2">{error}</p>
        </div>
      </div>
    );
  }

  if (!data || data.history.length === 0) {
    return (
      <div className={`bg-gray-900 rounded-lg p-6 ${className}`}>
        <h3 className="text-lg font-bold text-white mb-4">Price History</h3>
        <div className="text-center text-gray-400 py-8">
          <svg className="w-12 h-12 mx-auto mb-3 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <p>No price history available yet</p>
          <p className="text-sm text-gray-500 mt-1">History will be recorded as deals are tracked</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-gray-900 rounded-lg p-6 ${className}`}>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <h3 className="text-lg font-bold text-white">Price History</h3>
        
        <div className="flex items-center gap-4">
          {/* View Mode Toggle */}
          <div className="flex bg-gray-800 rounded-lg p-1">
            <button
              onClick={() => setViewMode('price')}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                viewMode === 'price' 
                  ? 'bg-red-600 text-white' 
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Price
            </button>
            <button
              onClick={() => setViewMode('discount')}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                viewMode === 'discount' 
                  ? 'bg-red-600 text-white' 
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Discount %
            </button>
          </div>
          
          {/* Time Range Selector */}
          <div className="flex bg-gray-800 rounded-lg p-1">
            {(['7d', '30d', '90d', '1y', 'all'] as TimeRange[]).map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-3 py-1 text-sm rounded-md transition-colors ${
                  timeRange === range 
                    ? 'bg-red-600 text-white' 
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {range === 'all' ? 'All' : range.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gray-800 rounded-lg p-3">
          <p className="text-gray-400 text-xs uppercase">Lowest Price</p>
          <p className="text-green-400 font-bold text-lg">
            {data.stats.minPrice !== null ? `$${data.stats.minPrice.toFixed(2)}` : 'N/A'}
          </p>
        </div>
        <div className="bg-gray-800 rounded-lg p-3">
          <p className="text-gray-400 text-xs uppercase">Highest Price</p>
          <p className="text-red-400 font-bold text-lg">
            {data.stats.maxPrice !== null ? `$${data.stats.maxPrice.toFixed(2)}` : 'N/A'}
          </p>
        </div>
        <div className="bg-gray-800 rounded-lg p-3">
          <p className="text-gray-400 text-xs uppercase">Best Discount</p>
          <p className="text-yellow-400 font-bold text-lg">{data.stats.maxDiscount}%</p>
        </div>
        <div className="bg-gray-800 rounded-lg p-3">
          <p className="text-gray-400 text-xs uppercase">Max Savings</p>
          <p className="text-green-400 font-bold text-lg">${data.stats.maxSavings.toFixed(2)}</p>
        </div>
      </div>

      {/* Chart */}
      {chartData && (
        <div className="relative h-64 bg-gray-800 rounded-lg p-4">
          {/* Y-axis labels */}
          <div className="absolute left-0 top-4 bottom-4 w-12 flex flex-col justify-between text-xs text-gray-500">
            <span>{formatValue(chartData.maxVal)}</span>
            <span>{formatValue((chartData.maxVal + chartData.minVal) / 2)}</span>
            <span>{formatValue(chartData.minVal)}</span>
          </div>
          
          {/* Chart area */}
          <div className="ml-14 h-full relative">
            <svg 
              className="w-full h-full" 
              viewBox="0 0 100 100" 
              preserveAspectRatio="none"
            >
              {/* Grid lines */}
              <line x1="0" y1="0" x2="100" y2="0" stroke="#374151" strokeWidth="0.5" />
              <line x1="0" y1="50" x2="100" y2="50" stroke="#374151" strokeWidth="0.5" strokeDasharray="2,2" />
              <line x1="0" y1="100" x2="100" y2="100" stroke="#374151" strokeWidth="0.5" />
              
              {/* Area fill */}
              <path
                d={`M 0 100 ${chartData.points.map(p => `L ${p.x} ${100 - p.y}`).join(' ')} L 100 100 Z`}
                fill={viewMode === 'price' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(34, 197, 94, 0.2)'}
              />
              
              {/* Line */}
              <path
                d={`M ${chartData.points.map(p => `${p.x} ${100 - p.y}`).join(' L ')}`}
                fill="none"
                stroke={viewMode === 'price' ? '#ef4444' : '#22c55e'}
                strokeWidth="2"
                vectorEffect="non-scaling-stroke"
              />
              
              {/* Data points */}
              {chartData.points.map((point, i) => (
                <g key={i}>
                  <circle
                    cx={point.x}
                    cy={100 - point.y}
                    r="1.5"
                    fill={point.isActive ? (viewMode === 'price' ? '#ef4444' : '#22c55e') : '#6b7280'}
                    className="cursor-pointer hover:r-3 transition-all"
                  >
                    <title>
                      {formatDate(point.date)}: {formatValue(point.value)}
                      {viewMode === 'price' && point.savings > 0 ? ` (Save $${point.savings.toFixed(2)})` : ''}
                      {!point.isActive ? ' (Inactive)' : ''}
                    </title>
                  </circle>
                </g>
              ))}
            </svg>
            
            {/* X-axis labels */}
            <div className="absolute bottom-0 left-0 right-0 flex justify-between text-xs text-gray-500 transform translate-y-5">
              {chartData.points.length > 0 && (
                <>
                  <span>{formatDate(chartData.points[0].date)}</span>
                  {chartData.points.length > 2 && (
                    <span>{formatDate(chartData.points[Math.floor(chartData.points.length / 2)].date)}</span>
                  )}
                  <span>{formatDate(chartData.points[chartData.points.length - 1].date)}</span>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Current Deal Info */}
      <div className="mt-6 p-4 bg-gray-800 rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-gray-400 text-sm">Current Price</p>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-red-500">
                ${data.currentPrice?.toFixed(2) || '0.00'}
              </span>
              {data.originalPrice && data.currentDiscount > 0 && (
                <>
                  <span className="text-gray-500 line-through">
                    ${data.originalPrice.toFixed(2)}
                  </span>
                  <span className="bg-green-600 text-white text-xs px-2 py-1 rounded">
                    -{data.currentDiscount}%
                  </span>
                </>
              )}
            </div>
          </div>
          <div className="text-right">
            <p className="text-gray-400 text-sm">You Save</p>
            <p className="text-xl font-bold text-green-400">
              ${((data.originalPrice || 0) - (data.currentPrice || 0)).toFixed(2)}
            </p>
          </div>
        </div>
      </div>

      {/* History Table (collapsed by default) */}
      <details className="mt-4">
        <summary className="cursor-pointer text-gray-400 hover:text-white transition-colors text-sm">
          View {data.history.length} price record{data.history.length !== 1 ? 's' : ''}
        </summary>
        <div className="mt-3 max-h-48 overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="text-gray-400 text-xs uppercase sticky top-0 bg-gray-900">
              <tr>
                <th className="text-left py-2">Date</th>
                <th className="text-right py-2">Price</th>
                <th className="text-right py-2">Discount</th>
                <th className="text-right py-2">Savings</th>
                <th className="text-center py-2">Status</th>
              </tr>
            </thead>
            <tbody className="text-gray-300">
              {[...data.history].reverse().map((entry) => (
                <tr key={entry.id} className="border-t border-gray-800">
                  <td className="py-2">
                    {new Date(entry.recordedAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </td>
                  <td className="text-right py-2">${entry.price.toFixed(2)}</td>
                  <td className="text-right py-2 text-yellow-400">{entry.discount}%</td>
                  <td className="text-right py-2 text-green-400">${entry.savings.toFixed(2)}</td>
                  <td className="text-center py-2">
                    {entry.isActive ? (
                      <span className="text-green-400">●</span>
                    ) : (
                      <span className="text-gray-500">○</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
};

export default DealHistoryChart;
