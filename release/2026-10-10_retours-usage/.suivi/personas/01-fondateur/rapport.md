# Persona 01 — fondateur SaaS / services

Candidat testé : `/tmp/tricorder-usage-candidate-a`, 10 octobre 2026. Réception d'usage indépendante ; aucune lecture des sources de l'application ni des rapports des autres personas avant ces constats.

## Verdict d'adoption

Je peux retrouver un travail et personnaliser un modèle avec moins d'explications. J'adopterais cette version pour préparer des brouillons en restant présent. Je ne la considérerais pas encore autonome pour mon rituel hebdomadaire : l'origine des réunions reste à expliquer au terminal, le choix IA peut être vide, et le terminal occupe encore la place de la tâche que je viens consulter.

## Parcours 1 — retrouver ce qui travaille et préparer plusieurs réunions

**Intention.** J'ai huit clients en parallèle. Je veux identifier le travail commencé pour Client 03 puis préparer un email regroupant deux réunions commerciales, sans envoyer le message.

**Attente et premier clic.** Je clique spontanément sur Workflows. En cours / Modèles / Historique répondent immédiatement à la différence entre mon travail et mes recettes. Nouvelle demande propose les modèles ; je reconnais Clôture de réunion. La description annonce plusieurs réunions, une analyse puis du texte d'email : je comprends le résultat attendu.

**Ce qui est réellement manipulé.** Première session neuve : choix de Clôture de réunion, demande contenant les dates du 6 et du 8 octobre et deux notes synthétiques, puis Simuler le parcours. Les trois blocs apparaissent terminés. Voir les résultats distingue sélection, analyse, compte rendu, actions et brouillon. Le bandeau dit explicitement qu'il s'agit d'une simulation ; le brouillon précise qu'aucun email n'est envoyé ni brouillon Gmail créé. Le bouton Retour à la liste fonctionne.

Deuxième session : création GUI de huit projets synthétiques, Nouvelle demande sur Client synthétique 03, choix de ce même modèle, démarrage dans un terminal dont Codex est un exécutable inerte. Retour à la liste retrouve une seule demande, son projet, sa prochaine étape et « Depuis le début : … attentes comprises » ([capture 10](10-en-cours-huit-projets.png)). Ce n'est pas une liste de copies de workflows.

**Hésitation et conséquence.** Le formulaire de lancement ne me fait pas choisir des réunions. Il me propose une consigne facultative en disant que je peux tout expliquer au terminal. Je ne sais pas, à ce moment, si Meeting Minutes est accessible, si l'application trouvera les deux réunions, ou si je dois coller leurs transcriptions. La description du modèle promet un parcours ; la collecte concrète reste conversationnelle. J'ai contourné en écrivant dates, périmètre et notes dans la demande. La simulation confirme l'agencement du résultat, pas la sélection de mes réunions : elle restitue un Atelier fictif générique, clairement signalé.

**Autre friction.** Après Retour à la liste, le terminal reste ouvert sur la moitié gauche ; le suivi est réduit à la moitié droite ([capture 10](10-en-cours-huit-projets.png)). Je suis revenu pour faire le point, mais je vois encore la commande Python et les messages du terminal. Le titre de demande reprend toute ma consigne et devient un paragraphe. Je souhaiterais un titre court, le détail accessible ensuite.

## Parcours 2 — personnaliser ma recette pour la semaine prochaine

**Intention.** Réutiliser ma façon de présenter l'email (par client, décisions puis actions), choisir l'IA sans identifiant API, savoir comment je serai prévenu.

**Attente et premier clic.** Depuis Modèles, je choisis Personnaliser une copie sur Clôture de réunion. Le dialogue explique que le modèle intégré reste disponible, que ma copie sera partagée et que les exécutions déjà lancées gardent leur version. C'est compréhensible et rassurant. Je la nomme Synthèse commerciale hebdomadaire.

**Ce qui est réellement manipulé.** Je sélectionne le dernier bloc, modifie sa consigne, applique puis enregistre. La copie revient dans Modèles avec Modifier le modèle et dans le choix de Nouvelle demande ([captures 11](11-modele-personnalise.png), [13](13-modele-retrouve.png), [14](14-copie-nouvelle-demande.png)). La semaine suivante, j'ai donc un chemin de réutilisation concret.

