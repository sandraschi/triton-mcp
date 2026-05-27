"""
Model lifecycle MCP tools for Triton Inference Server.

Provides model repository index queries, model loading/unloading,
and model metadata inspection over gRPC.

Registered via register_model_tools(mcp, triton_url) -- called from server.py.
"""

import logging
from typing import Annotated

import tritonclient.grpc as grpcclient
from pydantic import Field

logger = logging.getLogger("triton-mcp.models")

_READ_ONLY = {"readonly": True}
_MUTATING = {"readonly": False, "mutating": True}


def register_model_tools(
    mcp,
    triton_url: str,
):
    """Register all model lifecycle MCP tools on the FastMCP instance."""

    @mcp.tool(annotations=_READ_ONLY, version="0.1.0")
    async def list_models(
        filter_ready: Annotated[bool, Field(description="If true, only return models in READY state.")] = False,
    ) -> dict:
        """Query the Triton model repository index for all available models,
        their versions, deployment states, and operational readiness.

        ## Return Format
        {"success": bool, "data": {"models": [{"name": str, "version": str, "state": str}, ...], "count": int}}

        ## Examples
        await list_models()
        await list_models(filter_ready=True)
        """
        try:
            client = grpcclient.InferenceServerClient(url=triton_url)
            repo_index = client.get_model_repository_index()
            client.close()

            models = []
            for m in repo_index.models:
                if filter_ready and m.state != "READY":
                    continue
                models.append({"name": m.name, "version": m.version, "state": m.state})

            return {"success": True, "data": {"models": models, "count": len(models)}}
        except Exception as e:
            return {"success": False, "error": str(e), "data": None}

    @mcp.tool(annotations=_READ_ONLY, version="0.1.0")
    async def get_model_metadata(
        model_name: Annotated[str, Field(description="Model name in the Triton repository to inspect.")],
        model_version: Annotated[str, Field(description="Model version string (e.g. '1'). Default: latest.")] = "",
    ) -> dict:
        """Retrieve detailed metadata for a specific model: input/output tensor
        shapes, datatypes, backend engine, and batch configuration.

        ## Return Format
        {"success": bool, "data": {"name": str, "versions": [str], "platform": str, "inputs": [...], "outputs": [...]}}

        ## Examples
        await get_model_metadata(model_name="onnx_resnet50")
        await get_model_metadata(model_name="tensorrt_llm", model_version="3")
        """
        try:
            client = grpcclient.InferenceServerClient(url=triton_url)
            meta = client.get_model_metadata(model_name, model_version)
            client.close()

            inputs = [{"name": inp.name, "datatype": inp.datatype, "shape": inp.shape} for inp in meta.inputs]
            outputs = [{"name": out.name, "datatype": out.datatype, "shape": out.shape} for out in meta.outputs]

            return {
                "success": True,
                "data": {
                    "name": meta.name,
                    "versions": list(meta.versions) if meta.versions else [],
                    "platform": meta.platform,
                    "inputs": inputs,
                    "outputs": outputs,
                },
            }
        except Exception as e:
            return {"success": False, "error": str(e), "data": None}

    @mcp.tool(annotations=_MUTATING, version="0.1.0")
    async def load_model(
        model_name: Annotated[str, Field(description="Model name in the Triton repository to load into GPU memory.")],
    ) -> dict:
        """Explicitly load a model from the repository into active GPU memory.
        Useful for pre-warming models before inference requests.

        ## Return Format
        {"success": bool, "message": str}

        ## Examples
        await load_model(model_name="onnx_resnet50")
        """
        try:
            client = grpcclient.InferenceServerClient(url=triton_url)
            client.load_model(model_name)
            client.close()
            return {"success": True, "message": f"Model '{model_name}' loaded into active memory."}
        except Exception as e:
            return {"success": False, "error": str(e)}

    @mcp.tool(annotations=_MUTATING, version="0.1.0")
    async def unload_model(
        model_name: Annotated[str, Field(description="Model name to purge from GPU/CPU memory.")],
    ) -> dict:
        """Unload a model from active memory, freeing its VRAM allocation.
        Models remain in the repository and can be reloaded at any time.

        ## Return Format
        {"success": bool, "message": str}

        ## Examples
        await unload_model(model_name="tensorrt_llm")
        """
        try:
            client = grpcclient.InferenceServerClient(url=triton_url)
            client.unload_model(model_name)
            client.close()
            return {"success": True, "message": f"Model '{model_name}' purged from active memory."}
        except Exception as e:
            return {"success": False, "error": str(e)}

    return {
        "list_models": list_models,
        "get_model_metadata": get_model_metadata,
        "load_model": load_model,
        "unload_model": unload_model,
    }
