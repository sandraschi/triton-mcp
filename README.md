# Triton MCP

<p align="center">
  <a href="https://github.com/casey/just"><img src="https://img.shields.io/badge/just-ready_to_go-7c5cfc?style=flat-square&logo=just&logoColor=white" alt="Just"></a>
  <a href="https://astral.sh/ruff"><img src="https://img.shields.io/endpoint?url=https://raw.githubusercontent.com/astral-sh/ruff/main/assets/badge/v2.json" alt="Ruff"></a>
  <a href="https://python.org"><img src="https://img.shields.io/badge/Python-3.12+-3776AB?style=flat-square&logo=python&logoColor=white" alt="Python"></a>
  <a href="https://github.com/PrefectHQ/fastmcp"><img src="https://img.shields.io/badge/FastMCP-3.2-7c5cfc?style=flat-square" alt="FastMCP"></a>
  <a href="https://www.nvidia.com/triton-inference-server"><img src="https://img.shields.io/badge/Triton-24.12-76B900?style=flat-square&logo=nvidia&logoColor=white" alt="Triton"></a>
</p>

[![MIT License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![GitHub last commit](https://img.shields.io/github/last-commit/sandraschi/triton-mcp)](https://github.com/sandraschi/triton-mcp)

**NVIDIA Triton Inference Server control plane** — 12 MCP tools for model repository manipulation, VRAM pooling monitoring, server metrics, config tuning, and direct gRPC tensor inference. An LLM agent becomes a dynamic GPU infrastructure administrator.

| | |
|--:|--|
| **You might use this if…** | You want your AI assistant to inspect GPU utilization, hot-load/unload models, tune batch sizes mid-flight, or submit raw tensors to Triton's scheduler without HTTP overhead. |
| **What it connects to** | `tritonclient.grpc` ↔ **NVIDIA Triton Inference Server** (gRPC :8001) |
| **Ports** | Backend **11024**, Dashboard **11025** |
| **Start** | `just bootstrap` then `start.ps1` |

## Table of Contents

| Guide | Content |
| :--- | :--- |
| **[Setup & Configuration](docs/setup.md)** | Prerequisites, install, Docker, env vars, MCP client config |
| **[Architecture](docs/architecture.md)** | High-level design, module graph, gRPC pattern, key decisions |
| **[API Reference](docs/api.md)** | All 12 tools with signatures, REST endpoints, return formats |
| **[Triton Inference Server](docs/triton-inference-server.md)** | What is Triton, comparison, config.pbtxt, backends, running |
| **[Model Management](docs/model-management.md)** | Repository structure, load/unload flow, batch tuning, best practices |
| **[Fleet Integration](docs/fleet.md)** | Cross-MCP architecture, shared resources, port reservation |

## Quick Start

```powershell
# 1. Bootstrap
just bootstrap   # uv sync + npm install

# 2. Launch Triton Inference Server (if not running)
docker run --gpus all -d --name triton ^
  -p8000:8000 -p8001:8001 -p8002:8002 ^
  -v C:\model_repo:/models ^
  nvcr.io/nvidia/tritonserver:24.12-py3 ^
  tritonserver --model-repository=/models

# 3. Launch triton-mcp
start.ps1        # kills zombies, starts backend + frontend, opens browser
```

## Tools Overview

| Domain | Count | Tools |
|--------|:-----:|-------|
| **Server** | 2 | `triton_status`, `triton_server_metadata` |
| **Model Lifecycle** | 4 | `list_models`, `get_model_metadata`, `load_model`, `unload_model` |
| **Configuration** | 3 | `get_model_config`, `optimize_model_config`, `list_model_configs` |
| **Inference** | 1 | `submit_inference` — direct gRPC tensor submission |
| **Metrics** | 2 | `get_gpu_metrics`, `get_server_metrics` |

## Quality Stack

- **Python (Core)**: [Ruff](https://astral.sh/ruff) for linting. 12 MCP tools on FastMCP 3.2. Zero lint errors.
- **Webapp (UI)**: [Biome](https://biomejs.dev/) + `tsc` for formatting and type safety.
- **Protocol**: FastMCP 3.2 SSE transport + REST API (2+ endpoints).
- **Triton**: Native gRPC via `tritonclient.grpc` — no `@triton.jit` compiler code. Infrastructure management, not GPU kernel compilation.
- **Automation**: [Justfile](./justfile) recipes for all fleet operations.

## MCP Client Config

```json
{
  "mcpServers": {
    "triton": {
      "url": "http://localhost:11024/sse",
      "transport": "sse"
    }
  }
}
```

Once connected, call `triton_status` to verify Triton availability, then `list_models` to inspect the repository.

## Architecture at a Glance

```
LLM Agent ──▶ FastMCP 3.2 ──▶ tritonclient.grpc ──▶ Triton :8001
                                │
Webapp ──▶ REST API ───────────┘
```

## Ports

| Port | Service |
|------|---------|
| 11024 | Backend (FastAPI + FastMCP) |
| 11025 | Frontend (Vite dev) |
| 8001 | Triton Inference Server gRPC (external) |
| 8000 | Triton Inference Server HTTP (external) |

## License

MIT — see [LICENSE](LICENSE).
