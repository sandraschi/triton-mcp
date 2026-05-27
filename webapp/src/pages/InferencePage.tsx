import { useState } from 'react';
import { Send, Loader } from 'lucide-react';

export default function InferencePage() {
  const [modelName, setModelName] = useState('');
  const [inputJson, setInputJson] = useState('{"input_0": [[1.0, 2.0, 3.0]]}');
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    setLoading(true);
    setError('');
    setResult(null);
    try {
      let parsed;
      try {
        parsed = JSON.parse(inputJson);
      } catch {
        setError('Invalid JSON input. Use format: {"tensor_name": [[values]]}');
        setLoading(false);
        return;
      }

      const resp = await fetch('/mcp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method: 'tools/call',
          params: { name: 'submit_inference', arguments: { model_name: modelName, input_data: parsed } },
        }),
      });
      const data = await resp.json();
      if (data.content?.[0]?.text) {
        setResult(data.content[0].text);
      } else {
        setResult(JSON.stringify(data, null, 2));
      }
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Inference</h1>
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 space-y-4 max-w-2xl">
        <div>
          <label className="block text-sm text-gray-400 mb-1">Model Name</label>
          <input
            type="text"
            value={modelName}
            onChange={(e) => setModelName(e.target.value)}
            placeholder="e.g. onnx_resnet50"
            className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm font-mono"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">Input Data (JSON)</label>
          <textarea
            value={inputJson}
            onChange={(e) => setInputJson(e.target.value)}
            rows={6}
            className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm font-mono"
          />
        </div>
        <button
          onClick={submit}
          disabled={loading || !modelName}
          className="flex items-center gap-2 bg-cyan-600 hover:bg-cyan-500 px-4 py-2 rounded text-sm disabled:opacity-50"
        >
          {loading ? <Loader size={14} className="animate-spin" /> : <Send size={14} />}
          Submit Inference
        </button>
        {error && <div className="text-red-400 text-sm">{error}</div>}
        {result && (
          <pre className="bg-gray-800 rounded p-3 text-xs font-mono text-gray-300 overflow-auto max-h-64">
            {result}
          </pre>
        )}
      </div>
    </div>
  );
}
