# Model Management

## Model Repository Structure

Triton organizes models in a repository directory. Each model gets its own subdirectory with versioned subdirectories and an optional `config.pbtxt`:

```
/model_repo
├── resnet50/
│   ├── 1/
│   │   └── model.onnx          # Version 1
│   ├── 2/
│   │   └── model.onnx          # Version 2 (optimized)
│   └── config.pbtxt
├── bert_qa/
│   ├── 1/
│   │   └── model.plan          # TensorRT engine
│   └── config.pbtxt
└── ensemble/
    └── config.pbtxt            # Ensemble pipeline (no model file)
```

Triton auto-detects the highest version number as the default. Version policies can override this:

```protobuf
version_policy: {
  specific: { versions: [1, 2] }
  # or: latest: { num_versions: 2 }
  # or: all: {}
}
```

## Model States

Each model in the repository has one of these states:

| State | Meaning |
|-------|---------|
| `READY` | Loaded into memory, ready for inference |
| `UNAVAILABLE` | Not loaded or failed to load |
| `LOADING` | Currently being loaded |
| `UNLOADING` | Being purged from memory |

## Load / Unload Flow

```python
# Check available models
models = await list_models()

# Load a model into GPU memory
await load_model(model_name="onnx_resnet50")

# Verify state is READY
models = await list_models(filter_ready=True)

# Free GPU memory
await unload_model(model_name="onnx_resnet50")
```

Triton loads a model when it first receives an inference request. However, explicit `load_model` is useful for:

- Pre-warming models before traffic arrives
- Loading VRAM-intensive models only when needed
- Sequentially loading/unloading models to fit in limited GPU memory
- Hot-swapping model versions without server restart

## Config Optimization

The `optimize_model_config` tool lets agents tune performance parameters on the fly:

### max_batch_size

Controls how many inference requests Triton combines into a single GPU execution. Higher values increase throughput at the cost of latency:

```json
{"max_batch_size": 8, "max_queue_delay_us": 200}
```

- **Small batch (1-4)**: Low latency, lower throughput
- **Medium batch (8-32)**: Good balance for most models
- **Large batch (64+)**: Best throughput, significant latency

### max_queue_delay_us

How long Triton waits for more requests before executing a partial batch:

- **50-100 µs**: Latency-optimized (real-time inference)
- **100-500 µs**: Balanced (default)
- **500-2000 µs**: Throughput-optimized (batch workloads)

### instance_count

Number of concurrent model copies on the same GPU:

- **1**: Default, single execution stream
- **2-4**: Parallel execution streams (for GPU with spare compute)
- **>4**: Usually diminishes returns due to GPU scheduling overhead

### kind

- `KIND_GPU` — CUDA execution (default for most models)
- `KIND_CPU` — Host CPU execution (for models without GPU backend)

## Best Practices

1. **Pre-load critical models** at boot with `load_model` before the agent needs them
2. **Unload inactive models** to free VRAM for active workloads
3. **Monitor queue latency** via `get_server_metrics` to detect when batching is too aggressive
4. **Start conservative** with `max_batch_size=4` and increase based on observed throughput
5. **Use `filter_ready=True`** to quickly find which models are available for inference
