# Fleet Integration

## Cross-MCP Architecture

triton-mcp slots into the fleet ecosystem as the **inference serving layer**. Other MCP servers produce models or need inference — triton-mcp provides the runtime.

```
llm-txt-mcp (config)
  │
  ├── shares model topology
  │
  ▼
chip-design-mcp (synthesis)
  │
  ├── exports .plan / .onnx via inference pipeline
  │
  ▼
triton-mcp (port 11024/11025)
  │
  ├── serves models via gRPC :8001
  │
  ├── monitoring-mcp (telemetry consumer)
  │     └── reads get_gpu_metrics for dashboard
  │
  ├── local-llm-mcp (LLM runtime)
  │     └── submits tokenized inputs via submit_inference
  │
  └── fastsearch-mcp (embedding search)
        └── queries embedding models served by Triton
```

## Integration Points

### monitoring-mcp

`monitoring-mcp` can poll `get_gpu_metrics` from triton-mcp to build a real-time GPU utilization dashboard for the fleet operator.

```python
# monitoring-mcp consumer
result = await session.call_tool("get_gpu_metrics", {"gpu_index": 0})
for model in result.data["model_stats"]:
    print(f"{model['model']}: {model['inference_count']} inferences")
```

### local-llm-mcp

`local-llm-mcp` can submit tokenized inputs to Triton-hosted LLMs (TensorRT-LLM or vLLM backends) via `submit_inference`, bypassing the need for direct HTTP inference.

```python
# local-llm-mcp consumer
tokens = tokenizer.encode(prompt)
result = await session.call_tool("submit_inference", {
    "model_name": "tensorrt_llm",
    "input_data": {"input_ids": tokens}
})
```

### fastsearch-mcp

`fastsearch-mcp` can offload embedding model inference to Triton for high-throughput vector generation:

```python
result = await session.call_tool("submit_inference", {
    "model_name": "gte_embedding",
    "input_data": {"text_batch": ["query: ...", "passage: ..."]}
})
```

## Shared Resources

| Resource | Format | Producer | Consumer |
|----------|--------|----------|----------|
| Model configs | `.pbtxt` | llm-txt-mcp | triton-mcp |
| TensorRT plans | `.plan` | chip-design-mcp | triton-mcp |
| ONNX models | `.onnx` | various | triton-mcp |
| GPU metrics | Prometheus | triton-mcp | monitoring-mcp |
| Tokenized inputs | `int64[]` | local-llm-mcp | triton-mcp |
| Embeddings | `float32[]` | triton-mcp | fastsearch-mcp |

## Port Reservation

| Port | Service |
|------|---------|
| 11024 | triton-mcp Backend (FastAPI + FastMCP) |
| 11025 | triton-mcp Frontend (Vite dev) |
| 8001 | Triton Inference Server gRPC (external) |
| 8000 | Triton Inference Server HTTP (external) |
| 8002 | Triton Inference Server Metrics (external) |
