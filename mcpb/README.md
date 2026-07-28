# triton-mcp (MCPB Bundle)

NVIDIA Triton Inference Server control plane -- model repository manipulation, VRAM monitoring, and inference over gRPC via FastMCP 3.2

## Usage

Add to \claude_desktop_config.json\:
\\\json
{
  "mcpServers": {
    "triton-mcp": {
      "command": "uv",
      "args": ["run", "--directory", "\D:\Dev\repos", "python", "-m", "triton_mcp"],
      "env": { "PYTHONPATH": "\D:\Dev\repos/src" }
    }
  }
}
\\\

## Tools

- **triton_status**: triton_status
- **triton_server_metadata**: triton_server_metadata
- **api_status**: api_status
- **api_list_tools**: api_list_tools
- **get_model_config**: get_model_config
- **optimize_model_config**: optimize_model_config
- **list_model_configs**: list_model_configs
- **submit_inference**: submit_inference
- **get_gpu_metrics**: get_gpu_metrics
- **get_server_metrics**: get_server_metrics
- **list_models**: list_models
- **get_model_metadata**: get_model_metadata
- **load_model**: load_model
- **unload_model**: unload_model

## Requirements

- Python 3.12+
- uv
