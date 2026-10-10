# Réception à froid — assistante administrative

Date : 10 octobre 2026. Application figée : `/tmp/tricorder-method-review-v1`.
Persona : assistante administrative peu technique, sans onboarding. Deux intentions uniquement : examiner une méthode de clôture de réunions avant de la choisir ; préparer plusieurs réunions de la semaine depuis du texte et des fichiers, puis trouver les agents et les résultats sans terminal.

## Conditions et portée

Parcours GUI Electron sous Xvfb, profil temporaire neuf et isolé (`/tmp/tricorder-assistante-snBGIN`). HOME, XDG, données Tricorder et configurations des fournisseurs redirigés ; exécutables codex/claude inertes. Aucun profil réel, secret, code applicatif, README, test ou autre rapport lu. Aucun terminal applicatif ouvert, aucune commande de workflow ou écriture directe de son état. Les fichiers de réunion sont synthétiques et figurent dans `sources/`.

Playwright sert uniquement à cliquer, remplir les champs, sélectionner un fichier au niveau du sélecteur GUI et prendre les captures. Une tentative de sélecteur Playwright a attendu 30 secondes sans événement. L’observation utilisateur est l’absence de sélecteur et de pièce jointe visible ; la cause n’est pas établie par cette persona. Les premiers relancements ont corrigé l’instrumentation du parcours et précèdent la saisie utile.

## Verdict

- **Examiner la méthode avant de choisir : réussi.** Workflows → Modèles → recherche « réunion » → Voir le workflow ouvre un aperçu lisible sans créer une exécution. Informations à fournir, résultat attendu et étapes sont visibles. « Voir les agents » présente les quatre rôles utilisés et permet le retour au workflow.
- **Préparer deux réunions avec texte et fichiers : partiel, puis abandon de l’exécution réelle.** Les champs acceptent deux réunions, leur période et un complément texte. « Ajouter des fichiers » ne présente pas de sélecteur visible ; aucune pièce n’a été jointe. Le lancement réel reste désactivé faute de modèle IA. Le dialogue de choix demande de configurer le fournisseur « dans le terminal » ; je m’arrête ici pour le travail réel.
- **Trouver agents et emplacement des résultats sans terminal : réussi pour la navigation.** Les agents sont trouvés depuis l’aperçu. Après l’abandon réel, « Simuler le parcours » rend accessible le bouton Résultats. La page affiche explicitement que ce sont des exemples simulés, pas des résultats métier.

Aucune qualité IA, lecture réelle des fichiers, compte rendu métier, fournisseur ou service externe n’est qualifié. La simulation ne remplace pas les deux réunions demandées.

## Parcours et preuves

1. Depuis l’accueil, je choisis Workflows. Le mot « méthode » n’est pas dans la navigation ; je tente Modèles. La recherche « réunion » conserve deux cartes, dont « Réunion : compte rendu et email » ([04.png](04.png)).
2. Je choisis Voir le workflow. L’aperçu indique « aucune copie ni exécution créée » ; je comprends ce qui sera demandé et reçu ([05.png](05.png)).
3. J’ouvre les consignes des étapes. Elles deviennent longues et techniques, notamment `source_context` et `ask`, mais restent repliables. L’essentiel était compréhensible avant de les ouvrir ([07.png](07.png)).
4. Voir les agents m’amène à une page où Recherche, Analyse, Rédaction et Vérification sont marqués « Utilisé dans ce workflow ». Je reviens par Retour au workflow ([08.png](08.png)).
5. Utiliser ouvre Nouvelle demande ; je conserve Sans projet, puis Continuer. Le formulaire précise que plusieurs réunions peuvent être traitées ensemble ([10.png](10.png), [11.png](11.png)).
6. Je remplis les deux réunions datées, un titre court, les notes et la correspondance réunion/fichier. Ces saisies sont conservées lors du retour depuis le choix IA. Les deux fichiers synthétiques existent, mais leur sélection n’aboutit pas à une pièce visible ([15.png](15.png), [18.png](18.png)).
7. Au bas du formulaire, trois messages demandent un modèle IA et Démarrer le travail est désactivé ([16.png](16.png)). Choisir l’IA affiche « Aucun catalogue de modèles trouvé sur ce poste. Configurez votre fournisseur dans le terminal » ([17.png](17.png)). Abandon du lancement réel.
8. Je reviens au lancement et choisis Simuler le parcours pour repérer la restitution. Résultats est visible en haut du suivi ([19.png](19.png)). La page présente compte rendu, actions et texte d’email ; elle signale explicitement la simulation ([20.png](20.png)).

## Hésitations et verbatim de la persona

Ces phrases restituent les pensées de la persona pendant ce parcours instrumenté, pas des citations d’une personne recrutée.

- « Je cherche une méthode pour terminer mes réunions ; Modèles semble être le bon endroit. »
- « Voir le workflow me rassure : je peux regarder avant de lancer. »
- « Pourquoi me redemander les réunions dans deux champs ? Je les recopie pour être sûre. »
- « J’ai cliqué pour joindre les notes. Je ne vois aucun endroit pour choisir mes fichiers, ni de confirmation. »
- « Je ne sais pas quel modèle choisir. On me demande maintenant un terminal ; je m’arrête pour mes vraies réunions. »
- « Résultats est facile à trouver, mais l’exemple ne concerne pas mes réunions. »

## Difficultés, sévérité et attendu

| Observation | Sévérité pour cette persona | Attendu |
|---|---|---|
| Ajouter des fichiers : aucun sélecteur visible ni pièce ajoutée après le clic ; cause non établie dans ce parcours. | Majeure : empêche de préparer la demande avec ses sources. | Ouvrir un sélecteur, montrer les noms des pièces ajoutées ; si cela échoue, afficher une explication exploitable. |
| Fournisseur préaffiché, mais lancement bloqué ; dialogue IA renvoie à la configuration dans le terminal lorsqu’aucun catalogue n’est disponible. | Majeure pour une première utilisation sans onboarding : abandon du lancement réel. | Faire connaître la préparation nécessaire avant la longue saisie et guider une personne non technique, tout en conservant sa demande. L’absence de fournisseur configuré ici est volontaire ; aucun fournisseur réel n’a été testé. |
| « Réunions ou période à examiner » puis « Réunions à traiter » demandent des informations proches. | Mineure : duplication et hésitation. | Distinguer sélection de réunions et correspondance des sources, ou réunir la saisie. |
| Consignes détaillées exposent `source_context` et `ask`. | Mineure : termes peu compréhensibles pour une assistante. | Garder l’explication métier visible ; réserver ces détails à un niveau avancé clairement identifié. |

Points favorables : aperçu accessible avant choix, périmètre sans envoi explicite, plusieurs réunions annoncées, agents identifiés, retour au workflow clair, résultats accessibles sans terminal et simulation explicitement marquée dans la restitution.
