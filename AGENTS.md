# triton-mcp Agent Context

Fleet MCP server for NVIDIA Triton Inference Server. See `justfile` for recipes.

## Quick Ref

```powershell
uv run pytest tests/ -q
uv run python -m triton_mcp.server --mode dual --port 11024
```
