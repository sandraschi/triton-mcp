"""
Triton MCP tool modules -- portmanteau re-exports.

Each submodule registers its tools via a register_* function that accepts
the FastMCP instance and triton_url string. Call all registration functions
from server.py after mcp creation.
"""

from triton_mcp.tools.config_tools import register_config_tools
from triton_mcp.tools.inference_tools import register_inference_tools
from triton_mcp.tools.metrics_tools import register_metrics_tools
from triton_mcp.tools.model_tools import register_model_tools

__all__ = [
    "register_config_tools",
    "register_inference_tools",
    "register_metrics_tools",
    "register_model_tools",
]
