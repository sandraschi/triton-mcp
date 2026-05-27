# API Reference

## MCP Transport

All 12 tools available via FastMCP SSE/HTTP:

```
POST /mcp     — JSON-RPC over HTTP
GET  /sse     — Server-Sent Events stream
```

### Client Example

```python
from mcp import ClientSession

async with ClientSession(server_url="http://localhost:11024/mcp") as session:
    result = await session.call_tool("list_models", {})
```

## REST API

Base URL: `http://localhost:11024/api/v1`

### Status

```
GET /api/v1/status
→ {"server": "triton-mcp", "version": "0.1.0", "triton_url": "localhost:8001", "uptime_s": 123}
```

### List Tools

```
GET /api/v1/tools
→ {"tools": ["list_models", ...], "count": 12}
```

## Tool Catalog

All tools return the standard schema:

```python
{"success": bool, "error": str | None, "data": dict | list | None}
```

### Server Tools

| Tool | Args | Returns |
|------|------|---------|
| `triton_status` | — | connected, ready, server_url, uptime_s |
| `triton_server_metadata` | — | name, version, extensions |

### Model Lifecycle

| Tool | Args | Returns |
|------|------|---------|
| `list_models` | filter_ready=false | [{name, version, state}] |
| `get_model_metadata` | model_name, version="" | name, platform, versions, inputs, outputs |
| `load_model` | model_name | success message |
| `unload_model` | model_name | success message |

### Configuration

| Tool | Args | Returns |
|------|------|---------|
| `get_model_config` | model_name, version="" | max_batch_size, platform, instance_group, dynamic_batching |
| `optimize_model_config` | model_name, max_batch_size, max_queue_delay_us, instance_count, kind | applied config |
| `list_model_configs` | model_name="" | [{name, platform, max_batch_size, instance_count}] |

### Inference

| Tool | Args | Returns |
|------|------|---------|
| `submit_inference` | model_name, version="", input_data={} | outputs {name: {shape, dtype}} |

### Metrics

| Tool | Args | Returns |
|------|------|---------|
| `get_gpu_metrics` | gpu_index=-1 | model_stats with inference/execution counts, memory usage |
| `get_server_metrics` | model_name="" | model-level latency, queue time, inference counts |

## All Tools Return Schema

### `triton_status`
```json
{"success": true, "server_url": "localhost:8001", "connected": true, "ready": true, "uptime_s": 60}
```

### `list_models`
```json
{"success": true, "data": {"models": [{"name": "resnet50", "version": "1", "state": "READY"}], "count": 3}}
```

### `load_model` / `unload_model`
```json
{"success": true, "message": "Model 'resnet50' loaded into active memory."}
```

### `submit_inference`
```json
{"success": true, "data": {"outputs": {"output_0": {"shape": [1, 1000], "dtype": "float32"}}, "model_name": "resnet50", "model_version": "1"}}
```

### `get_server_metrics`
```json
{"success": true, "data": {"models": [{"name": "resnet50", "inference_count": 150, "avg_compute_ns": 4500000, "avg_queue_ns": 1200}], "count": 3}}
```
