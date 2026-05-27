"""Smoke test for triton-mcp server imports and tool registration."""

import pytest


def test_import_package():
    from triton_mcp import __doc__ as pkg_doc

    assert "Triton" in pkg_doc


def test_import_server():
    from triton_mcp.server import app, TRITON_URL

    assert app is not None
    assert TRITON_URL is not None


def test_import_tools():
    from triton_mcp.tools import (
        register_model_tools,
        register_config_tools,
        register_inference_tools,
        register_metrics_tools,
    )

    assert callable(register_model_tools)
    assert callable(register_config_tools)
    assert callable(register_inference_tools)
    assert callable(register_metrics_tools)


def test_all_tools_registered():
    from triton_mcp.server import _all_tools

    expected = [
        "triton_status",
        "triton_server_metadata",
        "list_models",
        "get_model_metadata",
        "load_model",
        "unload_model",
        "get_model_config",
        "optimize_model_config",
        "list_model_configs",
        "submit_inference",
        "get_gpu_metrics",
        "get_server_metrics",
    ]
    for tool_name in expected:
        assert tool_name in _all_tools, f"Missing tool: {tool_name}"
    assert len(_all_tools) >= len(expected)
