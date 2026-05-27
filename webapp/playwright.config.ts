import { defineConfig } from '@playwright/test';

export default defineConfig({
    testDir: './e2e',
    timeout: 60000,
    retries: 1,
    use: {
        baseURL: 'http://localhost:11025',
        headless: true,
        screenshot: 'only-on-failure',
    },
    webServer: {
        command: 'uv run python -m triton_mcp.server --mode dual --port 11024',
        port: 11024,
        cwd: '../',
        timeout: 30000,
        reuseExistingServer: false,
    },
});
