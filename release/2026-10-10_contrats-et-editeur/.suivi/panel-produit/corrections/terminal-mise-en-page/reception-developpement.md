# Correction terminal — réception ciblée

Produit : `/home/blegoff/odoo-tricorder`, version candidate 0.6.0-rc.13. Projets synthétiques seulement, écran :190, aucun état client.

## Cause observée

Le scénario original `tests/editor-gestures.spec.cjs:79` échouait4fois sur5. La commande était exécutée dans le PTY ; focus, touches Ctrl+S/Ctrl+Q et session restaient corrects. Après réouverture et réduction, xterm passait de60 à4lignes, avec `baseY=6` mais `viewportY=0`. Le renderer encore suspendu conservait912px de hauteur de viewport pour152px de contenu, tandis que son canvas avait ensuite61px. Le défilement était borné à0 : refresh ou quelques rAF ne réparaient pas cette géométrie.

Preuves : `/tmp/tricorder-editeur-terminal-unchanged/`, `/tmp/tricorder-editeur-terminal-traced/`, `/tmp/tricorder-editeur-terminal-fit-dimensions/fixed-compact-selection-ke-777f5-uts-retain-the-live-session-repeat1/diagnostic.json`. Traces Electron avec snapshots dans les dossiers instrumentés ; pas seulement les traces du runner.

## Correctif

`src/app.js` attend le premier rendu visible (`onRender`, API publique), puis ajuste le terminal après ce rendu. Les demandes simultanées sont regroupées ; masquer/détruire annule l’ajustement en attente. Le suivi du bas n’est restauré que s’il était actif juste avant l’ajustement. Aucune session ou commande n’est relancée.

En disposition empilée et pour une hauteur CSS>700px, minimum de panneau300px au lieu d’une répartition laissant4lignes. Les barres occupaient123px du panneau208px ; à819×720 CSS, le nouveau minimum laisse au moins150px/10lignes utiles et un graphe visible. Aucun CSS modifié.

`tests/editor-gestures.spec.cjs` conserve le scénario original inchangé et ajoute la vérification d’une sortie réellement exécutée, du retour au terminal après masquage/zoom, de l’historique volontaire conservé malgré sortie en arrière-plan, puis reprise de saisie avec le même id/PID.

## Contrôles

- Contre-épreuve du fit visible avec l’ancienne hauteur4lignes :3/3 verts, `/tmp/tricorder-editeur-terminal-visible-fit/`.
- `npm run build` : vert.
- Scénario original sur le produit construit :2/2 verts, `/tmp/tricorder-editeur-terminal-patch/`.
- Contre-test historique final :2/2 verts, `/tmp/tricorder-editeur-terminal-history/`.
- Réception indépendante : déléguée par root à `/root/avis_contre_epreuve`, écran :188.

Commande type : `DISPLAY=:190 XAUTHORITY=/tmp/tricorder-collections-panel/190/Xauthority python3 /tmp/tricorder-ci-target-source-run.py tests/editor-gestures.spec.cjs --grep 'terminal reveal follows' --repeat-each=2 --output=/tmp/tricorder-editeur-terminal-history --reporter=line`.
