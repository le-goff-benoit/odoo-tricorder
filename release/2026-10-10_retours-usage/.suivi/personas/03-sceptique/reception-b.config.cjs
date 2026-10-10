const {defineConfig}=require('/home/blegoff/odoo-tricorder/node_modules/@playwright/test');
module.exports=defineConfig({testDir:__dirname,testMatch:'reception-b.spec.cjs',timeout:60000,workers:1,reporter:'list'});
