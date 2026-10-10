# Contre-épreuve ciblée — lancement local du legacy

Candidat construit : `/tmp/tricorder-release-final`, 10 octobre 2026. Le premier rapport et toutes ses preuves restent inchangés. La correction visée est uniquement l’accès direct au lancement réel d’un workflow composé d’une décision et de documents dont les contenus sont déjà renseignés.

**Constat d’usage : réserve levée sur ce cas.** Après « Exécuter… », le dialogue indique « Ce workflow exécute ses étapes locales sans fournisseur IA ». La section « Exécution locale » est déjà ouverte et « Lancer l’exécution réelle » est immédiatement visible. Aucun bouton « Lancer dans le terminal » n’est proposé. Je comprends le mode d’exécution sans explorer les options avancées.

J’ai conservé l’intention de maintenance : renommer les anciens choix en « Publier la version » et « Renvoyer pour correction », enregistrer puis lancer réellement. Les identifiants `approve`/`reject` et les deux liens originaux restent conservés. Le choix « Renvoyer pour correction » exécute le document de correction et rend le document de publication non applicable. Le workflow se termine ; aucune session de terminal active n’a été créée.

Preuves dans `contre-epreuve/` :

- `22b-legacy-local-direct.png` : dialogue avec lancement local directement visible et explication sans fournisseur IA.
- `legacy-saved.json` : anciens identifiants et liens préservés, nouveaux libellés enregistrés.
- `24-legacy-resultat.png` : choix métier conservé dans le résultat.
- `legacy-final-state.json` : exécution `r1d0b9d8af7904760`, `simulation=false`, statut `completed`, `gate=accepted/outcome=reject`, `repair=accepted`, `publish=skipped`.
- `parcours.cjs` : script autonome ; rejouer avec `node …/contre-epreuve/parcours.cjs legacy` sur un dossier de preuves copié si les preuves initiales doivent être gardées.

Environnement synthétique isolé, fixture préparée par Engine, écritures d’état exclusivement par les commandes validées. Aucun client réel, aucun secret, aucun fournisseur externe qualifié. La commande locale avec échec/reprise n’a pas été répétée, puisque la correction testée concerne le lancement de documents déjà prêts. Les réserves mineures du premier rapport ne sont pas réévaluées ici.

**Verdict : contre-épreuve acceptée pour la correction ciblée, sans régression observée sur le renommage et l’aiguillage du legacy.**
