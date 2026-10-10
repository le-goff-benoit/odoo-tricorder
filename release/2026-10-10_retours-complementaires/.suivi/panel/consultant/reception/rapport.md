# Consultant — réception ciblée rc16

Candidat figé `/tmp/tricorder-rc16-reception`. GUI Electron réelle, affichage Xvfb isolé, HOME neuf, fournisseurs inertes. Preuves du premier candidat conservées dans le dossier parent. Aucun code source modifié.

**Verdict : défaut de préremplissage corrigé sur le parcours simulé testé ; aides corrigées.** Adoption favorable pour les deux intentions initiales, avec les limites ci-dessous.

- Après une simulation réussie, retour Workflows enregistrés → Exécuter… : Objet du comité et Titre court sont vides. Deuxième demande saisie puis terminée. Les deux exécutions gardent leurs valeurs distinctes, et le workflow client avant/après reste strictement identique (`verification.json`).
- Fermer le dialogue sans lancer, puis le rouvrir conserve « Brouillon avant annulation » et « Titre avant annulation » : la correction n’efface pas un brouillon abandonné temporairement (`annulation-conservee.png`).
- Une tentative de simulation avec le champ obligatoire vide ne ferme pas le formulaire et conserve le titre saisi (`erreur-validation-conservee.png`). Cette preuve couvre une erreur de validation de saisie, pas une panne de fournisseur ou de moteur.
- Créer un modèle annonce maintenant sa disponibilité dans Workflows → Modèles et Nouvelle demande, sans demander de le convertir à nouveau en modèle (`02-creer-modele.png`). Créer une adaptation indique Workflows → Workflows enregistrés ; le détour obsolète par Gestion des workflows a disparu (`aide-adaptation.png`).

Capture utile pour le README : `nouvelle-demande-vierge.png`. Elle montre le formulaire après succès, les deux champs remis à zéro et l’ensemble du dialogue dans une fenêtre 1440 × 1000. Capture réelle, sans retouche.

Scripts `parcours.cjs` et `aide-adaptation.cjs` exécutés avec code 0 via `PATH=/tmp/tricorder-xvfb/usr/bin:$PATH xvfb-run -a node <script>`. Créations et saisies via GUI ; Engine sert uniquement à créer deux projets synthétiques, API finale en lecture pour contrôler la conservation des définitions/réponses. Simulations uniquement : aucune qualification de service réel, fournisseur IA ou résultat métier. Le reset après lancement réel n’a pas été éprouvé par ce persona.
