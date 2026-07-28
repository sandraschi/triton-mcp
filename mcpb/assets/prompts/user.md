# Triton-MCP User Guide

## Getting Started

Triton-MCP gives you control over NVIDIA Triton Inference Server for model management, inference execution, and performance monitoring. Start by verifying the server is reachable.

### Checking Server Connectivity

```
triton_status()
```

This returns whether Triton is connected and ready. If connected is false, verify TRITON_GRPC_URL (default localhost:8001) points to a running Triton server. Start Triton with `tritonserver --model-repository=/path/to/models` if it is not running.

### Getting Server Metadata

```
triton_server_metadata()
```

Returns the server name, version, and supported extensions. Extensions tell you what features are available: model_repository (dynamic model loading), schedule_policy (batching), system_shared_memory (shared memory optimization), and more. Check this to understand what your Triton build supports.

## Model Discovery

### Listing Models

```
list_models()
```

Returns all models currently loaded on Triton. Each model entry shows the name, available versions, current state (READY/UNAVAILABLE/LOADING), and GPU utilization. Use this first to see what is available.

For pagination with many models:

```
list_models(limit=10, offset=0)
```

### Getting Model Configuration

Before running inference on an unfamiliar model, inspect its full configuration:

```
get_model_config(model_name="bert-base-uncased")
```

This reveals everything needed to call the model: input and output tensor names, data types, shapes (including variable dimensions like -1 for batch), max_batch_size, dynamic batching settings, optimization preferences, and instance group configuration.

The configuration is essential for understanding:
- What tensor names to use in inference requests (e.g., "input_ids")
- What data types are expected (e.g., INT32, FP32, BYTES)
- What shapes are required (e.g., [-1, 128] for variable-length sequences)
- Whether batching is supported

### Getting Model Metadata

```
get_model_metadata(model_name="bert-base-uncased")
```

Returns runtime metadata including specific input and output schemas for each model version. This is the authoritative source for inference request format.

## Loading and Unloading Models

Triton supports dynamic model loading/unloading when the model_repository extension is available.

### Loading a Model

```
load_model(model_name="resnet50")
```

With optional configuration overrides:

```
load_model(
    model_name="resnet50",
    params={
        "config_override": {
            "max_batch_size": 32,
            "dynamic_batching": {"preferred_batch_size": [8, 16, 32]}
        },
        "version_policy": {"specific": {"versions": [1]}}
    }
)
```

This allows you to adjust model settings at runtime without modifying configuration files.

### Unloading a Model

```
unload_model(model_name="resnet50")
```

This frees GPU memory and resources. The model remains on disk and can be reloaded when needed.

### Listing Model Configurations

```
list_model_configs()
```

Returns a summary of configurations for all loaded models -- name, platform, max_batch_size, and instance count. Useful for a quick overview before detailed inspection.

## Optimization

### Optimizing Model Configuration

```
optimize_model_config(
    model_name="resnet50",
    params={
        "max_batch_size": 32,
        "preferred_batch_sizes": [8, 16, 32],
        "dynamic_batching": True,
        "instance_count": 2,
        "optimization_level": "max"
    }
)
```

This analyzes the current and proposed configurations, returning a before/after comparison with:
- Throughput estimate (inferences/second)
- Latency estimate (milliseconds)
- Memory usage (MB)
- GPU utilization estimate

Use this to tune models for your workload before applying changes. Start with dynamic batching enabled for most workloads. Increase instance_count for GPU utilization but watch for memory constraints.

## Running Inference

### Submitting an Inference Request

For text models (BERT, GPT, etc.):

```
submit_inference(
    model_name="bert-base-uncased",
    input_data=[
        {
            "name": "input_ids",
            "datatype": "INT32",
            "shape": [1, 128],
            "values": [101, 2057, 2003, ...]
        },
        {
            "name": "attention_mask",
            "datatype": "INT32",
            "shape": [1, 128],
            "values": [1, 1, 1, ...]
        }
    ]
)
```

For image models (ResNet, EfficientNet, etc.):

