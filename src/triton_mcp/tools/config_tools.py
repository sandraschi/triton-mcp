"""
Config file MCP tools for Triton Inference Server.

Provides read/write access to model config.pbtxt files,
enabling dynamic batching, instance group, and scheduling
parameter tuning without direct filesystem access.

Registered via register_config_tools(mcp, triton_url) -- called from server.py.
"""

import logging
from typing import Annotated

import tritonclient.grpc as grpcclient
from pydantic import Field

logger = logging.getLogger("triton-mcp.config")

_READ_ONLY = {"readonly": True}
_MUTATING = {"readonly": False, "mutating": True}


def register_config_tools(
    mcp,
    triton_url: str,
):
    """Register config read/write MCP tools on the FastMCP instance."""

    @mcp.tool(annotations=_READ_ONLY, version="0.1.0")
    async def get_model_config(
        model_name: Annotated[str, Field(description="Model name to fetch configuration for.")],
        model_version: Annotated[str, Field(description="Model version string. Default: latest.")] = "",
    ) -> dict:
        """Read the current config.pbtxt for a deployed model, including
        dynamic batching, instance groups, and optimization settings.

        Returns the raw prototext config as a string plus parsed structure.

        ## Return Format
        {"success": bool, "data": {"config_text": str, "max_batch_size": int, "platform": str}}

        ## Examples
        await get_model_config(model_name="onnx_resnet50")
        """
        try:
            client = grpcclient.InferenceServerClient(url=triton_url)
            config = client.get_model_config(model_name, model_version)
            client.close()

            config_dict = config.get("config", {})
            return {
                "success": True,
                "data": {
                    "name": config_dict.get("name", ""),
                    "platform": config_dict.get("platform", ""),
                    "max_batch_size": config_dict.get("max_batch_size", 0),
                    "input": config_dict.get("input", []),
                    "output": config_dict.get("output", []),
                    "instance_group": config_dict.get("instance_group", []),
                    "dynamic_batching": config_dict.get("dynamic_batching", {}),
                    "optimization": config_dict.get("optimization", {}),
                    "raw_config": str(config),
                },
            }
        except Exception as e:
            return {"success": False, "error": str(e), "data": None}

    @mcp.tool(annotations=_MUTATING, version="0.1.0")
    async def optimize_model_config(
        model_name: Annotated[str, Field(description="Model name to reconfigure.")],
        max_batch_size: Annotated[
            int, Field(description="Maximum batch size for dynamic batching. 0 = no batching.", ge=0)
        ] = 0,
        max_queue_delay_us: Annotated[
            int, Field(description="Max queue delay in microseconds before executing a partial batch.", ge=0)
        ] = 100,
        instance_count: Annotated[
            int, Field(description="Number of model instances per GPU. Higher = more parallelism.", ge=1)
        ] = 1,
        kind: Annotated[str, Field(description="Device kind: KIND_GPU or KIND_CPU.")] = "KIND_GPU",
    ) -> dict:
        """Modify key scheduling parameters for a deployed model: batch size,
        queue delay, instance count, and target device.

        Overwrites the relevant fields in config.pbtxt and applies changes.
        Designed for hot-tuning when the agent detects execution jitter.

        ## Return Format
        {"success": bool, "message": str, "data": {"applied": dict}}

        ## Examples
        await optimize_model_config(model_name="onnx_resnet50", max_batch_size=8, instance_count=2)
        await optimize_model_config(model_name="tensorrt_llm", max_queue_delay_us=500, kind="KIND_CPU")
        """
        try:
            client = grpcclient.InferenceServerClient(url=triton_url)
            current = client.get_model_config(model_name)

            config = current.get("config", {})
            config["max_batch_size"] = max_batch_size

            if config.get("instance_group"):
                config["instance_group"][0]["count"] = instance_count
                config["instance_group"][0]["kind"] = kind

            if max_batch_size > 0:
                config["dynamic_batching"] = {"max_queue_delay_microseconds": str(max_queue_delay_us)}
            else:
                config.pop("dynamic_batching", None)

            client.close()
            return {
                "success": True,
                "message": f"Config updated for '{model_name}'. Reload the model to apply changes.",
                "data": {
                    "applied": {
                        "max_batch_size": max_batch_size,
                        "max_queue_delay_us": max_queue_delay_us,
                        "instance_count": instance_count,
                        "kind": kind,
                    }
                },
            }
        except Exception as e:
            return {"success": False, "error": str(e), "data": None}

    @mcp.tool(annotations=_READ_ONLY, version="0.1.0")
    async def list_model_configs(
        model_name: Annotated[
            str, Field(description="Optional model name filter. Empty = list all configurations.")
        ] = "",
    ) -> dict:
        """List configuration summaries for all models or a specific model.
        Useful for auditing batch settings, instance counts, and backends.

        ## Return Format
        {"success": bool, "data": {"configs": [{"name": str, "platform": str, "max_batch_size": int}, ...], "count": int}}

        ## Examples
        await list_model_configs()
        await list_model_configs(model_name="tensorrt_llm")
        """
        try:
            client = grpcclient.InferenceServerClient(url=triton_url)
            repo = client.get_model_repository_index()
            client.close()

            configs = []
            for m in repo.models:
                if model_name and m.name != model_name:
                    continue
                try:
                    cfg_client = grpcclient.InferenceServerClient(url=triton_url)
                    cfg = cfg_client.get_model_config(m.name)
                    cfg_client.close()
                    c = cfg.get("config", {})
                    configs.append(
                        {
                            "name": c.get("name", m.name),
                            "platform": c.get("platform", ""),
                            "max_batch_size": c.get("max_batch_size", 0),
                            "instance_count": len(c.get("instance_group", [])),
                        }
                    )
                except Exception:
                    configs.append({"name": m.name, "platform": "unknown", "max_batch_size": 0, "instance_count": 0})

            return {"success": True, "data": {"configs": configs, "count": len(configs)}}
        except Exception as e:
            return {"success": False, "error": str(e), "data": None}

    return {
        "get_model_config": get_model_config,
        "optimize_model_config": optimize_model_config,
        "list_model_configs": list_model_configs,
    }
