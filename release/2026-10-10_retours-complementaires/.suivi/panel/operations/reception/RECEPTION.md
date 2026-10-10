# Contre-épreuve opérations — réception rc16

Candidat figé `/tmp/tricorder-rc16-reception`. Même scénario synthétique que le rapport initial, exécuté dans un nouveau profil isolé et une fenêtre 1440 × 1000. Aucune source ni donnée client modifiée.

## Résultat

- **P2 reçu** : la carte propose désormais « Configuration et réponses · révision 2 ». Le détail conserve ce titre et présente « Modifier les réponses ou la version… ». Le bandeau explique expressément que les réponses et la version sont conservées pour chaque occurrence et indique l’action pour les changer. Je n’ai plus à deviner qu’une « version » cache les réponses.
- **P3 reçu** : le texte de création indique directement « Workflows → Workflows enregistrés ».
- **P3 amélioré, accepté** : les libellés et contrôles du formulaire sont alignés sur une même ligne. Le champ Oui / Non, ses aide et obligation tiennent dans une hauteur nettement réduite, sans texte tronqué. Le formulaire complet nécessite encore un défilement ; cela reste cohérent avec deux champs et les paramètres de notification et n’empêche pas de terminer.
- **Non-régression vérifiée** : remplacement conservant Logistique / Non, modification vers Ventes / Oui, activation puis consultation du détail final. Le dialogue d’archivage reste explicite ; le changement de vocabulaire n’a pas changé le comportement du moteur.

Adoption favorable sur ces deux intentions. Le point de découverte de la planification est suffisamment explicite pour ne plus exiger une explication ponctuelle.

## Preuves

`parcours.cjs`, `execution.log`, captures 01–10 et `ecrans.txt` dans ce dossier. La capture 04 montre la disposition compacte, 06–07 les nouveaux accès, 09 les réponses reprises, 10 les réponses modifiées. Le premier rejeu attendait encore l’ancien titre « Version planifiée » dans une assertion du pilote ; cette attente a été corrigée, et son journal est conservé sous `pilote-ancien-titre.log`. Ce n’est pas un défaut de l’application.

Aucun fournisseur actif, service externe ou déclenchement futur réel n’est qualifié par cette contre-épreuve.
