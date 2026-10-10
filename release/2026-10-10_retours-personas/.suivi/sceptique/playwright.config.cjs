const {defineConfig}=require('/home/blegoff/odoo-tricorder/node_modules/@playwright/test');
module.exports=defineConfig({testDir:__dirname,testMatch:'usage.spec.cjs',timeout:60000,workers:1,reporter:'list',outputDir:'/tmp/tricorder-sceptique-rc15-results'});
