set windows-shell := ["pwsh.exe", "-NoLogo", "-Command"]

export NAME := "Triton MCP"
export DESC := "NVIDIA Triton Inference Server control plane -- model management, metrics, and inference over gRPC"
export VER  := "0.1.0"
export PORT := "11024"
export HOST := "0.0.0.0"

# --- Project Configuration ---

default:
    @pwsh.exe -NoProfile -ExecutionPolicy Bypass -File ../mcp-central-docs/scripts/just-dashboard.ps1 -Path .

# --- Lifecycle ---

bootstrap:
    uv sync --all-extras
    Set-Location '{{justfile_directory()}}\webapp'
    cmd /c npm install

clean:
    if (Test-Path -Path "__pycache__") { Remove-Item -Recurse -Force "__pycache__" }; \
    if (Test-Path -Path "**/__pycache__") { Get-ChildItem -Path "." -Recurse -Filter "__pycache__" | Remove-Item -Recurse -Force }; \
    if (Test-Path -Path ".pytest_cache") { Remove-Item -Recurse -Force ".pytest_cache" }; \
    if (Test-Path -Path "htmlcov") { Remove-Item -Recurse -Force "htmlcov" }

setup: clean bootstrap
    Write-Host "Triton MCP ready." -ForegroundColor Green

# --- Operation ---

serve mode="dual" port=PORT:
    uv run python -m triton_mcp.server --mode {{mode}} --port {{port}}

stdio:
    uv run python -m triton_mcp.server --mode stdio

web:
    npx --prefix '{{justfile_directory()}}\webapp' vite --port 11025

# --- Development ---

dev port=PORT:
    uv run uvicorn triton_mcp.server:app --reload --port {{port}} --host {{HOST}}

# --- Quality ---

lint:
    uv run ruff check src/
    Set-Location '{{justfile_directory()}}\webapp'
    npx @biomejs/biome ci .
    npx tsc --noEmit

fix:
    uv run ruff check src/ --fix
    uv run ruff format src/

check: lint test

# --- Testing ---

test:
    uv run pytest

e2e:
    pwsh -NoLogo -NoProfile -ExecutionPolicy Bypass -File "D:\Dev\repos\mcp-central-docs\scripts\playwright-audit.ps1" -RepoPath "{{justfile_directory()}}"

# --- Diagnostics ---

health:
    curl http://localhost:11024/api/v1/status