```
submit_inference(
    model_name="resnet50",
    input_data=[
        {
            "name": "input",
            "datatype": "FP32",
            "shape": [1, 3, 224, 224],
            "values": [/* normalized pixel values */]
        }
    ]
)
```

For text generation or classification models:

```
submit_inference(
    model_name="text_classifier",
    input_data=[
        {
            "name": "text",
            "datatype": "BYTES",
            "shape": [1],
            "values": ["This movie was fantastic!"]
        }
    ]
)
```

The response structure mirrors the request: {"output_name": {"name": str, "datatype": str, "shape": list, "values": list}}.

### Understanding Input Format

Every inference request needs: name (matching model config), datatype (matching model config), shape (with -1 for dynamic dimensions), and values as a flat list.

Key datatype mappings:
- INT32: 32-bit signed integers (token IDs, labels)
- INT64: 64-bit signed integers
- FP32: 32-bit floats (pixel values, embeddings)
- FP16: 16-bit half floats (optimized inference)
- BYTES: Variable-length strings or binary data (text, images)

For batched inference, expand the first dimension of shape (e.g., [8, 3, 224, 224] for batch of 8) and concatenate all values.

## Monitoring

### GPU Metrics

```
get_gpu_metrics()
```

Returns per-GPU metrics:
- GPU utilization percentage
- Memory utilization percentage
- Memory used and total (MB)
- Power consumption (Watts)
- GPU temperature (Celsius)

Use this to identify when models are GPU-bound (high utilization) or memory-bound (high memory usage).

### Server Metrics

```
get_server_metrics()
```

Returns server-wide performance data:
- Total inference count (lifetime)
- Successful request count
- Cumulative inference duration (ms)
- Cumulative queue duration (ms)
- Cache utilization
- Per-model request counts

High queue duration relative to inference duration indicates batching or resource contention issues.

## Sample Workflows

### End-to-End Model Testing

1. Check server: `triton_status()`
2. Discover models: `list_models()`
3. Inspect config: `get_model_config(model_name="my_model")`
4. Note the input tensor names, datatypes, and shapes from the config
5. Submit test inference with fabricated or sample data matching the expected format
6. Read output tensors and verify shapes/datatypes match expectations
7. Unload if needed: `unload_model(model_name="my_model")`

### Performance Tuning

1. Baseline: submit several inference requests and note latency
2. Check GPU metrics: `get_gpu_metrics()`
3. Optimize config: `optimize_model_config(model_name="my_model", params={...})`
4. If dynamic batching is recommended, load with optimized config
5. Re-run inference and compare latency and throughput
6. Check server metrics: `get_server_metrics()` to see queue time reduction

### Multi-Model Pipeline

For models that depend on each other (e.g., embedding -- classifier):

1. Check both models are loaded: `list_models()`
2. Get configs for both: `get_model_config("embedder")`, `get_model_config("classifier")`
3. Run embedder: extract embeddings from raw input
4. Run classifier: feed embeddings as input
5. Parse final classification result from output tensors

## Common Error Scenarios

**Triton not reachable:** gRPC connection fails. Verify Triton server is running (tritonserver with gRPC enabled). Check TRITON_GRPC_URL env var. Default is localhost:8001 which is the standard Triton gRPC port.

**Model not found:** The model name is wrong or the model is not loaded. Use list_models() to see what is available.

**Model not ready:** The model is loading, has an error, or is unloaded. Check state from list_models() output. Try loading explicitly.

**Inference failure due to input mismatch:** Input tensor name, datatype, or shape does not match the model config. Use get_model_config() to verify exact requirements. Shape -1 means variable-length -- any positive integer works.

**CUDA out of memory:** The batch size or model combination exceeds GPU memory. Reduce batch size, unload unused models, or use instance_group count of 1.

**Model loading fails:** The model repository path is incorrect, configuration file is malformed, or the model platform backend is not installed. Check Triton server logs for details.

## Understanding Model States

Each model on Triton goes through multiple states. When first listed after server startup, models show state UNAVAILABLE until their configuration is loaded and validated. Available models transition to LOADING when being loaded into GPU memory, then to READY when fully initialized and accepting inference requests. Models that fail to load (e.g., due to configuration errors or missing files) return to UNAVAILABLE with an error message in the server logs. Use list_models to monitor state transitions during loading. Use get_model_config to debug configuration issues if a model fails to load.

