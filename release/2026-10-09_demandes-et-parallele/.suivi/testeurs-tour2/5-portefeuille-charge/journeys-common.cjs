const fs = require('node:fs');
const path = require('node:path');
async function openAndPreflight(page, output, number) {
 page.setDefaultTimeout(7000);
 await page.getByRole('button', {name:'Atlas — Services', exact:true}).click();
 await page.locator('[data-action=open-conversation]').waitFor();
 await page.locator('[data-action=open-conversation]').click();
 await page.locator('#conversation-overview').waitFor();
 await page.getByRole('button',{name:'Retrouver la conversation',exact:true}).click();
 await page.locator('.xterm-screen').filter({hasText:'COORDINATEUR LOCAL PRÊT'}).waitFor();
 await page.locator('.xterm-helper-textarea').focus();
 await page.keyboard.press('Control+C');
 await page.keyboard.type('command -v codex; command -v claude; codex --version; claude --version');
 await page.keyboard.press('Enter');
 await page.locator('.xterm-screen').filter({hasText:'STUB-CLAUDE 1.0-local'}).waitFor();
 fs.writeFileSync(path.join(output,'parcours'+number+'-terminal-preflight.txt'),await page.locator('.xterm-screen').innerText());
 await page.locator('[data-action=terminal-toggle]').click();
}
module.exports={openAndPreflight};
