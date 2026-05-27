"""
Triton MCP -- NVIDIA Triton Inference Server control plane via FastMCP 3.2.

Provides model repository manipulation, VRAM pooling monitoring, server metrics,
config file read/write, and direct gRPC tensor inference submission.

All tools use tritonclient.grpc for native Triton communication.
No GPU kernel compilation -- this is infrastructure management, not a compiler bridge.
"""

from __future__ import annotations

import logging

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger("triton-mcp")