## Batch Size and Throughput Relationship

The relationship between batch size and throughput is not linear. Small batch sizes (1-4) give low latency per request but low overall throughput. Medium batch sizes (8-32) typically provide the best throughput-to-latency ratio for most models. Large batch sizes (64+) may saturate GPU memory or hit compute limits, causing diminishing returns. The optimal batch size depends on: model size (number of parameters), input tensor dimensions, GPU memory capacity, GPU compute capability (Tensor Cores), and memory bandwidth. Use optimize_model_config with different batch sizes to find the sweet spot. Monitor GPU utilization -- if it stays below 80%, increase batch size. If inference time per sample increases sharply, you have exceeded the optimal batch size.

## Sequence Batching for Recurrent Models

For autoregressive and recurrent models (LLMs, LSTMs, RNNs), Triton's sequence batching handles variable-length sequences efficiently. Sequence batching correlates multiple requests that belong to the same sequence (e.g., consecutive tokens in text generation) and ensures they are processed in order on the same model instance. Control input fields mark sequence start, sequence end, and sequence continuation. The max_sequence_idle_microseconds parameter determines how long to wait before ending a sequence. This is essential for LLM serving where each token depends on all previous tokens in the sequence.

## Inference Response Interpretation

Inference responses mirror the input tensor structure. Each output tensor has: name (matching model config output name), datatype (matching model config output type), shape (including batch dimension), and values (flat array flattened in row-major order). For classification models, output typically contains class probabilities (shape [1, num_classes]). For detection models like YOLO, output may contain multiple tensors (boxes, scores, class_ids). For text generation models, output may contain logits (shape [1, seq_len, vocab_size]) or token IDs. For embedding models, output is typically a single vector (shape [1, embedding_dim]). Parse the output by reshaping the flat values array according to the output shape, then interpreting based on the model task.

## Multi-GPU Configuration

Triton can utilize multiple GPUs for model inference. Instance groups can specify which GPU to use (gpus: [0] for GPU 0, [1] for GPU 1, or omit to use all available GPUs). Multiple model instances can be spread across GPUs for load balancing. TensorRT-LLM supports tensor parallelism across GPUs for large language models. GPU selection in load_model params controls which GPU(s) the model instance runs on. GPU metrics from get_gpu_metrics are reported per-GPU for monitoring load distribution.

## Model Repository Management

Models must follow a strict directory structure in the Triton model repository. Each model has its own directory named after the model. Inside, version subdirectories are named with numeric strings (1, 2, 3...). The config.pbtxt file sits directly in the model directory (not in version subdirectories). Model files go inside version directories: model.pt for PyTorch, model.plan for TensorRT, model.onnx for ONNX, model.savedmodel for TensorFlow (as a directory), and model.py for Python backend. For non-PyTorch models, the file naming is typically model.{backend_extension}. An example structure for a BERT model: model_repository/bert/1/model.pt and model_repository/bert/config.pbtxt. For TensorFlow SavedModel format, the directory structure is: model_repository/bert/1/model.savedmodel/ with the standard TensorFlow asset, variable, and saved_model.pb files inside.

## Triton Configuration File Format

The config.pbtxt file uses protocol buffer text format. While it can be generated automatically for simple models, complex configurations require manual definition. Key fields include: name (string, must match directory name), platform (backend identifier like pytorch, tensorrt, onnx, tensorflow_savedmodel), max_batch_size (0 for no batching, positive integer for batched models), input/output (tensor specifications with name, data_type, dims, optional reshape, optional optional field), dynamic_batching (preferred_batch_size array, max_queue_delay_microseconds), instance_group (count, kind KIND_CPU/KIND_GPU, gpus list), optimization (priority, execution_accelerators, cuda, graph_level), model_version_policy (all, latest with num_versions, specific with versions), model_warmup (name, batch_size, inputs with fixed or zero data), sequence_batching (max_sequence_idle_microseconds, control_input), and ensemble_scheduling (step list). Use the provided tools to inspect and modify these configurations.

