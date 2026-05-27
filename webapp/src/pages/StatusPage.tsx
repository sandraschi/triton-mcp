import { useEffect, useState } from 'react';
import { apiGet } from '../lib/api';
import { CheckCircle, XCircle, Loader } from 'lucide-react';

export default function StatusPage() {
  const [status, setStatus] = useState<Record<string, unknown> | null>(null);
  const [tritonMeta, setTritonMeta] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      apiGet('/api/v1/status'),
      (async () => {
        try {
          const resp = await fetch('/mcp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ method: 'tools/call', params: { name: 'triton_server_metadata', arguments: {} } }),
          });
          const data = await resp.json();
          if (data.content?.[0]?.text) {
            return JSON.parse(data.content[0].text);
          }
          return null;
        } catch {
          return null;
        }
      })(),
    ])
      .then(([s, meta]) => {
        setStatus(s);
        setTritonMeta(meta);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-gray-400">
        <Loader size={16} className="animate-spin" /> Loading status...
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Status</h1>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
          <h2 className="text-sm text-gray-400 mb-3">triton-mcp Server</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Version</span>
              <span className="font-mono">{String(status?.version || 'N/A')}</span>
            </div>
            <div className="flex justify-between">
              <span>Triton URL</span>
              <span className="font-mono">{String(status?.triton_url || 'N/A')}</span>
            </div>
            <div className="flex justify-between">
              <span>Uptime</span>
              <span className="font-mono">{Math.floor((Number(status?.uptime_s) || 0) / 60)}m</span>
            </div>
          </div>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
          <h2 className="text-sm text-gray-400 mb-3">Triton Inference Server</h2>
          {tritonMeta?.data ? (
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Name</span>
                <span className="font-mono">{String(tritonMeta.data.name)}</span>
              </div>
              <div className="flex justify-between">
                <span>Version</span>
                <span className="font-mono">{String(tritonMeta.data.version)}</span>
              </div>
              <div className="flex justify-between">
                <span>Status</span>
                <span className="flex items-center gap-1 text-emerald-400">
                  <CheckCircle size={14} /> Connected
                </span>
              </div>
            </div>
          ) : (
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Status</span>
                <span className="flex items-center gap-1 text-red-400">
                  <XCircle size={14} /> Not reachable
                </span>
              </div>
              <div className="text-xs text-gray-500 mt-2">
                Start Triton: docker run --gpus all -p8000:8000 -p8001:8001 nvcr.io/nvidia/tritonserver...
              </div>
            </div>
          )}
        </div>
      </div>

      {tritonMeta?.data?.extensions && (
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
          <h2 className="text-sm text-gray-400 mb-3">
            Server Extensions ({(tritonMeta.data.extensions as string[]).length})
          </h2>
          <div className="flex flex-wrap gap-2">
            {(tritonMeta.data.extensions as string[]).map((ext: string) => (
              <code key={ext} className="text-xs bg-gray-800 px-2 py-1 rounded text-gray-400">
                {ext}
              </code>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
