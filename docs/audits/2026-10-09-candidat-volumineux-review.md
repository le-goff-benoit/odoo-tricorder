# Réception indépendante des copies de candidats volumineux

Date : 2026-10-09. Périmètre : `backend/connectors/candidate_sources.py`, `candidates.py`, `providers.py` et `tests/test_candidate_workspace.py`.

**Avis : reçu après correction du P2 découvert pendant la review.** La limite globale de 20 Mo est effectivement levée, les grosses pièces inchangées restent dans la copie et dans son inventaire de preuve. Aucun défaut P1 restant n’a été observé dans ce périmètre. Cette réception ne constitue ni une QA Odoo ni l’exécution de la release client.

## Vérifications indépendantes

La revue a lu les trois fichiers applicatifs, leur diff, les tests du développeur, les appels depuis `workflow_cli.py`/`runtime.py` et le lanceur suivi. Les contre-épreuves utilisent uniquement des dépôts et fichiers synthétiques temporaires. Aucun fournisseur réel, terminal utilisateur, projet client, service externe, build ou suite intégrale n’a été lancé. Le reviewer n’a modifié aucun fichier applicatif ni test partagé.

| Contrôle | Constat et preuve |
|---|---|
| Pièce binaire inchangée de 29 360 128 octets, supérieure au plafond historique | Conservée avec empreinte identique dans le workspace, la copie QA et le dépôt après application de deux petits changements texte. Aucun inode partagé avec la source. |
| Lecture des sources volumineuses | Instrumentation indépendante : 132 appels, lecture maximale de 1 048 576 octets. Aucun chargement complet de la grosse pièce par ce chemin. |
| Application partielle suivie d’une erreur disque simulée | Le premier fichier déjà modifié est restauré, le second reste original, aucun `applied_candidate` enregistré ; journal retiré après récupération réussie. |
| Erreur après une nouvelle édition utilisateur | L’édition utilisateur est conservée. La récupération refuse de l’écraser et garde le journal ; aucun succès d’application enregistré. |
| Annulation pendant la préparation | Annulation déclenchée après le premier fichier copié. Aucun appel de préparation de commande fournisseur ; message d’annulation et sources inchangées. |
| Disque plein après copie des sources, pendant matérialisation QA | P2 reproduit, corrigé par l’orchestrateur, puis reçu indépendamment : copie partielle supprimée, erreur exploitable, dépôt intact. |
| Cible QA préexistante | Refus de réutilisation ; fichier préexistant préservé. |
| Nouvelle matérialisation après résolution de l’erreur disque | Copie complète du candidat obtenue, sources originales inchangées. |

Preuves versionnées : [première campagne](2026-10-09-suivi-execution/candidate-review-before.json), [annulation indépendante](2026-10-09-suivi-execution/candidate-cancel-independent.json), [recontrôle après correction](2026-10-09-suivi-execution/candidate-review-after.json). Le dernier fichier donne les empreintes SHA-256 des quatre fichiers reçus.

Sondes locales exécutées : `/tmp/tricorder-candidate-review-probe.py`, `/tmp/tricorder-candidate-review-cancel.py`, `/tmp/tricorder-candidate-review-after.py`. La seconde campagne reprend uniquement la matérialisation modifiée et ses contre-épreuves, sans répéter les contrôles devenus inchangés.

## P2 trouvé et corrigé : copie QA partielle après ENOSPC

Avant correction, `materialize()` copiait les sources puis écrivait chaque changement sans nettoyage de cette seconde phase. Une erreur `ENOSPC` au deuxième changement laissait une copie volumineuse partiellement modifiée et remontait une `OSError` brute. Le CLI natif crée une nouvelle cible à chaque tentative : ces copies abandonnées pouvaient donc aggraver le manque d’espace. Le dépôt restait intact et la fonction ne renvoyait pas de chemin QA réussi ; aucune fausse validation n’a été constatée.

La correction entoure uniquement la phase suivant le retour réussi de `snapshot()`. Elle supprime la cible créée par cette tentative en cas d’erreur et explique quoi faire en cas de disque plein. Le `snapshot()` initial reste hors de ce nettoyage : une cible déjà existante n’est jamais considérée comme appartenant à la tentative. Ces trois comportements ont été reçus séparément : échec tardif nettoyé, cible existante préservée et nouvelle préparation réussie.