## Working with Large Models

Large models (LLMs, diffusion models, large vision transformers) require special handling. These models typically consume 5-80 GB of GPU memory and have long loading times. Before loading: verify available GPU memory with get_gpu_metrics, unload unnecessary models, and ensure sufficient VRAM for both model weights and inference overhead. For models using TensorRT-LLM: use tensor parallelism across multiple GPUs for models that exceed single GPU memory. Configure paged attention for efficient key-value cache management during text generation. Set max_batch_size conservatively for LLMs -- batch size 1-4 is typical for interactive text generation, while larger batches work for batch processing.

## Model Optimization Case Studies

Case 1: ResNet-50 image classification on a single RTX 4090. Default config has one instance with max_batch_size=0 (no batching). After optimization with max_batch_size=64 and dynamic batching enabled (preferred_batch_sizes [8, 16, 32, 64]), throughput increased from 500 to 8500 inferences per second with a queue delay of 100 microseconds. Adding a second instance (instance_count=2) increased throughput to 12000 inferences per second but at the cost of 15% higher latency. Best configuration for mixed workloads: max_batch_size=32 with two instances.

Case 2: BERT-base NLP model. Without optimization: ~1000 inferences/second. After enabling dynamic batching with preferred batch sizes [4, 8, 16, 32, 64]: ~6000 inferences/second. After switching to FP16: ~11000 inferences/second. After TensorRT optimization: ~15000 inferences/second. Key takeaway: precision conversion (FP32 to FP16) nearly doubles throughput at no accuracy cost for most NLP models.

## Working with the Metrics Tools

The get_gpu_metrics and get_server_metrics tools provide real-time performance data. GPU metrics include per-GPU utilization percentage (useful for identifying compute-bound models), memory utilization (identifying memory pressure), power consumption (monitoring thermal/throttle conditions), and temperature (ensuring GPU is not thermal throttling). Server metrics include total inference count (activity over the server lifetime), cumulative queue duration (total time requests spent waiting), cumulative inference duration (total processing time), and per-model request counts (identifying hot models). Monitor queue-to-compute ratio -- if queue time exceeds compute time, increase batch sizes or instance counts. If compute time is high but GPU utilization is low, there may be CPU-side bottlenecks.

## Inference Request with Raw Contents

For large tensor data, Triton supports sending raw tensor bytes in the request body in addition to the structured contents field. Raw contents are more efficient for large data and reduce serialization overhead. To use raw contents, omit the contents field from input tensors and instead provide raw tensor data in the raw_input_contents field as a list of byte arrays. The datatype and shape fields are still required. Raw contents are expected in row-major order with the same byte layout as the datatype specifies. This is particularly useful for image data (FP32 arrays) and audio data (FP32 or INT16 arrays).

## Understanding Datatype Sizes

Each datatype has a specific byte size, important for constructing raw contents: BOOL = 1 byte, UINT8 = 1 byte, UINT16 = 2 bytes, UINT32 = 4 bytes, UINT64 = 8 bytes, INT8 = 1 byte, INT16 = 2 bytes, INT32 = 4 bytes, INT64 = 8 bytes, FP16 = 2 bytes, FP32 = 4 bytes, FP64 = 8 bytes, BYTES = variable (string length + 4 bytes). Total tensor data size = product(shape) * dtype_size. This is important for GPU memory calculations and raw content construction. For BYTES tensors, each string is encoded as a 4-byte length followed by UTF-8 bytes.

## Benchmarking Inference Performance

To benchmark model performance, submit a series of inference requests at varying batch sizes and record latency. Use get_server_metrics before and after to measure total inference count, cumulative inference duration, and queue time. Calculate throughput as total_inferences / total_time. Calculate average latency as total_inference_duration / total_inferences. The optimize_model_config tool provides estimated before/after performance comparisons, but real-world results may differ based on hardware, concurrent load, and input characteristics.

## Model Configuration Override Patterns

