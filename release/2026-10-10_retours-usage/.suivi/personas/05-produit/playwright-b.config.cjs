const {defineConfig}=require('@playwright/test');
module.exports=defineConfig({testDir:__dirname,testMatch:'reception-b.spec.cjs',workers:1,timeout:90000,reporter:'list',outputDir:'/tmp/tricorder-persona05-b-output'});
