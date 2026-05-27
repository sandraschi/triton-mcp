import { useState } from 'react';
import {
  BookOpen, Boxes, Cog, Cpu, ExternalLink, GitBranch, HelpCircle, Layers,
  Network, Send, Wrench,
} from 'lucide-react';

const sections = [
  { id: 'overview', label: 'Overview', icon: BookOpen },
  { id: 'setup', label: 'Setup', icon: Cpu },
  { id: 'architecture', label: 'Architecture', icon: GitBranch },
  { id: 'tools', label: 'Tools', icon: Wrench },
  { id: 'triton', label: 'Triton', icon: Layers },
  { id: 'models', label: 'Models', icon: Boxes },
  { id: 'fleet', label: 'Fleet', icon: Network },
  { id: 'api', label: 'API', icon: Cog },
];

export default function HelpPage() {
  const [tab, setTab] = useState('overview');
  return (
    <div className="max-w-4xl space-y-6">
      <h1 className="text-2xl font-bold text-white flex items-center gap-3">
        <HelpCircle className="text-cyan-400" /> Help & Reference
      </h1>
      <div className="flex flex-wrap gap-1.5 p-1 bg-white/10 rounded-2xl">
        {sections.map((s) => (
          <button
            key={s.id}
            onClick={() => setTab(s.id)}
            className={`px-3.5 py-2 rounded-xl text-sm font-bold uppercase tracking-wider transition-all ${
              tab === s.id
                ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-600/20'
                : 'text-slate-300 hover:text-slate-300'
            }`}
          >
            <s.icon size={13} className="inline mr-1.5" />
            {s.label}
          </button>
        ))}
      </div>
      <div className="bg-[#1e1e26] border border-white/10 rounded-2xl p-6 text-sm text-slate-400 leading-relaxed space-y-4">

        {tab === 'overview' && (
          <>
            <p><strong className="text-slate-200">Triton MCP</strong> is a FastMCP 3.2 server that gives LLM agents native control over NVIDIA Triton Inference Server. Instead of manual REST calls or script wrappers, agents inspect GPU utilization, hot-load/unload models, tune batch sizes mid-flight, and submit raw tensors to Triton's scheduler.</p>
            <p>The server communicates with Triton over <strong className="text-slate-200">gRPC (port 8001)</strong> using the official <code className="text-cyan-400">tritonclient</code> Python SDK. It exposes 12 MCP tools and a REST API for the web dashboard.</p>
            <p><strong className="text-amber-400">Not a GPU kernel compiler.</strong> This is infrastructure management — model repository manipulation, VRAM pooling, and server metrics. Zero <code className="text-cyan-400">@triton.jit</code> code.</p>
          </>
        )}

        {tab === 'setup' && (
          <>
            <p><strong className="text-slate-200">Prerequisites:</strong> Python 3.12+ (uv), Node.js 20+, and a running Triton Inference Server.</p>
            <div className="bg-black/30 rounded-xl p-4 font-mono text-sm space-y-1">
              <div><span className="text-emerald-400"># Bootstrap</span></div>
              <div>just bootstrap</div>
              <div><span className="text-emerald-400"># Start Triton (Docker)</span></div>
              <div>docker run --gpus all -p8000:8000 -p8001:8001 -p8002:8002 \</div>
              <div className="ml-4">-v C:\model_repo:/models \</div>
              <div className="ml-4">nvcr.io/nvidia/tritonserver:24.12-py3 \</div>
              <div className="ml-4">tritonserver --model-repository=/models</div>
              <div><span className="text-emerald-400"># Launch triton-mcp</span></div>
              <div>start.ps1</div>
            </div>
            <p><strong className="text-slate-200">Environment:</strong> Set <code className="text-cyan-400">TRITON_GRPC_URL</code> to point to your Triton instance (default: <code className="text-cyan-400">localhost:8001</code>).</p>
            <p>See <a href="https://github.com/sandraschi/triton-mcp/blob/master/docs/setup.md" className="text-cyan-400 hover:text-cyan-300">docs/setup.md</a> for full details.</p>
          </>
        )}

        {tab === 'architecture' && (
          <>
            <p><strong className="text-slate-200">Three-layer design:</strong> MCP client → FastMCP Gateway → tritonclient.grpc → Triton Inference Server.</p>
            <div className="bg-black/30 rounded-xl p-4 font-mono text-sm space-y-0.5">
              <div className="text-gray-500">LLM Agent ──▶ FastMCP 3.2 ──▶ tritonclient.grpc ──▶ Triton :8001</div>
              <div className="text-gray-500">                │</div>
              <div className="text-gray-500">Webapp ──▶ REST API ────────────┘</div>
            </div>
            <p><strong className="text-slate-200">Module structure:</strong></p>
            <div className="bg-black/30 rounded-xl p-4 font-mono text-sm space-y-1">
              <div>server.py</div>
              <div className="ml-4">├── tools/model_tools.py      → tritonclient.grpc</div>
              <div className="ml-4">├── tools/config_tools.py     → tritonclient.grpc</div>
              <div className="ml-4">├── tools/inference_tools.py  → tritonclient.grpc, numpy</div>
              <div className="ml-4">└── tools/metrics_tools.py    → tritonclient.grpc</div>
            </div>
            <p>Each tool creates a short-lived gRPC client per call — stateless and safe for parallel tool execution. A pooled connection pattern can be added for latency-sensitive workloads.</p>
            <p>See <a href="https://github.com/sandraschi/triton-mcp/blob/master/docs/architecture.md" className="text-cyan-400 hover:text-cyan-300">docs/architecture.md</a> for full design details.</p>
          </>
        )}

        {tab === 'tools' && (
          <>
            <p><strong className="text-slate-200">12 MCP tools</strong> across 5 domains.</p>
            <div className="space-y-2">
              <p className="text-xs text-slate-500 uppercase tracking-wider font-bold">Server (READ)</p>
              {[
                { n: 'triton_status', d: 'Check Triton server connectivity, readiness, uptime' },
                { n: 'triton_server_metadata', d: 'Server name, version, supported extensions' },
              ].map((t) => (
                <div key={t.n} className="bg-white/10 rounded-xl p-3 flex items-start gap-3">
                  <span className="text-xs font-bold uppercase px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400">READ</span>
                  <div>
                    <code className="text-cyan-400 font-bold">{t.n}()</code>
                    <p className="text-sm text-slate-300 mt-0.5">{t.d}</p>
                  </div>
                </div>
              ))}
              <p className="text-xs text-slate-500 uppercase tracking-wider font-bold mt-4">Model Lifecycle (READ + MUTATE)</p>
              {[
                { n: 'list_models', d: 'Query repository index with model states', r: true },
                { n: 'get_model_metadata', d: 'Tensor shapes, datatypes, backend, versions', r: true },
                { n: 'load_model', d: 'Explicitly load model into GPU memory', r: false },
                { n: 'unload_model', d: 'Purge model from GPU memory', r: false },
              ].map((t) => (
                <div key={t.n} className="bg-white/10 rounded-xl p-3 flex items-start gap-3">
                  <span className={`text-xs font-bold uppercase px-2 py-0.5 rounded ${t.r ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>{t.r ? 'READ' : 'MUTATE'}</span>
                  <div>
                    <code className="text-cyan-400 font-bold">{t.n}()</code>
                    <p className="text-sm text-slate-300 mt-0.5">{t.d}</p>
                  </div>
                </div>
              ))}
              <p className="text-xs text-slate-500 uppercase tracking-wider font-bold mt-4">Configuration (READ + MUTATE)</p>
              {[
                { n: 'get_model_config', d: 'Read config.pbtxt: batch size, instances, batching', r: true },
                { n: 'optimize_model_config', d: 'Tune max_batch_size, queue delay, instance count', r: false },
                { n: 'list_model_configs', d: 'Summarize all model configs', r: true },
              ].map((t) => (
                <div key={t.n} className="bg-white/10 rounded-xl p-3 flex items-start gap-3">
                  <span className={`text-xs font-bold uppercase px-2 py-0.5 rounded ${t.r ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>{t.r ? 'READ' : 'MUTATE'}</span>
                  <div>
                    <code className="text-cyan-400 font-bold">{t.n}()</code>
                    <p className="text-sm text-slate-300 mt-0.5">{t.d}</p>
                  </div>
                </div>
              ))}
              <p className="text-xs text-slate-500 uppercase tracking-wider font-bold mt-4">Inference (MUTATE)</p>
              {[
                { n: 'submit_inference', d: 'Route pre-tokenized tensors directly to Triton scheduler via gRPC. Bypasses HTTP overhead.', r: false },
              ].map((t) => (
                <div key={t.n} className="bg-white/10 rounded-xl p-3 flex items-start gap-3">
                  <span className="text-xs font-bold uppercase px-2 py-0.5 rounded bg-amber-500/20 text-amber-400">MUTATE</span>
                  <div>
                    <code className="text-cyan-400 font-bold">{t.n}()</code>
                    <p className="text-sm text-slate-300 mt-0.5">{t.d}</p>
                  </div>
                </div>
              ))}
              <p className="text-xs text-slate-500 uppercase tracking-wider font-bold mt-4">Metrics (READ)</p>
              {[
                { n: 'get_gpu_metrics', d: 'GPU utilization, VRAM, inference counts per model' },
                { n: 'get_server_metrics', d: 'Queue latency, compute time, batch efficiency' },
              ].map((t) => (
                <div key={t.n} className="bg-white/10 rounded-xl p-3 flex items-start gap-3">
                  <span className="text-xs font-bold uppercase px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400">READ</span>
                  <div>
                    <code className="text-cyan-400 font-bold">{t.n}()</code>
                    <p className="text-sm text-slate-300 mt-0.5">{t.d}</p>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {tab === 'triton' && (
          <>
            <p><strong className="text-slate-200">NVIDIA Triton Inference Server</strong> is a production-grade inference serving platform. It abstracts framework differences (TensorRT, ONNX, PyTorch, TF), manages GPU memory, schedules batches, and exposes a unified gRPC/HTTP API.</p>
            <p><strong className="text-slate-200">Key features:</strong></p>
            <ul className="list-disc list-inside space-y-1 text-slate-300">
              <li>Multi-framework — one server for all model formats</li>
              <li>Dynamic batching — auto-batches requests within a configurable queue delay</li>
              <li>GPU memory pooling — shared VRAM across models</li>
              <li>Concurrent execution — multiple models run in parallel on the same GPU</li>
              <li>Model ensembles — pipeline multiple models into a single inference graph</li>
              <li>Prometheus metrics — GPU utilization, latency, queue depth</li>
            </ul>
            <p><strong className="text-slate-200">config.pbtxt</strong> is the model configuration file — defines tensor shapes, batch sizes, instance groups, and optimization:</p>
            <div className="bg-black/30 rounded-xl p-4 font-mono text-xs space-y-0.5 overflow-x-auto">
              <div>name: <span className="text-green-400">"resnet50"</span></div>
              <div>platform: <span className="text-green-400">"onnxruntime_onnx"</span></div>
              <div>max_batch_size: 8</div>
              <div>input [{ }{"{name: \"input_0\", data_type: TYPE_FP32, dims: [3, 224, 224]}"}]</div>
              <div>output [{ }{"{name: \"output_0\", data_type: TYPE_FP32, dims: [1000]}"}]</div>
            </div>
            <p>See <a href="https://github.com/sandraschi/triton-mcp/blob/master/docs/triton-inference-server.md" className="text-cyan-400 hover:text-cyan-300">docs/triton-inference-server.md</a> for comparison with TorchServe and ONNX Runtime Server.</p>
          </>
        )}

        {tab === 'models' && (
          <>
            <p><strong className="text-slate-200">Model Repository</strong> — Triton organizes models in a directory structure:</p>
            <div className="bg-black/30 rounded-xl p-4 font-mono text-sm space-y-0.5">
              <div>/model_repo</div>
              <div className="ml-4">├── resnet50/</div>
              <div className="ml-8">├── 1/model.onnx</div>
              <div className="ml-8">└── config.pbtxt</div>
              <div className="ml-4">├── bert_qa/</div>
              <div className="ml-8">├── 1/model.plan</div>
              <div className="ml-8">└── config.pbtxt</div>
              <div className="ml-4">└── ensemble/</div>
              <div className="ml-8">└── config.pbtxt</div>
            </div>
            <p><strong className="text-slate-200">Model states:</strong> <code className="text-emerald-400">READY</code> (loaded), <code className="text-red-400">UNAVAILABLE</code> (not loaded or failed), <code className="text-amber-400">LOADING</code>, <code className="text-amber-400">UNLOADING</code>.</p>
            <p><strong className="text-slate-200">Tuning parameters via <code className="text-cyan-400">optimize_model_config</code>:</strong></p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-slate-200 border-b border-white/10">
                    <th className="text-left py-2 pr-4">Parameter</th>
                    <th className="text-left py-2 pr-4">Range</th>
                    <th className="text-left py-2">Effect</th>
                  </tr>
                </thead>
                <tbody className="text-slate-400">
                  <tr className="border-b border-white/10"><td className="py-2 pr-4 font-bold text-slate-300">max_batch_size</td><td className="py-2 pr-4">0-64+</td><td className="py-2">Higher = more throughput, more latency</td></tr>
                  <tr className="border-b border-white/10"><td className="py-2 pr-4 font-bold text-slate-300">max_queue_delay_us</td><td className="py-2 pr-4">50-2000</td><td className="py-2">How long to wait before executing a partial batch</td></tr>
                  <tr className="border-b border-white/10"><td className="py-2 pr-4 font-bold text-slate-300">instance_count</td><td className="py-2 pr-4">1-8</td><td className="py-2">Parallel execution streams on the same GPU</td></tr>
                  <tr className="border-b border-white/10"><td className="py-2 pr-4 font-bold text-slate-300">kind</td><td className="py-2 pr-4">KIND_GPU / KIND_CPU</td><td className="py-2">Target device for inference</td></tr>
                </tbody>
              </table>
            </div>
            <p>See <a href="https://github.com/sandraschi/triton-mcp/blob/master/docs/model-management.md" className="text-cyan-400 hover:text-cyan-300">docs/model-management.md</a> for best practices.</p>
          </>
        )}

        {tab === 'fleet' && (
          <>
            <p className="mb-3">triton-mcp is the <strong className="text-slate-200">inference serving layer</strong> in the MCP fleet. Other servers produce or consume models through Triton:</p>
            <div className="space-y-3">
              {[
                { repo: 'chip-design-mcp', port: '11022', desc: 'Exports .plan / .onnx models for serving', fmt: 'TensorRT' },
                { repo: 'monitoring-mcp', port: '10901', desc: 'Consumes get_gpu_metrics for fleet GPU dashboard', fmt: 'Metrics' },
                { repo: 'local-llm-mcp', port: '10832', desc: 'Submits tokenized LLM inputs via submit_inference', fmt: 'gRPC' },
                { repo: 'fastsearch-mcp', port: '10844', desc: 'Offloads embedding model inference to Triton', fmt: 'ONNX' },
              ].map((f) => (
                <div key={f.repo} className="bg-white/10 rounded-xl p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <code className="text-cyan-400 font-bold text-sm">{f.repo}</code>
                    <span className="text-xs text-slate-500">:{f.port}</span>
                    <span className="text-xs px-2 py-0.5 rounded bg-white/10 text-slate-400">{f.fmt}</span>
                  </div>
                  <p className="text-sm text-slate-300">{f.desc}</p>
                </div>
              ))}
            </div>
            <p className="mt-3">See <a href="https://github.com/sandraschi/triton-mcp/blob/master/docs/fleet.md" className="text-cyan-400 hover:text-cyan-300">docs/fleet.md</a> for the full cross-repo architecture.</p>
          </>
        )}

        {tab === 'api' && (
          <>
            <p><strong className="text-slate-200">REST API</strong> — base URL: <code className="text-cyan-400">http://localhost:11024/api/v1</code></p>
            <div className="space-y-3">
              {[
                { method: 'GET', path: '/status', desc: 'Server health, version, Triton URL, uptime' },
                { method: 'GET', path: '/tools', desc: 'List all 12 registered tools with count' },
                { method: 'POST', path: '/mcp', desc: 'MCP JSON-RPC endpoint for tool calls' },
              ].map((e) => (
                <div key={e.path} className="flex items-start gap-3 bg-black/30 rounded-xl p-3">
                  <span className={`text-xs font-bold uppercase px-2 py-0.5 rounded ${e.method === 'GET' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>{e.method}</span>
                  <div>
                    <code className="text-cyan-400 font-bold">{e.path}</code>
                    <p className="text-sm text-slate-300 mt-0.5">{e.desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-3"><strong className="text-slate-200">MCP Transport:</strong> All 12 tools available via <code className="text-cyan-400">POST /mcp</code> (JSON-RPC) or <code className="text-cyan-400">GET /sse</code> (Server-Sent Events). See <a href="https://github.com/sandraschi/triton-mcp/blob/master/docs/api.md" className="text-cyan-400 hover:text-cyan-300">docs/api.md</a> for full signatures.</p>
          </>
        )}

      </div>
    </div>
  );
}