When loading models with config_override, you can modify specific configuration fields without changing the stored config.pbtxt. Common overrides: max_batch_size (increase for higher throughput), dynamic_batching (enable for variable request arrival), instance_group count (increase for GPU utilization), and optimization settings (enable FP16, set compute level). Overridden values persist for the model's loaded session but do not modify the on-disk configuration. To make permanent changes, update the config.pbtxt file in the model repository.

## Python Backend Model Development

Python backend models execute custom Python code within Triton's process. The model.py file defines a class with initialize and execute methods. initialize runs once when the model loads and handles resource setup. execute runs on each inference request and returns response tensors. The Python backend has access to Triton's Python API for calling other models on the same server. Common use cases: data preprocessing (image normalization, tokenization), custom inference logic (model ensembles with conditional branching), response postprocessing (decoding, filtering, formatting), and model orchestration (call multiple models, aggregate results). Performance is lower than native backends but offers maximum flexibility.

## Common Model Config Fixes

When get_model_config shows unexpected values, common fixes include: max_batch_size is 0 (set to desired batch size for batched inference), input dims use -1 for variable dimensions (provide actual shape in inference request), output shapes may use -1 (unknown until inference, especially for detection models), dynamic_batching is not configured (add for multi-request scenarios), instance group count is 0 (set to at least 1), platform type mismatch (verify the correct backend identifier), and missing optimization settings (add optimization for accelerated execution). The load_model tool with config_override can fix most of these at runtime without editing configuration files.

## Triton Server Administration

Beyond tool-level control, Triton server administration includes: monitoring logs (check triton logs for errors and warnings), resource monitoring (GPU, CPU, memory), model repository maintenance (add, remove, update model files), configuration backups (save config.pbtxt files), and performance tuning (adjust batch sizes, instance groups, optimization settings). The MCP tools cover the most common operations, while direct tritonserver CLI control is needed for server-level configuration changes like port bindings and model repository paths.

## Understanding Inference Logs

When inference results are unexpected, check these common issues: input tensor data is not normalized (pixel values should be 0-1 for normalized models, not 0-255), input tensor datatype does not match model config (FP32 vs FP16 vs INT32), input tensor shape does not match expectations (batch dimension, sequence length, image size), output tensor interpretation is wrong (softmax before argmax for classification), model version mismatch (different model behavior between versions), and model warmup not triggered (first request may be slower or behave differently). Always verify the model config with get_model_config before debugging inference results.

## Sequence Batching for Text Generation

For autoregressive language models (GPT, LLaMA, BLOOM), Triton's sequence batching correlates requests belonging to the same text generation sequence. The control_input mechanism marks sequence start, end, and continuation. When combined with dynamic batching, Triton can batch multiple independent generation sequences together for GPU efficiency. The TensorRT-LLM backend adds paged attention for efficient key-value cache management. Configure with max_sequence_idle_microseconds to control how long Triton waits before ending a sequence. Shorter idle times free resources faster but may interrupt slow generation. Recommended settings: 100ms for interactive chat, 1000ms for batch processing.

## Inference Request Error Debugging

When submit_inference returns an error, check: model_name matches exactly what list_models shows, all required input tensors are provided (check names from get_model_config), datatypes match exactly (FP32 != FP16), shapes match except for -1 dimensions, values list length equals product of shape dimensions, and the model is in READY state (check list_models). Common errors: "input 'input_ids' is not in model" (wrong name), "unexpected datatype" (INT32 vs INT64 mismatch), "expected shape [-1, 128] but got [1, 256]" (dimension mismatch), and "model 'xyz' is not ready" (model failed to load or is UNLOADING). Always verify with get_model_config and list_models before submitting.

## Error Recovery Strategies

When an inference request fails, use these recovery strategies: retry with smaller batch size if the error was CUDA out of memory, verify input tensor dimensions and datatypes against the model config, try without the output filter to get all output tensors, check if the model is still loaded and READY, try loading the model again if it shows as UNAVAILABLE, and check Triton server logs for backend-specific errors. For persistent failures, restart the Triton server and reload all models. The optimize_model_config tool can help identify configuration issues before they cause inference failures.

## Triton Deployment Checklist

