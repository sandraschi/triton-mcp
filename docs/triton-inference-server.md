# Triton Inference Server

## What is Triton?

[NVIDIA Triton Inference Server](https://developer.nvidia.com/triton-inference-server) is a production-grade, multi-framework inference serving platform. It acts as the "GPU operating system" for model inference — abstracting away framework differences, managing GPU memory, scheduling batches, and exposing a unified HTTP/gRPC API.

Triton is **not** a model training tool. It is a **serving** runtime that takes already-trained models and runs them efficiently on GPU or CPU.

## Why Triton Over Alternatives

| Capability | Triton | TorchServe | TF Serving | ONNX Runtime Server |
|------------|:------:|:----------:|:----------:|:-------------------:|
| Multi-framework | ✅ TensorRT, ONNX, PyTorch, TF, Python | ❌ PyTorch only | ❌ TF only | ✅ ONNX only |
| Dynamic batching | ✅ Auto | ✅ | ✅ | ✅ |
| GPU memory pooling | ✅ Unified pool | ❌ Per-model | ❌ | ❌ |
| Concurrent model execution | ✅ | ❌ | ❌ | ❌ |
| gRPC + HTTP + metrics | ✅ Full | ✅ HTTP | ✅ gRPC + HTTP | ❌ HTTP only |
| Model ensemble | ✅ Pipeline | ❌ | ❌ | ❌ |
| BLS (Business Logic Scripting) | ✅ Python scripts | ✅ TorchServe | ❌ | ❌ |
| GPU metrics export | ✅ Prometheus | ❌ | ✅ | ❌ |
| **Open source** | ✅ BSD | ✅ BSD | ✅ Apache | ✅ MIT |

## Key Concepts

### Model Repository

A directory structure where each model has its own subdirectory:

```
/model_repo
├── resnet50/
│   ├── 1/
│   │   └── model.onnx
│   └── config.pbtxt
├── bert_qa/
│   ├── 1/
│   │   └── model.plan
│   └── config.pbtxt
└── ensemble_pipeline/
    └── config.pbtxt
```

Each version is numbered (1, 2, 3...) — Triton auto-selects the highest number unless `version_policy` is set in `config.pbtxt`.

### config.pbtxt

The model configuration file defines input/output shapes, datatypes, dynamic batching, instance groups, and optimization parameters:

```protobuf
name: "resnet50"
platform: "onnxruntime_onnx"
max_batch_size: 8

input [
  {
    name: "input_0"
    data_type: TYPE_FP32
    dims: [3, 224, 224]
  }
]

output [
  {
    name: "output_0"
    data_type: TYPE_FP32
    dims: [1000]
  }
]

dynamic_batching {
  preferred_batch_size: [1, 2, 4, 8]
  max_queue_delay_microseconds: 100
}

instance_group {
  count: 1
  kind: KIND_GPU
}
```

### Dynamic Batching

Triton automatically batches incoming inference requests into optimal-sized batches. Requests arriving within `max_queue_delay_microseconds` are combined into a single batch, up to `max_batch_size`. This dramatically increases throughput at the cost of marginal latency.

### GPU Memory Pooling

Triton manages a unified GPU memory pool across all loaded models. Models can share GPU memory rather than reserving separate allocations. This allows fitting more models on a single GPU than running them individually.

## Supported Backends

| Backend | Framework | File Format |
|---------|-----------|-------------|
| TensorRT | NVIDIA | `.plan` |
| ONNX Runtime | Microsoft | `.onnx` |
| PyTorch | Meta | `model.pt` |
| TensorFlow | Google | `saved_model/` |
| OpenVINO | Intel | `.xml` |
| Python BLS | Custom | `.py` |
| TensorRT-LLM | NVIDIA | `.plan` (LLM) |
| vLLM | Custom | Via Python backend |

## Triton Ecosystem

- **Triton Client SDK** — Python/C++/Java clients for HTTP and gRPC
- **Model Analyzer** — auto-find optimal batch sizes and instance counts
- **Model Navigator** — auto-convert models to optimized formats
- **Metrics endpoint** — Prometheus-formatted GPU utilization, request latency, queue depth
- **Triton CLI** — command-line model repository management

## Running Triton

```powershell
# Minimal GPU serving
docker run --gpus all \
  -p8000:8000 -p8001:8001 -p8002:8002 \
  -v /path/to/models:/models \
  nvcr.io/nvidia/tritonserver:24.12-py3 \
  tritonserver --model-repository=/models

# With metrics and tracing
docker run --gpus all \
  -p8000:8000 -p8001:8001 -p8002:8002 \
  -v /path/to/models:/models \
  -v /path/to/logs:/logs \
  nvcr.io/nvidia/tritonserver:24.12-py3 \
  tritonserver --model-repository=/models \
    --metrics-interval-ms=1000 \
    --log-file=/logs/triton.log
```

## Triton vs triton-mcp

| Layer | Triton Inference Server | triton-mcp |
|-------|------------------------|------------|
| Role | Model inference runtime | Infrastructure control plane |
| Interface | gRPC / HTTP / Metrics | FastMCP 3.2 + REST API |
| Audience | ML engineers, apps | LLM agents, chatbots |
| Capabilities | Run models | Manage models, query state, submit inference |
| Format | `tritonclient` SDK | Any MCP client (Claude, opencode) |
