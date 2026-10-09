# Diagnostic indépendant — deux échecs des suites finales

**Deux causes différentes : `roadmap` révèle une régression de rendu ; l’assertion de masquage de `flow starts` est devenue obsolète.** Diagnostic en lecture seule, sans nouveau test GUI ni modification des sources, tests ou bundle pendant les suites actives.

## 1. Roadmap : vraie bande de contexte vide

Échec commun source/paquet : `tests/desktop.spec.cjs:1204`, `expect(#terminal-context).toBeHidden()`. L’assertion est à conserver.

Le scénario est à la vue Plan, ouvre un shell par Ctrl+Shift+T et vérifie auparavant le dossier de travail choisi ainsi que `terminal.task === null`. Aucun contexte de tâche ne doit apparaître. La trace constate pourtant un conteneur visible, sur 14 observations pendant 5 secondes.

Cause directe :

- `src/app.js:465` insère maintenant systématiquement un enfant `.terminal-session-title` dès qu’un terminal est sélectionné, y compris un shell ordinaire dans la vue historique.
- `src/workspace-layout.css:99` masque ce titre avec `display:none` hors focus dans un onglet terminal ; la ligne suivante le montre au focus.
- `src/style.css:104`, `#terminal-context:empty { display:none }`, ne correspond donc plus. Un enfant masqué reste un enfant pour `:empty`.
- Le conteneur conserve le padding de `src/style.css:101`. Il forme une bande sans information visible. Remplacer le test par `toBeVisible` masquerait cette régression ; son texte caché ne prouve pas un contexte utile à l’utilisateur.

Correction minimale suggérée, dans la feuille terminal, sans modifier les règles de contexte métier :

```css
#terminal-workspace:not(:has(.terminal-tab:focus-within))
#terminal-context:not(.production):has(> .terminal-session-title:only-child) {
  display: none;
}
```

La condition ne masque que le cas où le titre masqué est le seul enfant. Elle cesse de correspondre au focus d’onglet, ce qui laisse le titre complet s’afficher. Un contexte de workflow, un décalage de release ou une alerte production restent affichés. Le développeur doit vérifier le cas focus/clavier ainsi que le contexte cross-projet déjà reçu. Le correctif proposé n’a pas été exécuté par cette revue.

## 2. Flow starts : ancienne attente de masquage

Échec commun source/paquet : `tests/desktop.spec.cjs:606`, `expect(#terminal-workspace).toBeHidden()`.

Le test bloque volontairement l’IPC `terminal:create`, lance Ctrl+Shift+T depuis Orbital, navigue vers Nova, puis libère la création. L’écran conserve `.no-release`, mais montre le panneau « Aucun terminal ouvert ». Ce panneau vide est attendu dans Nova lorsque la visibilité choisie persiste ; il ne prouve pas qu’un terminal d’Orbital a été transféré ou lancé dans Nova.

La chronologie du code explique cette différence sans dépendre de la vitesse de réponse : `newTerminal` pose `terminalPreference=true` **avant** l’attente IPC (`src/app.js:563`). `chooseProject` conserve maintenant ce choix (`src/app.js:359`), correction expressément demandée par le panel. `render` l’applique avant l’automatisme local (`src/app.js:325`). Nova affiche donc déjà son panneau vide avant la réponse tardive. Le garde `current === project && ticket === generation && view === startingView` demeure à `src/app.js:584` : la réponse tardive ne force pas le retour à la vue terminal d’Orbital.

Adapter uniquement l’attente devenue obsolète et renforcer le métier :

```js
// Après navigation vers Nova, avant de libérer terminal:create :
await expect(page.locator('.project-item.selected')).toContainText('nova-services');
await expect(page.locator('#terminal-workspace')).toBeVisible();
await expect(page.locator('.no-release')).toBeVisible();
await expect(page.locator('#terminal-empty')).toContainText('Aucun terminal ouvert');

// Libérer l’IPC existant, puis attendre l’unique session créée :
await expect.poll(() => page.evaluate(async () =>
  (await window.tricorder.terminals.list()).length)).toBe(1);
await expect(page.locator('.project-item.selected')).toContainText('nova-services');
await expect(page.locator('#terminal-workspace')).toBeVisible();
await expect(page.locator('.no-release')).toBeVisible();
await expect(page.locator('#terminal-hosts .terminal-host:visible')).toHaveCount(0);
const first = (await page.evaluate(() => window.tricorder.terminals.list()))[0];
expect(first.project).toBe(project); // Orbital, jamais Nova
expect(first.release).toBeNull();
expect(first.task).toBeNull();
```

Garder ensuite toutes les assertions existantes d’adoption ambiguë, absence de réaffectation automatique, choix explicite du terminal, même identifiant/PID, session Express hors release et conservation de Nova après une réponse de projet retardée. Le scénario ne doit ni créer de session Nova ni donner une autorisation implicite. Il est aussi utile de distinguer le maintien volontaire de visibilité d’un vrai réaffichage : une variante où l’utilisateur masque explicitement le terminal pendant l’IPC doit rester masquée après sa réponse.

## Preuves et portée

Les quatre traces originales et les quatre contextes d’erreur sont copiés dans [desktop-failures-original/](desktop-failures-original/), avec leurs SHA256 et événements d’échec dans [index.json](desktop-failures-original/index.json). Elles sont conservées même si les suites suivantes remplacent `test-results`.

Les ZIP reçus contiennent la trace des actions/assertions et les sources de test ; ils ne contiennent pas de snapshots DOM complets. La bande vide est établie par l’échec de visibilité et les trois règles de rendu/CSS ci-dessus, pas par une capture inventée. Aucun processus Electron ou fournisseur n’a été lancé pour ce diagnostic. Aucun état moteur modifié. Recommandation transmise au responsable et au développeur terminal pour correction et vérification ciblée.