Before deploying Triton in production: verify all models load successfully, test inference with representative inputs, benchmark throughput and latency at expected load, configure dynamic batching for optimal performance, set up Prometheus monitoring with Grafana dashboards, configure logging for audit and debugging, set up model repository with proper versioning, create backup procedures for model configurations, test failover scenarios with multiple Triton instances, and document port configurations and environment variables for the operations team.

## Multi-Model Workflow Example

Combining multiple models in a pipeline: first call a text embedding model (e.g., BERT) to convert query text to embeddings, then call a classification model (e.g., logistic regression or SVM) on the embedding to classify the input. This ensemble approach uses multiple specialized models for optimal results. Use the ensemble model configuration in Triton for server-side pipeline orchestration, or implement client-side chaining with sequential MCP tool calls for more control. Client-side chaining allows per-step error handling and intermediate result inspection.

## Inference Cost Estimation

Estimate the computational cost of inference requests before submitting. Key factors: total input tensor size (product of input shapes multiplied by datatype bytes), multiply-accumulate operations (FLOPs) required by the model architecture, GPU memory bandwidth for tensor data movement, and batch size impact on throughput. Larger inputs and batches cost more in compute time but typically improve throughput per sample. Use get_server_metrics before and after a representative workload to measure actual cost. The inference_count metric tracks total inferences for cost tracking.

## Quick Reference: Common Model Types and Their Configs

Image classification (ResNet, EfficientNet): input format FP32 [1,3,224,224] normalized to 0-1, output FP32 [1,1000] class logits, apply softmax then argmax for top class. Object detection (YOLO, SSD): input FP32 [1,3,640,640] normalized, outputs vary (boxes, scores, class IDs for detection, or raw tensor for post-processing). Text classification (BERT, RoBERTa): input INT32 [1,128] token IDs, output FP32 [1,2] or [1,num_classes] logits. Text generation (GPT, LLaMA): input INT32 [1,seq_len] tokens, output FP32 [1,seq_len,vocab_size] logits. Image generation (Stable Diffusion): input BYTES text prompt, output FP32 [1,3,512,512] image tensor. Audio (Whisper, Wav2Vec2): input FP32 [1,audio_samples] audio waveform.

## Preventing Common Pitfalls

Most inference failures are caused by input format mismatches. Prevention checklist: verify config with get_model_config before coding the inference call, match input tensor names exactly (case-sensitive), match datatypes exactly (FP32 vs FP16), account for batch dimension in shapes, normalize input data to model expectations, provide all required input tensors, and test with a single input before batching. If inference fails, the error message usually indicates the specific mismatch. Correct the most common issue: wrong datatype (FP32 instead of INT32) or wrong shape dimension.

## Inference Request Lifecycle Monitoring

Track an inference request through its lifecycle: submit via submit_inference, which calls the Triton gRPC API. The request enters the scheduler queue (duration reported in get_server_metrics), is matched with other requests for dynamic batching, dispatched to a model instance, executed on GPU, and returns results. Monitor queue duration vs. inference duration to identify bottlenecks. Queue significantly exceeding inference time suggests the scheduler is overloaded or batch sizes are too large. Inference time significantly exceeding queue time suggests the model is compute-bound or GPU is saturated.

## Performance Tuning Deep Dive

### Dynamic Batching Tuning

Dynamic batching is the most impactful optimization for Triton. Start with conservative batch sizes [4, 8, 16] and a queue delay of 100 microseconds. Monitor the queue-to-compute time ratio via get_server_metrics. If queue time is much higher than compute time, increase the queue delay to allow more requests to accumulate into larger batches. If compute time dominates, the model is GPU-bound and you should reduce batch sizes or increase instance count. For LLMs and other autoregressive models, consider using the TensorRT-LLM backend which implements continuous batching (paged attention) for optimal throughput.

### Instance Group Configuration

Instance groups control how many model copies run concurrently. One instance per GPU is typical for compute-bound models. For memory-bound models with idle GPU time, increase instances to improve utilization. For small models (MobileNet, BERT-tiny), multiple instances per GPU can dramatically improve throughput. Use `optimize_model_config` with `instance_count` to find the sweet spot. Monitor per-GPU utilization: if below 70%, consider adding instances or increasing batch sizes.

