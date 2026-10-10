const { _electron: electron, expect } = require('/home/blegoff/odoo-tricorder/node_modules/@playwright/test');
const fs = require('node:fs'), os = require('node:os'), path = require('node:path');
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'tricorder-installed-check-'));
const exe = process.argv[2];
let app;
(async () => {
  const env = {PATH:'/usr/bin:/bin', HOME:root, DISPLAY:process.env.DISPLAY, XAUTHORITY:process.env.XAUTHORITY, LANG:'C.UTF-8', XDG_CONFIG_HOME:path.join(root,'config'), XDG_CACHE_HOME:path.join(root,'cache'), XDG_DATA_HOME:path.join(root,'data'), CODEX_HOME:path.join(root,'codex'), CLAUDE_CONFIG_DIR:path.join(root,'claude'), TRICORDER_HOME:root, TRICORDER_STATE_DIR:root, TRICORDER_WORKFLOW_STATE_DIR:root, TRICORDER_RUNTIME_DIR:path.join(root,'runtime'), TRICORDER_AGENTS_DIR:path.join(root,'no-pack'), TRICORDER_TEST_MODE:'1', PYTHONDONTWRITEBYTECODE:'1'};
  app = await electron.launch({executablePath:exe,args:[],env});
  const identity = await app.evaluate(({app})=>({version:app.getVersion(),packaged:app.isPackaged,executable:app.getPath('exe')}));
  expect(identity.version).toBe('0.6.0-rc.15'); expect(identity.packaged).toBe(true);
  const page = await app.firstWindow();
  await expect(page.getByRole('heading',{name:'Un workflow clair. Un travail que vous pouvez suivre.',exact:true})).toBeVisible();
  await page.locator('[data-workflow-route=global]').click();
  await expect(page.getByRole('heading',{name:'Workflows',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Modèles',exact:true}).click();
  await expect(page.locator('.template-card h3').first()).toBeVisible();
  console.log(JSON.stringify({...identity,checks:['Accueil vide','Workflows','Modèles'],isolated:true},null,2));
})().catch(error=>{console.error(error);process.exitCode=1;}).finally(async()=>{
  if(app) await app.close();
  fs.rmSync(root,{recursive:true,force:true,maxRetries:5,retryDelay:100});
});
