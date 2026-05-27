import { useEffect, useState } from 'react';
import { Boxes, CheckCircle, XCircle, AlertTriangle, Loader } from 'lucide-react';

interface Model {
  name: string;
  version: string;
  state: string;
}

export default function ModelsPage() {
  const [models, setModels] = useState<Model[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchModels = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/v1/tools');
      setLoading(false);
    } catch {
      setLoading(false);
    }
    try {
      const resp = await fetch('/mcp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method: 'tools/call', params: { name: 'list_models', arguments: {} } }),
      });
      const data = await resp.json();
      if (data.content?.[0]?.text) {
        const parsed = JSON.parse(data.content[0].text);
        setModels(parsed.data?.models || []);
      }
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchModels(); }, []);

  const stateIcon = (state: string) => {
    switch (state) {
      case 'READY': return <CheckCircle size={14} className="text-emerald-400" />;
      case 'UNAVAILABLE': return <XCircle size={14} className="text-red-400" />;
      default: return <AlertTriangle size={14} className="text-amber-400" />;
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Models</h1>
        <button onClick={fetchModels} className="text-sm bg-cyan-600 hover:bg-cyan-500 px-3 py-1 rounded">
          Refresh
        </button>
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-gray-400">
          <Loader size={16} className="animate-spin" /> Loading models...
        </div>
      )}
      {error && <div className="text-red-400 text-sm mb-4">Error: {error}</div>}

      <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800 text-gray-400 text-left">
              <th className="p-3">Name</th>
              <th className="p-3">Version</th>
              <th className="p-3">State</th>
            </tr>
          </thead>
          <tbody>
            {models.map((m, i) => (
              <tr key={i} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                <td className="p-3 font-mono flex items-center gap-2">
                  <Boxes size={14} className="text-cyan-400" /> {m.name}
                </td>
                <td className="p-3 text-gray-400">{m.version}</td>
                <td className="p-3 flex items-center gap-1">{stateIcon(m.state)} {m.state}</td>
              </tr>
            ))}
            {!loading && models.length === 0 && (
              <tr>
                <td colSpan={3} className="p-6 text-center text-gray-500">
                  No models found. Ensure Triton server is reachable at localhost:8001.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
