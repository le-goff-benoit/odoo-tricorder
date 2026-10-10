// Reproduction écrite après observation. Aucun workflow injecté.
const fs = require('fs');
const os = require('os');
const path = require('path');
const { _electron } = require('/home/blegoff/odoo-tricorder/node_modules/@playwright/test');
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'tricorder-consultant-repro-'));
const evidence = path.join(__dirname, 'reproduction');
fs.mkdirSync(evidence, { recursive: true });
fs.mkdirSync(path.join(root, 'bin'), { recursive: true });
for (const name of ['codex', 'claude']) {
  const file = path.join(root, 'bin', name);
  fs.writeFileSync(file, '#!/bin/sh\nexit 78\n');
  fs.chmodSync(file, 0o755);
}
const env = {
  ...process.env, HOME: root,
  XDG_CONFIG_HOME: `${root}/config`, XDG_DATA_HOME: `${root}/data`, XDG_CACHE_HOME: `${root}/cache`,
  TRICORDER_HOME: root, TRICORDER_STATE_DIR: `${root}/state`,
  TRICORDER_WORKFLOW_STATE_DIR: `${root}/workflows`, TRICORDER_RUNTIME_DIR: `${root}/runtime`,
  TRICORDER_AGENTS_DIR: `${root}/agents`, CODEX_HOME: `${root}/codex`, CLAUDE_CONFIG_DIR: `${root}/claude`,
  PATH: `${root}/bin:${process.env.PATH}`,
};
(async () => {
  const app = await _electron.launch({
    executablePath: '/home/blegoff/.local/opt/odoo-tricorder-0.6.0-rc.17/odoo-tricorder',
    args: ['--no-sandbox'], env,
  });
  try {
    const page = await app.firstWindow();
    page.setDefaultTimeout(10000);
    await page.waitForLoadState();
    const click = async name => page.getByRole('button', { name, exact: true }).click();
    const shot = async name => page.screenshot({ path: path.join(evidence, `${name}.png`) });
    await click('Workflows');
    await click('Modèles');
    const support = () => page.getByRole('heading', {name: 'Support — diagnostic et réponse', exact: true}).locator('..');
    await support().getByRole('button', { name: 'Créer une adaptation…', exact: true }).click();
    await page.getByRole('dialog').getByRole('button').first().click();
    for (const client of ['Client Alpha', 'Client Beta']) {
      await click('Projets');
      await click('+ Nouveau projet');
      await page.getByRole('dialog').getByRole('textbox').fill(client);
      await page.getByRole('dialog').getByRole('button', {name: 'Créer le projet', exact: true}).click();
      await page.getByRole('heading', {name: client, exact: true}).waitFor();
    }
    async function adapt(client) {
      await click('Workflows');
      await click('Modèles');
      await support().getByRole('button', {name: 'Créer une adaptation…', exact: true}).click();
      await page.getByLabel('Nom du workflow').fill(`Support ${client}`);
      await page.getByLabel('Enregistrer dans').selectOption({label: client});
      await page.getByRole('dialog').getByRole('button', {name: 'Créer et ouvrir le workflow', exact: true}).click();
      await page.getByRole('heading', {name: `Support ${client}`, exact: true}).waitFor();
    }
    await adapt('Client Alpha');
    await shot('alpha-editeur');
    await click('Exécuter…');
    const form = page.getByRole('dialog');
    await form.getByRole('textbox').nth(0).fill('Client Alpha : import CSV échoue sur ligne 12 depuis ce matin. Résultat attendu : importer toutes les lignes.');
    await form.getByRole('textbox').nth(1).fill('Deux utilisateurs touchés, travail manuel possible.');
    await form.getByRole('combobox').selectOption({label: 'Brouillon d’email'});
    await form.getByRole('textbox').nth(2).fill('Alpha - import CSV');
    await click('Lancer dans le terminal');
    await page.getByRole('heading', {name: 'Alpha - import CSV', exact: true}).waitFor();
    await shot('alpha-demande');
    await click('Client Beta');
    await page.getByRole('heading', {name: 'Client Beta', exact: true}).waitFor();
    await shot('beta-terminal-alpha');
    await adapt('Client Beta');
    await click('Exécuter…');
    await page.getByRole('dialog').getByRole('textbox').nth(0).waitFor();
    const visibleValues = await page.getByRole('dialog').getByRole('textbox').evaluateAll(els => els.map(el => el.value));
    fs.writeFileSync(path.join(evidence, 'beta-champs.json'), JSON.stringify(visibleValues, null, 2));
    await shot('beta-champs');
  } finally { await app.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
