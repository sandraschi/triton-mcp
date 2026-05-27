# Setup & Configuration

## Prerequisites

- **Python 3.12+** with [uv](https://docs.astral.sh/uv/)
- **Node.js 20+** (for webapp)
- **NVIDIA Triton Inference Server** running locally or on the network
  - Recommended: `docker run --gpus all -p8000:8000 -p8001:8001 -p8002:8002 -v /path/to/model_repo:/models nvcr.io/nvidia/tritonserver:24.12-py3 tritonserver --model-repository=/models`

## Quick Install

```powershell
git clone https://github.com/sandraschi/triton-mcp.git
cd triton-mcp
just bootstrap
just serve
```

Opens at http://localhost:11025.

## Manual Steps

### 1. Python bootstrap

```powershell
uv sync --all-extras
```

### 2. Webapp bootstrap

```powershell
cd webapp
npm install
cd ..
```

### 3. Start backend

```powershell
uv run python -m triton_mcp.server --mode dual --port 11024
```

### 4. Start frontend

```powershell
npx --prefix webapp vite --port 11025
```

## Environment Variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `TRITON_GRPC_URL` | `localhost:8001` | Triton Inference Server gRPC endpoint |
| `TRITON_HTTP_URL` | `localhost:8000` | Triton Inference Server HTTP endpoint (reserved) |

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

Once connected, call `triton_status` to verify Triton server availability, then `list_models` to inspect the model repository.

## Starting Triton Inference Server

### Docker (recommended)

```powershell
docker run --gpus all -d --name triton-server ^
  -p8000:8000 -p8001:8001 -p8002:8002 ^
  -v C:\model_repo:/models ^
  nvcr.io/nvidia/tritonserver:24.12-py3 ^
  tritonserver --model-repository=/models
```

### Native install

Download from [NVIDIA Triton Inference Server](https://developer.nvidia.com/triton-inference-server) and follow the platform-specific install guide.

## Verifying Triton

```powershell
curl http://localhost:8000/v2/health/ready
# → {}
```

If Triton responds, you're ready to use triton-mcp.
