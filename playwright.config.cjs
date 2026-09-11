const { defineConfig } = require('@playwright/test');
module.exports = defineConfig({ testDir: './tests', testMatch: '*.spec.cjs', workers: 1, timeout: 60000, reporter: 'list', use: { trace: 'retain-on-failure' } });
