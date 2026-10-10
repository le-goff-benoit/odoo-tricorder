const {defineConfig}=require('/home/blegoff/odoo-tricorder/node_modules/@playwright/test');
module.exports=defineConfig({testDir:__dirname,testMatch:'usage.spec.cjs',timeout:120000,workers:1,reporter:'list'});