### FP16 and INT8 Quantization

FP16 inference doubles throughput on Tensor Core GPUs with minimal accuracy loss (< 0.5% for most vision and NLP models). INT8 quantization provides up to 4x throughput improvement but requires calibration data and may cause accuracy degradation for some models. Use Triton's built-in calibration tools for INT8. Enable via optimization settings: `optimization_level: "max"` enables aggressive optimizations including auto-selection of precision where available.

### Concurrent Model Execution

When running multiple models on the same GPU, Triton's scheduler handles time-sharing. Models with different computational profiles (e.g., one compute-bound, one memory-bound) can complement each other. Avoid running many large models simultaneously unless the aggregate memory fits in GPU VRAM. Use `optimize_model_config` with before/after comparisons to validate the impact of config changes before applying them.

### Model Repository Structure

Models must follow a specific directory structure: model_repository/model_name/1/model.savedmodel (or config.pbtxt + model.pt for PyTorch). The version directory naming is numeric (1, 2, 3...) for explicit versioning or -1 for latest. Model configuration is defined in config.pbtxt in the model directory or overridden via load_model params. For ensemble models, the config.pbtxt references sub-models by name. For BLS models (Business Logic Scripting), Python backend code handles custom orchestration logic.

### Python Backend Considerations

Python backend models run Python code inside Triton for custom preprocessing/postprocessing or model logic. The Python environment must have all dependencies installed. Performance is lower than native backends but offers maximum flexibility. Use Python backend for: data preprocessing (image resize, normalization), postprocessing (output decoding, filtering), orchestration logic (multi-model coordination), and dynamic control flow. For production, consider migrating preprocessing to DALI backend for GPU acceleration.

### Ensemble Pipeline Optimization

Ensemble models chain multiple inference steps without intermediate serialization. Optimize by: ensuring all sub-models use the same GPU (avoid cross-GPU data transfer), keeping tensor shapes consistent between steps to avoid reshapes, using FP16 throughout when precision allows, and minimizing the number of ensemble steps. Each step adds scheduling overhead, so combine operations where possible.

## Advanced Inference Patterns

### Batched Inference for Throughput

Submit multiple inputs in a single request for maximum GPU utilization. The batch dimension (first shape element) controls batch size. All inputs in a batch must have the same shape (except batch dimension). For variable-length inputs, use padding to the maximum length in the batch. Dynamic batching in the scheduler can further combine batches from concurrent requests.

### Ensemble Workflows

Create preprocessing-inference-postprocessing pipelines using ensemble models. For example, a computer vision pipeline: load image (Python backend) -> resize to 224x224 (Python/DALI) -> classify with ResNet50 -> decode top-5 labels (Python backend). The ensemble step defines the data flow between sub-models.

### Concurrent Multi-Model Serving

Run multiple models simultaneously for complex workloads. Each model gets its own instance group allocation. Use `get_gpu_metrics` to monitor total GPU utilization and adjust instance counts accordingly. For critical-path models, reserve dedicated instances. For best-effort models, share instances.

## Troubleshooting Common Scenarios

**Model loading takes too long:** Large models (LLMs, diffusion models) can take several minutes to load. Check GPU memory availability before loading.

**Inference returns all zeros:** The model may need warmup requests to initialize properly. Submit several dummy inference requests before production use.

**Dynamic batching not combining requests:** Ensure max_batch_size is set correctly and multiple requests arrive within max_queue_delay_microseconds. Check that models are configured with dynamic_batching enabled.

**Python backend model crashes:** Check stderr logs for Python exceptions. Ensure all Python dependencies are installed in the Triton container or host environment.

**TensorRT plan file errors:** The plan file must be compiled for the specific GPU architecture (e.g., SM 89 for Ada Lovelace). Regenerate plan files if GPU hardware changes.

**gRPC connection drops:** Large responses may exceed gRPC message size limits. Configure max message size in Triton server flags.

**Server becomes unresponsive under load:** Check CPU utilization, GPU memory, and disk I/O. Triton processes requests asynchronously but may become CPU-bound during model loading or Python backend execution.
