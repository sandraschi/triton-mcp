"""
FastMCP 3.2 Unified Gateway for NVIDIA Triton Inference Server.

Architecture:
  MCP client/tool -> tritonclient.grpc (native gRPC) -> Triton Inference Server
                  -> JSON response

All tool modules are registered via portmanteau imports from tools/__init__.py.
The gRPC client is session-scoped (created once, shared across tool calls).
"""

import argparse
import logging
import os
import time
from contextlib import asynccontextmanager

import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastmcp import FastMCP

from triton_mcp.tools import (
    register_config_tools,
    register_inference_tools,
    register_metrics_tools,
    register_model_tools,
)

logger = logging.getLogger("triton-mcp")

TRITON_URL = os.environ.get("TRITON_GRPC_URL", "localhost:8001")

_START_TIME = time.time()


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Triton MCP startup -- gRPC target: %s", TRITON_URL)
    yield
    logger.info("Triton MCP shutdown")


app = FastAPI(
    title="Triton MCP",
    description="NVIDIA Triton Inference Server control plane -- model management, metrics, and inference over gRPC",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

mcp = FastMCP.from_fastapi(app, name="Triton MCP")

# --- Register Tool Modules ---

_model_tools = register_model_tools(mcp=mcp, triton_url=TRITON_URL)
_config_tools = register_config_tools(mcp=mcp, triton_url=TRITON_URL)
_inference_tools = register_inference_tools(mcp=mcp, triton_url=TRITON_URL)
_metrics_tools = register_metrics_tools(mcp=mcp, triton_url=TRITON_URL)

_all_tools = {}
_all_tools.update(_model_tools)
_all_tools.update(_config_tools)
_all_tools.update(_inference_tools)
_all_tools.update(_metrics_tools)


# --- Server-Level MCP Tools ---


@mcp.tool(annotations={"readonly": True}, version="0.1.0")
async def triton_status() -> dict:
    """Check Triton server connectivity and status.

    ## Return Format
    {"success": bool, "server_url": str, "connected": bool, "uptime_s": int}

    ## Examples
    await triton_status()
    """
    import tritonclient.grpc as grpcclient

    try:
        client = grpcclient.InferenceServerClient(url=TRITON_URL)
        alive = client.is_server_live()
        ready = client.is_server_ready()
        client.close()
        return {
            "success": True,
            "server_url": TRITON_URL,
            "connected": alive,
            "ready": ready,
            "uptime_s": int(time.time() - _START_TIME),
        }
    except Exception as e:
        return {
            "success": False,
            "server_url": TRITON_URL,
            "connected": False,
            "error": str(e),
            "uptime_s": int(time.time() - _START_TIME),
        }


@mcp.tool(annotations={"readonly": True}, version="0.1.0")
async def triton_server_metadata() -> dict:
    """Retrieve Triton server metadata: name, version, extensions, and supported backends.

    ## Return Format
    {"success": bool, "data": {"name": str, "version": str, "extensions": [str, ...]}}

    ## Examples
    await triton_server_metadata()
    """
    import tritonclient.grpc as grpcclient

    try:
        client = grpcclient.InferenceServerClient(url=TRITON_URL)
        meta = client.get_server_metadata()
        client.close()
        return {
            "success": True,
            "data": {
                "name": meta.name,
                "version": meta.version,
                "extensions": list(meta.extensions) if meta.extensions else [],
            },
        }
    except Exception as e:
        return {"success": False, "error": str(e), "data": None}


_all_tools["triton_status"] = triton_status
_all_tools["triton_server_metadata"] = triton_server_metadata


# --- REST Endpoints ---


@app.get("/api/v1/status")
async def api_status():
    return {
        "server": "triton-mcp",
        "version": "0.1.0",
        "triton_url": TRITON_URL,
        "uptime_s": int(time.time() - _START_TIME),
    }


@app.get("/api/v1/tools")
async def api_list_tools():
    return {"tools": sorted(_all_tools.keys()), "count": len(_all_tools)}


# --- Main Entry Point ---


def main():
    parser = argparse.ArgumentParser(description="Triton MCP Server")
    parser.add_argument("--mode", default="dual", choices=["dual", "sse", "stdio", "http"], help="Server mode")
    parser.add_argument("--port", type=int, default=11024, help="Port for HTTP/SSE modes")
    parser.add_argument("--host", default="0.0.0.0", help="Host to bind")
    args = parser.parse_args()

    if args.mode == "stdio":
        mcp.run(transport="stdio")
    else:
        uvicorn.run(app, host=args.host, port=args.port, log_level="info")


if __name__ == "__main__":
    main()
