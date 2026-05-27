import { useEffect, useState } from 'react';
import { Cog, Loader } from 'lucide-react';

interface Config {
  name: string;
  platform: string;
  max_batch_size: number;
  instance_count: number;
}

export default function ConfigPage() {
  const [configs, setConfigs] = useState<Config[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchConfigs = async () => {
    setLoading(true);
    setError('');
    try {
      const resp = await fetch('/mcp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method: 'tools/call', params: { name: 'list_model_configs', arguments: {} } }),
      });
      const data = await resp.json();
      if (data.content?.[0]?.text) {
        const parsed = JSON.parse(data.content[0].text);
        setConfigs(parsed.data?.configs || []);
      }
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchConfigs(); }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Model Configurations</h1>
        <button onClick={fetchConfigs} className="text-sm bg-cyan-600 hover:bg-cyan-500 px-3 py-1 rounded">
          Refresh
        </button>
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-gray-400">
          <Loader size={16} className="animate-spin" /> Loading configs...
        </div>
      )}
      {error && <div className="text-red-400 text-sm mb-4">Error: {error}</div>}

      <div className="grid grid-cols-2 gap-4">
        {configs.map((c, i) => (
          <div key={i} className="bg-gray-900 border border-gray-800 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <Cog size={16} className="text-cyan-400" />
              <span className="font-mono font-semibold">{c.name}</span>
            </div>
            <div className="space-y-2 text-sm text-gray-400">
              <div className="flex justify-between">
                <span>Platform</span>
                <span className="text-gray-300">{c.platform || 'unknown'}</span>
              </div>
              <div className="flex justify-between">
                <span>Max Batch Size</span>
                <span className="text-gray-300">{c.max_batch_size}</span>
              </div>
              <div className="flex justify-between">
                <span>Instances</span>
                <span className="text-gray-300">{c.instance_count}</span>
              </div>
            </div>
          </div>
        ))}
        {!loading && configs.length === 0 && (
          <div className="col-span-2 text-center text-gray-500 py-8">
            No configs found. Ensure models are loaded in Triton.
          </div>
        )}
      </div>
    </div>
  );
}
