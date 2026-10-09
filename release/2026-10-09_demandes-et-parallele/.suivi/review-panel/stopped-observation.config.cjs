const {defineConfig}=require('/home/blegoff/odoo-tricorder/node_modules/@playwright/test');
module.exports=defineConfig({testDir:__dirname,testMatch:'stopped-observation.spec.cjs',grep:/a stopped conversation with a pending question/,workers:1,repeatEach:3,timeout:60000,reporter:'list',outputDir:'/tmp/tricorder-review-stopped-results',use:{trace:'on'}});
