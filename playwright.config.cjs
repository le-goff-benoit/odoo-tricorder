const { defineConfig } = require('@playwright/test');
// The old cockpit specs describe the retired UI. Studio has its own end-to-end contract.
module.exports = defineConfig({ testDir: './tests', testMatch: 'studio.spec.cjs', workers: 1, timeout: 60000, reporter: 'list', use: { trace: 'retain-on-failure' } });
