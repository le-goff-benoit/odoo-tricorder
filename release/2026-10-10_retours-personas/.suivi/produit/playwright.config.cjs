const {defineConfig}=require('@playwright/test');
module.exports=defineConfig({testDir:__dirname,testMatch:'usage.spec.cjs',workers:1,timeout:90000,reporter:'list',outputDir:'/tmp/tricorder-persona-produit-rc15-output'});
