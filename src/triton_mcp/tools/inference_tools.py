"""
Inference submission MCP tools for Triton Inference Server.

Provides direct gRPC tensor inference routing, bypassing HTTP
overhead for performance-sensitive workloads.

Registered via register_inference_tools(mcp, triton_url) -- called from server.py.
"""

import logging
from typing import Annotated

import numpy as np
import tritonclient.grpc as grpcclient
from pydantic import Field

logger = logging.getLogger("triton-mcp.inference")

_MUTATING = {"readonly": False, "mutating": True}


def register_inference_tools(
    mcp,
    triton_url: str,
):
    """Register inference MCP tools on the FastMCP instance."""

    @mcp.tool(annotations=_MUTATING, version="0.1.0")
    async def submit_inference(
        model_name: Annotated[str, Field(description="Target model name in the Triton repository.")],
        model_version: Annotated[str, Field(description="Model version string. Default: latest.")] = "",
        input_data: Annotated[
            dict | None,
            Field(
                description=(
                    "Input tensor data as a dict mapping input name -> nested list. "
                    "e.g. {'input_0': [[1.0, 2.0], [3.0, 4.0]]}"
                )
            ),
        ] = None,
    ) -> dict:
        """Submit raw tensor inputs directly to Triton's scheduler over gRPC.
        Bypasses HTTP routing overhead for latency-sensitive inference.

        Tensors are auto-shaped from the provided nested lists. Data type is
        inferred as FP32 for float values, INT64 for integer values.

        ## Return Format
        {"success": bool, "data": {"outputs": {name: shape, ...}, "model_name": str, "model_version": str}}

        ## Examples
        await submit_inference(model_name="onnx_resnet50", input_data={"input_0": [[1.0, 2.0, 3.0]]})
        await submit_inference(model_name="token_classifier", input_data={"text": "Hello world"}, model_version="2")
        """
        if not input_data:
            return {"success": False, "error": "No input_data provided.", "data": None}

        try:
            client = grpcclient.InferenceServerClient(url=triton_url)

            inputs = []
            for name, data in input_data.items():
                arr = np.array(data, dtype=np.float32 if isinstance(np.asarray(data).flat[0], float) else np.int64)
                inp = grpcclient.InferInput(name, arr.shape, "FP32" if arr.dtype == np.float32 else "INT64")
                inp.set_data_from_numpy(arr)
                inputs.append(inp)

            outputs = []
            meta = client.get_model_metadata(model_name, model_version)
            for out in meta.outputs:
                outputs.append(grpcclient.InferRequestedOutput(out.name))

            result = client.infer(model_name, inputs, model_version=model_version, outputs=outputs)
            client.close()

            output_data = {}
            for out in meta.outputs:
                val = result.as_numpy(out.name)
                output_data[out.name] = {"shape": list(val.shape), "dtype": str(val.dtype)}

            return {
                "success": True,
                "data": {
                    "outputs": output_data,
                    "model_name": model_name,
                    "model_version": model_version,
                },
            }
        except Exception as e:
            return {"success": False, "error": str(e), "data": None}

    return {"submit_inference": submit_inference}
