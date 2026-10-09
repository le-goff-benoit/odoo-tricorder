const {defineConfig}=require('../../../../node_modules/@playwright/test');
module.exports=defineConfig({testDir:__dirname,testMatch:'review-reuse-safety.spec.cjs',workers:1,timeout:60000,reporter:'list',outputDir:'/tmp/tricorder-ux-review-gui',use:{trace:'retain-on-failure'}});