**Hésitation et contournement.** Avec le terminal conservé à gauche, cliquer sur un bloc le sélectionne sans montrer le champ Consigne. J'ai d'abord cherché dans la zone du bloc ; le formulaire attendu n'était pas visible ([capture d'échec](erreur-autonome.png)). Fermer le panneau terminal puis cliquer Propriétés a permis la modification. Ce détour est un problème de découverte, même si la fonction existe. Le graphe horizontal déborde, les relations montrent encore `analysis` / `actions` et « un élément » : ces détails me demandent toujours un effort d'interprétation.

**Choix IA.** J'ouvre Choisir l'IA. Sur cet environnement volontairement neuf, OpenAI et Claude proposent seulement « Choisir un modèle » et « Autre modèle… (avancé) » ([capture 07](07-choix-ia.png)). Je ne peux pas accomplir mon intention sans connaître un nom technique. « Choix issus de la configuration locale » explique la provenance, pas la démarche à suivre lorsque la liste est vide. Ce constat ne prouve pas que la liste soit vide sur un poste déjà configuré ; il prouve l'absence d'issue guidée dans cet état neuf.

**Notifications.** Paramètres du workflow propose Dans Tricorder uniquement. Le texte explique que les connexions Email, Slack ou autre service doivent être ajoutées et vérifiées et que la question restera dans Tricorder ([capture 12](12-notifications.png)). Je comprends désormais pourquoi l'email n'apparaît pas. Il manque une action directe « Configurer une notification » et le champ « Canal ou destinataire exact » reste visible même sans canal externe. Aucun compte email, Gmail ou Slack n'a été connecté ni testé.

## Priorités issues de l'usage

1. **Avant le lancement des réunions, expliciter la source.** Proposer coller les notes / choisir des fichiers / utiliser une connexion disponible ; pour plusieurs réunions, rendre le périmètre et les sources trouvées visibles. Indiquer clairement ce que l'agent cherchera encore. Le test doit couvrir deux réunions réelles distinctes dans une source de test, sans les confondre avec l'exemple de simulation.
2. **Donner une issue au catalogue IA vide.** Un état vide explicite et une action de configuration ou d'actualisation, plutôt qu'une liste qui conduit seulement à Autre modèle. Ne pas présenter des modèles non vérifiés comme disponibles.
3. **Rendre le retour utile spatialement.** Sur Retour à la liste ou ouverture des modèles, rendre le contenu principal lisible et donner une action claire pour retrouver le terminal. Sélectionner un bloc devrait expliquer comment modifier ses propriétés si le panneau est replié.
4. **Mieux nommer les demandes.** Titre court éditable et détail de la consigne séparé ; ma longue demande masque les indicateurs que je cherche.
5. **Notifications : accéder à la configuration depuis l'état vide**, et afficher le destinataire lorsqu'un canal applicable est choisi.

## Portée des preuves

Les données sont exclusivement synthétiques. La simulation fournit des résultats génériques et ne qualifie aucun fournisseur, extraction de réunion, email ou service externe. Les lancements terminal emploient des exécutables codex/claude inertes. HOME, état, runtime et `TRICORDER_WORKFLOW_STATE_DIR` sont isolés sous `/tmp/tricorder-founder-*`. Aucun secret lu, aucune écriture de base/JSON d'exécution. Les projets, modèles et exécutions ont été créés par l'interface. Les erreurs de sélecteurs Playwright ne sont pas comptées comme défauts produit ; le panneau Consigne absent dans l'espace comprimé est documenté visuellement avant le contournement.

`explore.cjs` rejoue le parcours huit projets, demande terminal, personnalisation, notifications et réutilisation. `actions.log` conserve l'exploration initiale dont proviennent les captures 01 à 08. Le second parcours a été rejoué après une erreur de localisation du panneau pour vérifier le contournement, pas pour cacher l'hésitation. Les captures font foi ; les `.txt` issus du body ne contiennent pas tout le texte du composant encapsulé. Aucun commit, aucune modification applicative.
