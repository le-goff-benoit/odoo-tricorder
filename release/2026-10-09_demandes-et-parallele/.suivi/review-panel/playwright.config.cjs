const {defineConfig}=require('/home/blegoff/odoo-tricorder/node_modules/@playwright/test');
module.exports=defineConfig({testDir:__dirname,testMatch:'review.spec.cjs',workers:1,timeout:60000,reporter:'list',outputDir:'/tmp/tricorder-review-panel-final-results',use:{trace:'retain-on-failure'}});
