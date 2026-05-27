import { useEffect, useState } from 'react';
import { Gauge, Loader, BarChart3 } from 'lucide-react';

interface ModelMetric {
  name: string;
  version: string;
  inference_count: number;
  execution_count: number;
  avg_compute_ns: number;
  avg_queue_ns: number;
  memory_usage: { type: string; id: number; byte_size: number }[];
}

export default function MetricsPage() {
  const [metrics, setMetrics] = useState<ModelMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchMetrics = async () => {
    setLoading(true);
    setError('');
    try {
      const resp = await fetch('/mcp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method: 'tools/call', params: { name: 'get_server_metrics', arguments: {} } }),
      });
      const data = await resp.json();
      if (data.content?.[0]?.text) {
        const parsed = JSON.parse(data.content[0].text);
        setMetrics(parsed.data?.models || []);
      }
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchMetrics(); }, []);

  const formatBytes = (bytes: number) => {
    if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(1)} GB`;
    if (bytes >= 1e6) return `${(bytes / 1e6).toFixed(1)} MB`;
    if (bytes >= 1e3) return `${(bytes / 1e3).toFixed(1)} KB`;
    return `${bytes} B`;
  };

  const formatNs = (ns: number) => {
    if (ns >= 1e9) return `${(ns / 1e9).toFixed(1)} s`;
    if (ns >= 1e6) return `${(ns / 1e6).toFixed(1)} ms`;
    if (ns >= 1e3) return `${(ns / 1e3).toFixed(1)} μs`;
    return `${ns} ns`;
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Server Metrics</h1>
        <button onClick={fetchMetrics} className="text-sm bg-cyan-600 hover:bg-cyan-500 px-3 py-1 rounded">
          Refresh
        </button>
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-gray-400 mb-4">
          <Loader size={16} className="animate-spin" /> Loading metrics...
        </div>
      )}
      {error && <div className="text-red-400 text-sm mb-4">Error: {error}</div>}

      <div className="space-y-4">
        {metrics.map((m, i) => (
          <div key={i} className="bg-gray-900 border border-gray-800 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <BarChart3 size={16} className="text-cyan-400" />
              <span className="font-mono font-semibold">{m.name}</span>
              <span className="text-xs text-gray-500">v{m.version}</span>
            </div>
            <div className="grid grid-cols-4 gap-4 text-sm">
              <div>
                <div className="text-gray-500">Inferences</div>
                <div className="font-mono">{m.inference_count.toLocaleString()}</div>
              </div>
              <div>
                <div className="text-gray-500">Avg Compute</div>
                <div className="font-mono">{formatNs(m.avg_compute_ns)}</div>
              </div>
              <div>
                <div className="text-gray-500">Avg Queue</div>
                <div className="font-mono">{formatNs(m.avg_queue_ns)}</div>
              </div>
              <div>
                <div className="text-gray-500">Memory</div>
                <div className="font-mono">
                  {m.memory_usage?.map((mu, j) => (
                    <span key={j} className="block">{mu.type}: {formatBytes(mu.byte_size)}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}
        {!loading && metrics.length === 0 && (
          <div className="text-center text-gray-500 py-8">
            No metrics available. Run some inferences first.
          </div>
        )}
      </div>
    </div>
  );
}
