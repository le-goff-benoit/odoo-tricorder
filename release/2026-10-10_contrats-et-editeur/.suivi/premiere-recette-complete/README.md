# Première recette complète — diagnostic conservé

Le premier passage sur les sources a terminé avec **163 succès, huit échecs et
deux tests optionnels ignorés**. Ce passage n'est pas une réception de livraison.
Son journal et ses traces rouges sont conservés dans ce dossier, ainsi que dans
les dossiers spécialisés des deux relecteurs.

| Parcours en échec | Diagnostic et traitement |
|---|---|
| Profil Odoo Online après sauvegarde | Rejoué deux fois sans modification : vert. Le délai du premier passage n'est pas expliqué ; aucune assertion ni attente n'a été assouplie. |
| Intégration fenêtre / propriétés | Le scénario supposait l'ouverture implicite du formulaire. Il ouvre maintenant explicitement Propriétés ; les assertions de graphe, fenêtre et sessions restent présentes. |
| Processus de premier plan du terminal | Rejoué sans modification : vert. La cause du premier passage reste indéterminée ; réception complète nécessaire. |
| Reconfiguration après échec avec demande longue | Régression produit : le titre attendait une chaîne, alors que le texte était archivé. Correction du titre et conservation intégrale du texte. La relecture a aussi couvert remplacement, résultat et réponse asynchrone périmée. |
| Focus après ajout d'un bloc | Régression produit : la carte reprenait toujours le focus, même avec les propriétés ouvertes. Le titre reçoit désormais le focus lorsque son formulaire est visible. |
| Navigation au redémarrage | Rejoué sans modification : vert. La cause du premier passage reste indéterminée ; réception complète nécessaire. |
| Enregistrement Ctrl+S dans un champ | Régression produit : le filtre des champs empêchait le raccourci d'enregistrement. Le test lit maintenant aussi le graphe effectivement sauvegardé. |
| Question illustrée par un email sur petit écran | Régression produit : les aperçus de données se répétaient et repoussaient la réponse. L'aperçu est borné ; sources, question, réponse et bouton sont vérifiés dans le viewport. |

Les contre-épreuves sont détaillées dans
[la réception UI](../RECEPTION-CORRECTIONS-UI.md),
[la vérification du bureau](../DESKTOP-COMPAT-RECHECK.md) et
[la revue des demandes longues](../REVIEW-LONG-REQUEST.md).
Les résultats définitifs sont distincts, dans [la réception finale](../reception-finale.md).
