const { _electron } = require('/home/blegoff/odoo-tricorder/node_modules/@playwright/test');
const fs=require('fs');const os=require('os');const path=require('path');const readline=require('readline');
(async()=>{const root=fs.mkdtempSync(path.join(os.tmpdir(),'tricorder-assistante-'));const proof=__dirname;const bin=path.join(root,'bin');fs.mkdirSync(bin);for(const name of ['codex','claude'])fs.writeFileSync(path.join(bin,name),'#!/bin/sh\nexit 78\n',{mode:0o755});
const env={...process.env,PATH:bin+':'+process.env.PATH};for(const name of ['HOME','XDG_CONFIG_HOME','XDG_DATA_HOME','XDG_CACHE_HOME','TRICORDER_HOME','TRICORDER_STATE_DIR','TRICORDER_WORKFLOW_STATE_DIR','TRICORDER_RUNTIME_DIR','TRICORDER_AGENTS_DIR','CODEX_HOME','CLAUDE_CONFIG_DIR']){env[name]=path.join(root,name.toLowerCase());fs.mkdirSync(env[name],{recursive:true});}
const app=await _electron.launch({executablePath:'/home/blegoff/.local/opt/odoo-tricorder-0.6.0-rc.17/odoo-tricorder',args:['--no-sandbox'],env,timeout:30000});const page=await app.firstWindow();await page.waitForTimeout(3000);console.log('READY '+root);console.log(await page.locator('body').innerText());await page.screenshot({path:path.join(proof,'01-accueil.png')});
// Reproduction après l'observation ; ce script n'a pas guidé la découverte initiale.
await page.getByRole('button',{name:'Nouvelle demande',exact:true}).click();
await page.getByRole('dialog').getByLabel('Workflow',{exact:true}).selectOption({label:'Clôture de réunion'});
await page.getByRole('dialog').getByRole('button',{name:'Continuer',exact:true}).click();
await page.getByRole('dialog').getByLabel('Titre court (facultatif)').fill('Suivi des réunions équipe et client');
await page.getByRole('dialog').getByLabel('Réunions ou période à analyser').fill('Équipe du 8 octobre et client du 9 octobre 2026');
await page.getByRole('dialog').getByLabel('Notes, transcriptions ou liens des réunions').fill('Équipe : Sarah vérifie les factures mardi. Client : Rémi propose deux créneaux lundi. Préparer un email récapitulatif.');
await page.screenshot({path:path.join(proof,'reproduction-formulaire.png')});
await page.getByRole('dialog').getByRole('button',{name:'Lancer dans le terminal',exact:true}).click();
await page.waitForTimeout(1500);await page.screenshot({path:path.join(proof,'reproduction-terminal.png')});
await page.getByRole('button',{name:'Terminal',exact:false}).first().click();
await page.getByRole('button',{name:'← Retour à la liste',exact:true}).click();
await page.getByRole('button',{name:'Workflows',exact:true}).click();
await page.getByRole('button',{name:'Modèles',exact:true}).click();
await page.getByText('Clôture de réunion',{exact:true}).click();
await page.screenshot({path:path.join(proof,'reproduction-bibliotheque.png')});
console.log('Aperçu ouvert après clic titre : '+await page.getByRole('dialog').count());
await app.close();})();
