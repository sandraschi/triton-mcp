# Architecture

## High-Level Design

```
┌──────────────────────────────────────────────────────────────────┐
│                     triton-mcp (port 11024)                       │
│                                                                   │
│  ┌──────────┐   ┌──────────────┐   ┌──────────────────────────┐  │
│  │  MCP     │   │   FastAPI    │   │     FastMCP Gateway      │  │
│  │  Client  │──▶│   REST API   │──▶│   (dual transport)       │  │
│  │  / LLM   │   │  /api/v1/*   │   │   @mcp.tool × 12        │  │
│  └──────────┘   └──────────────┘   └───────────┬──────────────┘  │
│                                                  │                │
│                       ┌──────────────────────────┼──────────┐     │
│                       ▼                          ▼          │     │
│  ┌──────────────────────────┐  ┌──────────────────────────┐ │     │
│  │     tritonclient.grpc     │  │  REST API endpoints      │ │     │
│  │     (gRPC async)          │  │  /api/v1/status          │ │     │
│  │                           │  │  /api/v1/tools           │ │     │
│  │  list_models              │  │  /api/v1/triton_health   │ │     │
│  │  load/unload model        │  │                          │ │     │
│  │  get_model_config         │  │                          │ │     │
│  │  submit_inference_tensor  │  │                          │ │     │
│  │  get_server_metrics       │  │                          │ │     │
│  └──────────┬───────────────┘  └──────────────────────────┘ │     │
│              │                                               │     │
└──────────────┼───────────────────────────────────────────────┘     │
               │                                                     │
               ▼ gRPC :8001
┌──────────────────────────────────┐
│  NVIDIA Triton Inference Server   │
│  ┌────────┐ ┌────────┐ ┌───────┐ │
│  │ TensorRT│ │  ONNX  │ │Python │ │
│  │  LLM   │ │ Runtime│ │ BLS   │ │
│  └────────┘ └────────┘ └───────┘ │
│  ┌──────────────────────────────┐│
│  │    GPU Scheduler + Pool      ││
│  └──────────────────────────────┘│
└──────────────────────────────────┘
               │
               ▼
  ┌──────────────────────────────┐
  │   frontend (port 11025)       │
  │   Vite + React 19 + Tailwind  │
  │   6 pages, Playwright e2e    │
  └──────────────────────────────┘
```

## Module Dependency Graph

```
server.py
  ├── tools/model_tools.py      → tritonclient.grpc
  ├── tools/config_tools.py     → tritonclient.grpc
  ├── tools/inference_tools.py  → tritonclient.grpc, numpy
  └── tools/metrics_tools.py    → tritonclient.grpc
```

## gRPC Client Pattern

Each tool creates a short-lived `tritonclient.grpc.InferenceServerClient` per call. This is simple and stateless — fine for tool-level parallelism (MCP clients call tools independently).

For latency-sensitive inference pipelines, `submit_inference` uses the same pattern but could be upgraded to a connection-pooled client using FastMCP lifespan hooks:

```python
# Future: pooled client via lifespan
@asynccontextmanager
async def lifespan(app):
    pool = create_grpc_channel(triton_url)
    yield {"client": pool}
```

## State Management

`_state: dict` in `server.py` currently tracks only server metadata (uptime, URLs). No model state is cached — every tool call queries Triton directly for fresh data. This prevents stale state issues when models are hot-swapped externally.

## Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| FastMCP 3.2 + FastAPI dual transport | MCP for LLM clients, REST for webapp |
| gRPC-only (port 8001) | Native Triton protocol; HTTP endpoint exists for health checks but gRPC is the performance path |
| Per-call gRPC client | Simple, stateless, safe for parallel tool calls |
| No triton compiler imports | This is infrastructure management, not GPU kernel compilation |
| `_READ_ONLY` / `_MUTATING` annotations | SOTA MCP safety levels for tool classification |
