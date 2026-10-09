# Consolidation des cinq avis fonctionnels — tour 1

Les cinq avis portent sur le même paquet initial, identifié dans `paquet-initial.json`. Les testeurs ont surtout des profils métier (BA, chef de projet, responsable support/livraison). Ils ont inventé des parcours distincts et examiné l’interface avant de rechercher des causes dans le code. Aucun avis ne qualifie un fournisseur commercial, une vraie notification ni une livraison Odoo. Les observations de banc sont distinguées des bugs.

**Décision : ne pas publier le paquet initial.** Le suivi multi-demandes n’est pas reçu comme parcours complet : l’interface ne permet pas la consolidation après plusieurs demandes et « prête » confond disponibilité métier et possibilité de lancer un agent. Le modèle Support échoue en simulation. Deux erreurs de rafraîchissement donnent des indications incorrectes.

| Priorité | Constats croisés | Correction retenue | Preuve attendue |
|---|---|---|---|
| P1 | C1, F1, support 4, LP-01 : faux accueil vide malgré workflows | Entrée Activité sans projet ; mémorisation du choix ; aucun déplacement d’état | Entrée normale, reprise et mêmes PTY |
| P1 | Projets A1 : prérequis unique | Sélection multiple, recherche/pagination, attente de tous les prérequis | C1 après R1–R4 depuis le formulaire |
| P1 | Projets A2 : prête sans modèle / capacité native | Préflight affiché en lecture ; nombre lançable ; continuation terminal ou nouveau lancement explicite | Pas de processus indu, pas de version figée retouchée |
| P1 | LP-03 : simulation Support rouge | Exemples synthétiques typés dans les modèles fournis | Contrats maintenus, interventions et branches atteignables |
| P1 | Support : détail périmé après fin | Rafraîchissement de l’inspecteur avec conservation de la saisie et du focus utiles | Fin reçue alors que le détail a le focus |
| P1 | Support : amont annulée encore À traiter | États exacts, reprise impossible expliquée, création d’un remplacement explicite | Ancien état conservé et aucune validation transférée |
| P2 | F2 : réponse tardive `null.query` | Capturer paramètres, contrôler contexte après réponse | Réponse retenue puis navigation vers éditeur |
| P2 | C2/C3/C5 : consigne Tâche, types, Enregistré trompeur | Consigne sur Tâche, types lisibles, appliquer le formulaire avant choix IA/sauvegarde | Saisie retrouvée dans la définition et après réouverture |
| P2 | F3/F5, support 2/3, LP-04 : preuves / JSON / décisions | Nom et type des nouvelles preuves ; actions en tableau ; question/réponse ; labels français ; JSON replié | Données conservées, contenu échappé, grandes preuves consultables |
| P2 | F4, LP-02 : conversations homonymes | Intention et date dans reprise ; intention dans onglet et avertissement autre conversation | Deux conversations du même modèle, même processus après reprise |
| P2 | LP-06 : configuration connexion sans prochaine étape | Guide local et consigne précise pour l’agent, distinction déclaration/vérification | Pas d’association ni d’envoi implicite ; manques honnêtes |

## Éléments qui ne sont pas maquillés en correctifs

- **C4** : un véritable éditeur de profils d’agents n’existe pas encore. Les profils de packs et l’agent généraliste restent disponibles. Ajouter un formulaire superficiel ne prouverait pas l’interopérabilité des agents.
- **C6** : Nouvelle demande permet déjà l’adaptation d’un workflow entre projets ; la création d’un modèle depuis un autre workflow demeure indirecte. Les deux usages doivent être distingués.
- **Projets A3** : plusieurs demandes terminées ne créent pas automatiquement un rapport parent consolidé. Une demande de bilan peut maintenant dépendre de toutes, mais le lien formel parent/enfants et la fusion de candidats code restent des travaux d’architecture (`ANALYSE.md`).
- **LP-05** : le petit écran permet validation et navigation au clavier ; diminuer encore le terminal contredirait le besoin de terminal principal. Conserver des lignes utiles et tester les actions dans cette contrainte. Aucun changement de zoom imposé à l’utilisateur.
- **LP-06** : le guide améliore la prise en main ; il ne remplace pas un formulaire OAuth ni un adaptateur installé. Aucun canal externe ne sera annoncé fonctionnel sans recette propre.
- La collecte de plusieurs demandes ne déclenche pas un ordonnanceur durable de sous-agents. Le lancement d’une vague est explicite et limité à quatre exécutants ; la réception ne doit pas confondre agent configuré, processus lancé et résultat accepté.

## Réception suivante

Après application et contrôles ciblés, geler un nouveau paquet et lancer **cinq nouveaux testeurs Sol 6.1 high**, avec des missions différentes : évolution/versioning en cours, charge métier et nombreuses conversations, interruptions/persistance, transfert/réutilisation entre équipes/projets, réception des livrables et connexions. Ils ne doivent pas lire les avis des premiers testeurs avant leurs observations. Ils peuvent varier leur parcours et doivent signaler tout problème adjacent, avec preuves et limites du banc.

Les corrections restent locales tant que cette deuxième vague n’a pas été consolidée. Les releases clientes et les autres données réelles n’ont pas été modifiées par cette campagne.
