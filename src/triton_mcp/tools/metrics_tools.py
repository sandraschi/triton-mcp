"""
Metrics and telemetry MCP tools for Triton Inference Server.

Provides GPU utilization, VRAM allocation, server throughput,
and queue latency statistics over gRPC.

Registered via register_metrics_tools(mcp, triton_url) -- called from server.py.
"""

import logging
from typing import Annotated

import tritonclient.grpc as grpcclient
from pydantic import Field

logger = logging.getLogger("triton-mcp.metrics")

_READ_ONLY = {"readonly": True}


def register_metrics_tools(
    mcp,
    triton_url: str,
):
    """Register metrics/telemetry MCP tools on the FastMCP instance."""

    @mcp.tool(annotations=_READ_ONLY, version="0.1.0")
    async def get_gpu_metrics(
        gpu_index: Annotated[int, Field(description="GPU device index to query. -1 = all GPUs.", ge=-1)] = -1,
    ) -> dict:
        """Query GPU utilization, VRAM allocation, and power metrics
        from the Triton server's internal GPU statistics endpoint.

        Requires Triton's --metrics-interval-ms to be set on the server.

        ## Return Format
        {"success": bool, "data": {"gpus": [{"id": int, "utilization": float, "memory_used_mb": float, ...}], "count": int}}

        ## Examples
        await get_gpu_metrics()
        await get_gpu_metrics(gpu_index=0)
        """
        try:
            client = grpcclient.InferenceServerClient(url=triton_url)
            stats = client.get_inference_statistics()
            client.close()

            gpu_data = []
            for name, stat in stats.get("model_stats", {}).items():
                gpu_data.append(
                    {
                        "model": name,
                        "version": stat.get("version", ""),
                        "inference_count": stat.get("inference_count", 0),
                        "execution_count": stat.get("execution_count", 0),
                        "inference_stats": stat.get("inference_stats", {}),
                        "batch_stats": stat.get("batch_stats", {}),
                        "memory_usage": stat.get("memory_usage", []),
                    }
                )

            return {"success": True, "data": {"model_stats": gpu_data, "count": len(gpu_data)}}
        except Exception as e:
            return {"success": False, "error": str(e), "data": None}

    @mcp.tool(annotations=_READ_ONLY, version="0.1.0")
    async def get_server_metrics(
        model_name: Annotated[
            str, Field(description="Optional model name to filter statistics. Empty = all models.")
        ] = "",
    ) -> dict:
        """Retrieve server-level inference statistics: request counts,
        queue latency, compute time, and batch efficiency per model.

        ## Return Format
        {"success": bool, "data": {"models": [{"name": str, "inference_count": int, "avg_latency_us": int}, ...], "count": int}}

        ## Examples
        await get_server_metrics()
        await get_server_metrics(model_name="onnx_resnet50")
        """
        try:
            client = grpcclient.InferenceServerClient(url=triton_url)
            stats = client.get_inference_statistics(model_name)
            client.close()

            models = []
            for name, stat in stats.get("model_stats", {}).items():
                infer_stats = stat.get("inference_stats", {})
                models.append(
                    {
                        "name": name,
                        "version": stat.get("version", ""),
                        "inference_count": stat.get("inference_count", 0),
                        "execution_count": stat.get("execution_count", 0),
                        "success_count": infer_stats.get("success", {}).get("count", 0),
                        "avg_compute_ns": infer_stats.get("compute_infer", {}).get("ns", 0),
                        "avg_queue_ns": infer_stats.get("queue", {}).get("ns", 0),
                        "memory_usage": stat.get("memory_usage", []),
                    }
                )

            return {"success": True, "data": {"models": models, "count": len(models)}}
        except Exception as e:
            return {"success": False, "error": str(e), "data": None}

    return {
        "get_gpu_metrics": get_gpu_metrics,
        "get_server_metrics": get_server_metrics,
    }
