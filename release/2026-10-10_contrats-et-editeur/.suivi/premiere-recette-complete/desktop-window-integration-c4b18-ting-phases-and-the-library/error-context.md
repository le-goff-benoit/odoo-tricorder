# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: desktop.spec.cjs >> window integration preserves the native conversation while inspecting phases and the library
- Location: tests/desktop.spec.cjs:1681:1

# Error details

```
TimeoutError: locator.fill: Timeout 30000ms exceeded.
Call log:
  - waiting for getByLabel('Nom du bloc', { exact: true })

```

# Test source

```ts
  1626 |         return ['--bg', '--surface-1', '--sidebar-bg'].flatMap(bg => ['--text', '--text-2', '--text-3'].map(fg => ({fg,bg,ratio:ratio(fg,bg)})));
  1627 |       });
  1628 |       for (const sample of contrast) expect(sample.ratio, `${theme} ${sample.fg} on ${sample.bg}`).toBeGreaterThanOrEqual(4.5);
  1629 |       await page.locator('[data-cockpit="preferences"]').click();
  1630 |       await expect(page.locator('#pref-theme')).toHaveValue(theme);
  1631 |       await page.locator('#pref-contrast').check();
  1632 |       await page.locator('#preferences-form button[type=submit]').click();
  1633 |       await expect(page.locator('html')).toHaveClass(/high-contrast/);
  1634 |       await page.locator('[data-cockpit="preferences"]').click();
  1635 |       await page.locator('#pref-contrast').uncheck();
  1636 |       await page.locator('#preferences-form button[type=submit]').click();
  1637 |     }
  1638 |     // A manual choice wins over OS changes; System follows changes while open.
  1639 |     await page.emulateMedia({colorScheme:'light'});
  1640 |     await expect(page.locator('html')).toHaveAttribute('data-theme','dark');
  1641 |     await page.locator('[data-theme-choice="system"]').click();
  1642 |     await expect(page.locator('html')).toHaveAttribute('data-theme','light');
  1643 |     await page.emulateMedia({colorScheme:'dark'});
  1644 |     await expect(page.locator('html')).toHaveAttribute('data-theme','dark');
  1645 |     await page.locator('[data-theme-choice="light"]').click();
  1646 |     const saved = await page.evaluate(() => window.tricorder.settings({ui:{theme:'invalid-theme'}}));
  1647 |     expect(saved.ui.theme).toBe('light');
  1648 |     // Long release titles wrap; the whole window must remain usable at 125%.
  1649 |     const longTitle = 'Facturation récurrente et suivi des interventions — consolidation des sociétés et validation des documents clients';
  1650 |     write(path.join(project, 'changelog', releaseId, 'README.md'), `<!-- release ouverte -->\n# ${longTitle}\n`);
  1651 |     await page.locator('[data-action="refresh"]').click();
  1652 |     await expect(page.locator('#release-title')).toHaveText(longTitle);
  1653 |     await app.evaluate(({BrowserWindow}) => BrowserWindow.getAllWindows()[0].webContents.setZoomFactor(1.25));
  1654 |     await page.setViewportSize({width:1000,height:700});
  1655 |     for (const theme of ['light', 'dark']) {
  1656 |       await page.locator(`[data-theme-choice="${theme}"]`).click();
  1657 |       await expect(page.locator('html')).toHaveAttribute('data-theme',theme);
  1658 |       const size = await page.evaluate(() => ({width:innerWidth,scroll:document.documentElement.scrollWidth,title:document.querySelector('#release-title').getBoundingClientRect().right}));
  1659 |       expect(size.scroll).toBeLessThanOrEqual(size.width);
  1660 |       expect(size.title).toBeLessThanOrEqual(size.width);
  1661 |       await expect(page.locator('#tabs [data-view="effort"]')).toBeInViewport();
  1662 |       await page.screenshot({animations:'disabled',path:`test-results/appearance-${theme}-compact.png`});
  1663 |     }
  1664 |     await page.locator('[data-theme-choice="light"]').click();
  1665 |     await expect(page.locator('html')).toHaveAttribute('data-theme','light');
  1666 |     await closeWindow(app);
  1667 |     app = await electron.launch(options); page = await app.firstWindow();
  1668 |     await expect(page.locator('#release-select')).toHaveValue(releaseId);
  1669 |     await expect(page.locator('html')).toHaveAttribute('data-theme','light');
  1670 |     await expect(page.locator('[data-theme-choice="light"]')).toHaveAttribute('aria-pressed','true');
  1671 |     await projectTab(page,'terminal');
  1672 |     await expect(page.locator('.xterm-screen')).toContainText('THEME-PRESERVED');
  1673 |     expect((await page.evaluate(() => window.tricorder.terminals.list()))[0].id).toBe(terminal.id);
  1674 |     expect(errors).toEqual([]);
  1675 |   } finally {
  1676 |     await closeWindow(app).catch(() => app.process().kill('SIGKILL'));
  1677 |     await cleanupBroker(path.join(temp,'run/pty.sock')); fs.rmSync(temp,{recursive:true,force:true});
  1678 |   }
  1679 | });
  1680 | 
  1681 | test('window integration preserves the native conversation while inspecting phases and the library', async () => {
  1682 |   const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'tri-one-workflow-'));
  1683 |   const home = path.join(temp, 'home'); fs.mkdirSync(home);
  1684 |   const { project, releaseId } = fixture(home);
  1685 |   const bin = path.join(temp, 'bin'); fs.mkdirSync(bin);
  1686 |   for (const name of ['codex', 'claude']) {
  1687 |     const file = path.join(bin, name);
  1688 |     write(file, '#!/usr/bin/env python3\nimport sys\nprint("SELECTED:' + name + '", flush=True)\nprint("PROMPT:" + sys.argv[-1], flush=True)\nfor line in sys.stdin:\n    print("REPLY:" + line.strip(), flush=True)\n'); fs.chmodSync(file, 0o755);
  1689 |   }
  1690 |   const app = await electron.launch({ args: process.env.TRICORDER_EXECUTABLE ? [] : [root],
  1691 |     ...(process.env.TRICORDER_EXECUTABLE ? { executablePath: process.env.TRICORDER_EXECUTABLE } : {}),
  1692 |     env: { ...process.env, PATH: bin + ':' + process.env.PATH, SHELL: '/bin/bash', HOME: home, TRICORDER_HOME: home,
  1693 |       TRICORDER_STATE_DIR: path.join(temp, 'state'), TRICORDER_RUNTIME_DIR: path.join(temp, 'run'), TRICORDER_TEST_MODE: '1',
  1694 |       TRICORDER_AGENTS_DIR: process.env.TRICORDER_AGENTS_DIR || path.join(os.homedir(), '.odoo19-agents') } });
  1695 |   try {
  1696 |     const page = await app.firstWindow();
  1697 |     await expect(page.getByRole('region', { name: 'Workflow de release' })).toBeVisible();
  1698 |     await expect(page.locator('#terminal-workspace')).toBeVisible();
  1699 |     await page.getByLabel('Fournisseur IA', { exact: true }).selectOption('claude');
  1700 |     await page.getByLabel('Workflow', { exact: true }).selectOption('release');
  1701 |     await page.getByRole('button', { name: 'Démarrer le workflow', exact: true }).click();
  1702 |     await page.locator('#workflow-form [type=submit]').click();
  1703 |     await expect(page.locator('.xterm-screen:visible')).toContainText('SELECTED:claude');
  1704 |     await expect(page.locator('.xterm-screen:visible')).toContainText('PROMPT:/odoo-plan');
  1705 |     const sessions = await page.evaluate(() => window.tricorder.terminals.list());
  1706 |     expect(sessions).toHaveLength(1);
  1707 |     expect(sessions[0].release).toBe(releaseId);
  1708 |     for (const stage of ['collect', 'plan', 'start', 'close']) {
  1709 |       await page.locator('[data-work-stage="' + stage + '"]').click();
  1710 |       expect(await page.evaluate(() => window.tricorder.terminals.list())).toHaveLength(1);
  1711 |       await page.getByRole('button', { name: 'Retrouver la conversation', exact: true }).click();
  1712 |     }
  1713 |     await page.locator('.xterm-helper-textarea:visible').focus();
  1714 |     await page.keyboard.type('Voici mon intention'); await page.keyboard.press('Enter');
  1715 |     await expect(page.locator('.xterm-screen:visible')).toContainText('REPLY:Voici mon intention');
  1716 |     const contentsId = await page.evaluate(() => { window.conversationMarker = 'preserved'; return true; });
  1717 |     expect(contentsId).toBe(true);
  1718 |     if (!(await page.locator('.sidebar-tools').evaluate(el => el.open))) await page.locator('.sidebar-tools > summary').click();
  1719 |     await page.locator('[data-action=workflow-workspace]').click();
  1720 |     expect(app.context().pages()).toHaveLength(1);
  1721 |     const studio = page;
  1722 |     await expect(studio.getByRole('heading', { name: 'Un workflow clair.' })).toBeVisible();
  1723 |     expect(await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().length)).toBe(1);
  1724 |     await studio.getByRole('button', { name: 'Essayer un exemple' }).click();
  1725 |     await studio.locator('.node[data-id="analyse"]').click();
