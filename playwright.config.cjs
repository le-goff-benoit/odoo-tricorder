const { defineConfig } = require('@playwright/test');
// Both daily release work and advanced workflow design are supported entry points.
module.exports = defineConfig({ testDir: './tests', testMatch: ['desktop.spec.cjs', 'release-opening.spec.cjs', 'studio.spec.cjs', 'launch-repair.spec.cjs', 'execution-interactions.spec.cjs', 'simplicity.spec.cjs'], workers: 1, timeout: 60000, reporter: 'list', use: { trace: 'retain-on-failure' } });
