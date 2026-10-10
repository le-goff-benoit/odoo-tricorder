# Persona : développeur senior sceptique

Candidat figé : `/tmp/tricorder-rc16-final`, version 0.6.0-rc.16. Agent jouant le rôle, pas participant humain. Parcours autonome Electron/Playwright, HOME synthétique, X isolé, fournisseurs IA inertes. Aucune donnée client ni service externe. La commande Python locale a réellement tourné, sans simulation.

## Intention 1 — comprendre et reprendre une commande

J’ai créé un workflow avec **Commande locale** comme premier bloc. Le champ commande apparaît immédiatement dans l’inspecteur ; je n’ai pas dû convertir une tâche IA. J’ai ajouté deux réponses obligatoires au lancement, **Quantité** numérique et **Inclure le détail** Oui/Non. La saisie de `0` et `Non` est acceptée et ces valeurs restent lisibles dans le détail de l’exécution : zéro et faux ne sont pas confondus avec une absence de réponse.

J’ai enregistré une commande Python inoffensive qui affiche un message puis termine avec le code 3. Le bouton **Enregistrer** conserve bien les arguments saisis : lecture indépendante `workflow.get` dans le journal de parcours. Le lancement réel donne **Échec**, **Examiner l’échec**, puis la preuve de commande et le code 3. Je comprends la cause et n’ai pas besoin du terminal de développement.

**Relancer cette étape…** ouvre un dialogue clair : tentative 1 sur 2, une reprise restante, avertissement qu’une correction doit être effectuée avant de confirmer. J’ai volontairement relancé sans modifier la commande pour constater un nouvel échec. Le dialogue se ferme, la nouvelle tentative apparaît. Le défaut de dialogue qui resterait ouvert n’a pas été reproduit dans ce parcours isolé.

Hésitation réelle : le champ **Correction attendue** pourrait laisser croire qu’écrire la correction changera la commande. Le texte « Effectuez votre correction avant de confirmer » apporte la distinction. Une phrase explicite « Ce commentaire ne modifie pas la commande » serait une amélioration mineure, pas un blocage démontré.

## Intention 2 — savoir si les connexions sont réelles

Sur Connexions, **Installé · connexion à vérifier** pour Codex/Claude, **Utilisable** pour les commandes locales et **Service proposé · à configurer** pour Gmail/Slack permettent de distinguer disponibilité et compte connecté. Le texte précise que l’installation dans Codex est distincte du runtime Tricorder et qu’une carte ne prouve pas une connexion. C’est compréhensible et honnête.

Je n’ai pas qualifié d’adaptateur externe ; aucun n’est installé dans ce HOME. Ce parcours ne prouve ni une opération Gmail, ni une connexion Slack, ni la lisibilité de la carte d’un adaptateur vérifié. Le besoin de qualification d’un vrai service reste hors de cette preuve.

Hésitation : la page propose **Configurer une connexion…** mais indique aussi de modifier `plugins.json` depuis le terminal. Pour un développeur cela reste utilisable ; pour un opérateur ce texte ne dit pas clairement s’il s’agit d’une alternative avancée. Recommandation mineure : annoncer le formulaire comme voie principale et le fichier comme configuration avancée.

## Erreurs du pilote et diagnostic infirmé

Première tentative : JSON collé dans un champ demandant un argument par ligne. Deuxième problème : `fill()` saisissait derrière le dialogue Paramètres encore en cours de fermeture ; le rendu suivant remplaçait le champ. Le pilote observait alors l’ancienne commande `print("Hello")` exécutée et soupçonnait Enregistrer. **Cette suspicion est infirmée** : attendre la disparition effective du dialogue puis saisir le bon format conserve la commande, et Enregistrer suffit sans « Appliquer au bloc ». Il ne s’agit pas d’un défaut utilisateur démontré.

Le texte de `body.innerText` excluait le contenu du Shadow DOM ; les captures étaient correctes. Le script utilise finalement le dernier `main`. Un intitulé de bouton supposé et un sélecteur `main` ambigu ont également été corrigés. Les traces initiales restent dans `observations.txt` et la capture initiale `05-resultat.png` (Hello) ne décrit pas le verdict final.

## Verdict

Adoption possible pour créer/configurer une commande locale, collecter des réponses typées, distinguer exécution réelle et simulation, diagnostiquer et relancer l’échec. Aucune anomalie bloquante confirmée. Deux améliorations mineures de libellé, et une limite explicite : aucun service externe qualifié par ce parcours.

Preuves : `parcours.cjs` rejouable, `observations.txt`, captures `07-argv-avant.png`, `06-echec.png`, `09-reprise.png`, `10-apres-reprise.png`, `08-connexions.png`. Les anciens essais restent conservés pour distinguer les erreurs du pilote.