> 1726 |     await studio.getByLabel('Nom du bloc', { exact: true }).fill('Brouillon non appliqué');
       |                                                             ^ TimeoutError: locator.fill: Timeout 30000ms exceeded.
  1727 |     await page.locator('#project-list [data-project=' + JSON.stringify(project) + ']').click();
  1728 |     expect(await page.evaluate(() => window.conversationMarker)).toBe('preserved');
  1729 |     expect((await page.evaluate(() => window.tricorder.terminals.list()))[0].pid).toBe(sessions[0].pid);
  1730 |     await page.locator('.xterm-helper-textarea:visible').focus();
  1731 |     await page.keyboard.type('Je poursuis la conversation'); await page.keyboard.press('Enter');
  1732 |     await expect(page.locator('.xterm-screen:visible')).toContainText('REPLY:Je poursuis la conversation');
  1733 |     if (!(await page.locator('.sidebar-tools').evaluate(el => el.open))) await page.locator('.sidebar-tools > summary').click();
  1734 |     await page.locator('[data-action=workflow-workspace]').click();
  1735 |     await expect(studio.getByLabel('Nom du bloc', { exact: true })).toHaveValue('Brouillon non appliqué');
  1736 |     expect(await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().length)).toBe(1);
  1737 |     await page.locator('#project-list [data-project=' + JSON.stringify(project) + ']').click();
  1738 |     await page.getByRole('button', { name: 'Agrandir le terminal', exact: true }).click();
  1739 |     await expect(page.locator('#content')).toBeHidden();
  1740 |     await page.getByRole('button', { name: 'Afficher le workflow', exact: true }).click();
  1741 |     for (const width of [1440, 1024]) {
  1742 |       await page.setViewportSize({ width, height: 900 });
  1743 |       await expect(page.locator('#terminal-workspace')).toBeVisible();
  1744 |       await expect(page.getByRole('region', { name: 'Workflow de release' })).toBeVisible();
  1745 |       expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  1746 |       await page.screenshot({ path: test.info().outputPath(`workflow-conversation-${width}.png`) });
  1747 |     }
  1748 |     // Changing provider is an explicit new conversation; the first stays alive.
  1749 |     await page.getByLabel('Fournisseur IA', { exact: true }).selectOption('codex');
  1750 |     await page.getByRole('button', { name: 'Démarrer le workflow', exact: true }).click();
  1751 |     await page.locator('#workflow-form textarea').fill('Mon nouveau contexte');
  1752 |     await page.locator('#workflow-form [type=submit]').click();
  1753 |     await expect(page.locator('.xterm-screen:visible')).toContainText('SELECTED:codex');
  1754 |     const latest = await page.evaluate(() => window.tricorder.terminals.list());
  1755 |     expect(latest).toHaveLength(2);
  1756 |     expect(latest[0].pid).toBe(sessions[0].pid);
  1757 |   } finally {
  1758 |     await closeWindow(app);
  1759 |     await cleanupBroker(path.join(temp, 'run/pty.sock'));
  1760 |     fs.rmSync(temp, { recursive: true, force: true });
  1761 |   }
  1762 | });
  1763 | 
```