## Intégrité et garde d’application

La lecture confirme les points suivants, cohérents avec les tests ciblés du développeur et les contre-épreuves ci-dessus :

- Les fichiers Git suivis et les fichiers non ignorés admissibles sont inventoriés. Aucun retrait global des répertoires `release`, `changelog` ou `pieces` n’est introduit. Les exclusions préexistantes des dossiers internes, dépendances et noms sensibles restent explicites ; les suffixes PEM/KEY sont désormais insensibles à la casse.
- Les lectures/copies de sources se font par blocs de 1 Mio. Métadonnées avant/après lecture et nouvel inventaire après copie détectent les mutations pendant la préparation. Les répertoires et fichiers sources sont ouverts avec des descripteurs et `O_NOFOLLOW`.
- La capture compare les empreintes avant de charger le texte des seuls fichiers changés. Une grosse pièce inchangée reste couverte par le candidat sans être incorporée entière à son JSON. Les modifications de permissions et les liens physiques dans le workspace sont refusés.
- La matérialisation QA vérifie l’inventaire complet contre le candidat avant d’appliquer ses changements. L’application refait les empreintes des sources sans dupliquer une nouvelle fois le dépôt, puis recontrôle chaque fichier changé avant son écriture atomique.
- Les contrôles QA explicites, leurs preuves, le candidat exact, la réception du résultat et la confirmation humaine d’application sont conservés. Le correctif de volume n’assouplit pas ces conditions.
- Le journal permet une récupération après écriture partielle. S’il existe une édition ultérieure incompatible, il reste en place et la récupération s’arrête plutôt que d’écraser cette édition. « Rollback » ne signifie donc pas que toute modification concurrente sera annulée.

L’espace est vérifié sur le volume cible : préparation de deux copies (base et workspace), une copie pour la QA, estimation des métadonnées et réserve de 64 Mio. Le contrôle est préalable ; il ne réserve pas physiquement cet espace. L’erreur disque survenant ensuite reste traitée, y compris désormais pendant l’écriture des changements dans la copie QA.

## Limites exactes

- Aucun plafond global de 20 Mo n’est conservé pour les sources admissibles. La capacité du disque reste nécessaire pour les copies ; l’inventaire Git est plafonné à 2 000 000 octets et 10 000 fichiers admissibles.
- Au plus 100 fichiers changés ; contenu des fichiers texte changés limité à 2 000 000 octets. Cette limite concerne aussi l’ancien contenu nécessaire au diff : supprimer ou transformer une grosse pièce n’est pas une opération prise en charge. La conserver inchangée l’est.
- Candidat sérialisé, inventaire compris, et diff sont chacun limités à 2 000 000 octets. Le refus est explicite ; aucun candidat ou diff tronqué n’est accepté.
- Les changements attendus sont des textes UTF-8 sans NUL. Les contenus non décodables et les binaires contenant NUL sont refusés. Ce contrôle n’est pas une détection universelle de format binaire.
- Les sources non régulières et liens symboliques restent refusés ; un sous-module représenté par un répertoire dans l’inventaire Git ne devient pas automatiquement un dépôt inclus récursivement.
- Le contexte envoyé à l’IA contient une liste et des extraits bornés, avec nombre de chemins omis ; les fichiers restent consultables dans le workspace. Le contexte complet de la session conserve son autre plafond de 100 000 caractères.
- L’annulation est revérifiée **après** la préparation : la copie en cours peut aller à son terme avant ce refus. La contre-épreuve prouve l’absence de lancement du fournisseur, pas une interruption immédiate de l’I/O ni un effacement automatique des copies d’une exécution annulée.
- Les tests simulent des erreurs et interruptions contrôlées. Ils ne démontrent ni résistance à une panne matérielle, ni comportement d’un fournisseur réel, ni réussite des tests métier Odoo.

Les preuves du développeur sur son dépôt synthétique de 140 Mio et ses autres contrôles sont conservées dans `/tmp/tricorder-candidate-workspace-handoff.md` et `/tmp/tricorder-candidate-workspace-final.log`. Elles ont été examinées, sans être présentées comme une seconde exécution indépendante de la suite complète.
