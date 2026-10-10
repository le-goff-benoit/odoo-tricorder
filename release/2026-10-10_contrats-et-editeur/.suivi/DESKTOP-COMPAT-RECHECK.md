# Contre-épreuve des deux anciens parcours desktop

Build rc.13 inchangé, aucun rebuild ni fichier produit modifié. Rejeux isolés
sur :187 avec le helper clean ; suite complète en parallèle sur :189.

## Sauvegarde du profil Odoo Online

Le rouge original s’arrête après l’attente de 5 secondes, alors que la page affiche
« Lecture du projet… ». Le code sauvegarde le profil, relit le bootstrap, recharge
le projet puis ferme la modale. La trace prouve que le rechargement était encore
en cours ; elle ne prouve pas une perte de configuration ni sa cause de lenteur.

Deux rejeux **sans aucune modification du test** sont verts : 16,6 s puis 11,5 s
pour le parcours entier. Dans la seconde trace, cliquer Enregistrer prend 129,7 ms
et l’assertion Odoo Online réussit après 307,6 ms : 438 ms entre début du clic et
critère reçu. Profil `online`, police 16, contraste, association de conversation,
répertoire de travail et terminal sont tous vérifiés par les assertions originales.
Aucun timeout augmenté, aucune attente fixe ajoutée. Une lenteur ponctuelle reste
observée dans la suite complète ; sa cause système exacte n’est pas établie.

## Conservation de la conversation pendant l’inspection de l’éditeur

L’ancien parcours supposait que sélectionner un bloc ouvrait ses propriétés. La
nouvelle interaction compacte conserve le graphe et exige le bouton Propriétés.
Le test vérifie maintenant le graphe visible puis clique ce bouton. Trois lignes
ajoutées dans `tests/desktop.spec.cjs`, aucune assertion supprimée.

Rejeu **vert en 5,9 s** : brouillon conservé, fenêtre unique, conversation marquée,
PID original inchangé, échanges dans le même terminal, puis seconde conversation
OpenAI distincte tandis que la conversation Anthropic reste vivante.

Bilan du rejeu avec traces : **2/2 en 18,0 s**. Preuves et traces conservées sous
`preuves-corrections-ui/rc13-desktop-compat-recheck/` ; premier rejeu roadmap sous
`preuves-corrections-ui/rc13-roadmap-recheck/`. Le rouge original de la suite complète
reste à son emplacement initial pour archivage par le responsable.
