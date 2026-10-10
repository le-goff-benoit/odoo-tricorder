# Réception froide — persona 8, développeur senior sceptique

Candidat : `/tmp/tricorder-method-review-v4`, figé. Date : 10 octobre 2026. Parcours GUI uniquement, sans onboarding, lecture de code, README, tests ou rapports. Fenêtre Electron réelle sur Xvfb. Profil personnel isolé et métadonnées fournisseurs publiques fictives ; exécutables codex/claude inertes (exit 78). Aucun service externe, aucune exécution réelle ni simulation lancée. Les résultats ci-dessous qualifient l’interface et sa configuration, pas un fournisseur ni une livraison.

## Résultat

Consultation et personnalisation atteintes en environ cinq minutes ; chacune des deux intentions reste sous huit minutes. Le regroupement conserve les contrôles essentiels au niveau des travaux et du graphe détaillé. La configuration nécessaire pour une livraison réelle reste volontairement incomplète et le lancement est bloqué. Je ne qualifierais pas ce modèle comme un déploiement prêt à l’emploi.

## Intention 1 — comprendre GitHub → Odoo.sh et le regroupement

Attendu : retrouver les décisions staging et production, le candidat testé, le SHA exact, le build et la version déployée malgré des étapes regroupées.

Parcours : accueil → Workflows → Modèles → « Livraison Odoo : test puis production » (clic sur le titre) → aperçu → détails de la première étape. Le catalogue n’appelle pas le modèle GitHub → Odoo.sh ; ces noms apparaissent dans les blocs détaillés.

Observé : aperçu à trois étapes, « Vérifier la livraison en test », « Livrer et vérifier en production », « Notes de release ». La production dépend de la vérification en test. Les travaux détaillent la question humaine, la publication et les contrôles build/version. Les noms exacts staging/production et GitHub/Odoo.sh deviennent explicites dans l’éditeur détaillé à huit blocs. Les notes de release sont précédées d’une condition.

Verbatim GUI :
- « Vérifier le dépôt, la branche, le SHA testé et le retour arrière avant publication. »
- « Le SHA publié correspond au candidat testé et à la branche autorisée. »
- « Le build réussi porte le SHA publié. »
- « La version effectivement déployée et les contrôles de santé correspondent à la cible. »
- « Consultation du modèle · aucune copie ni exécution créée. »

Preuves : `03-modeles.png`, `04-livraison-modele.png`, `07-test-travaux.png`, `11-detaille-ouvert.png`.

Appréciation : compréhension atteinte. Friction mineure : l’aperçu général parle de « Vous » et « Tricorder et les outils configurés » ; les noms de décisions et les cibles précises demandent l’ouverture d’un travail ou de l’éditeur détaillé. Aucun élément observé ne prouve une perte des contrôles lors du regroupement. La conservation des preuves d’une exécution n’a pas été testée.

## Intention 2 — personnaliser une copie et identifier le manque réel avant lancement

Attendu : créer une variante sans écraser le modèle intégré, conserver une opération et une décision sur le même candidat exact, puis comprendre les blocages avant toute action externe.

Parcours : « Personnaliser une copie » → nom « Senior — déploiement SHA exact » → création → premier travail → ajout de points à vérifier → Appliquer → Enregistrer → Options → Éditeur détaillé → publication staging → Propriétés → cible fictive `FIXTURE_NON_EXECUTEE/staging` et SHA fictif de 40 caractères `aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa` → cocher « Relier cette décision et y copier l’opération exacte » → Appliquer → Enregistrer → inspecter décision staging → Exécuter… → ouvrir le volet automatique, sans lancer.

Observé : la copie est enregistrée dans les modèles partagés et garde son origine. Révision 2 après les critères, révision 3 après configuration de l’opération. Les points à vérifier ajoutés restent visibles dans la vue simple et dans la décision. Après la copie explicite de l’opération, les propriétés de la décision affichent la même cible fictive et le même SHA de 40 caractères que la publication. Aucun changement production n’a été effectué ; les valeurs à confirmer restent présentes.

Contrôle réel manquant identifié : les opérations de publication staging/production n’ont pas de connexion associée. La cible et le candidat production restent à renseigner. En automatique, les blocs de contrôle « Vérifier build et version Odoo.sh » demandent un contenu de document ou une capacité de lecture : il manque donc une collecte réelle permettant de confronter build réussi, SHA publié et version effectivement déployée. Le texte du contrôle ne constitue pas cette preuve. Les liens du graphe indiquent un ordre d’exécution sans donnée transmise ; une dépendance temporelle ne démontre pas la transmission du SHA ou de l’accusé de publication.

Verbatim GUI :
- « Relier cette décision et y copier l’opération exacte »
- « Opération externe non connectée : aucune publication ni livraison réelle disponible. »
- « Configurez et vérifiez une connexion, puis associez sa capacité à cette étape. »
- « Renseigner la cible et le candidat exacts du modèle avant exécution. »
- « Contenu du document ou capacité de lecture à configurer. »
- « Ordre d’exécution uniquement · aucune donnée transmise »

Les boutons « Lancer dans le terminal » et « Lancer l’exécution réelle » sont désactivés. « Simuler le parcours » reste proposé. Je n’ai utilisé aucun des trois : une simulation n’aurait pas qualifié le service, le build, la version ou la qualité métier.

Preuves : `05-personnalisation.png`, `06-copie-editeur.png`, `09-copie-modifiee.png`, `12-proprietes-publication.png`, `14-copie-operation-exacte.png`, `16-decision-operation-synchronisee.png`, `15-pre-lancement.png`, `18-controles-automatiques-ouverts.png`.

Appréciation : personnalisation et diagnostic préalable atteints. Garde du lancement observée, gravité d’un défaut : aucune. Risque métier restant, majeur si l’on prétendait livrer : aucun adaptateur de publication ni lecture réelle build/version n’est qualifié. Ce manque est annoncé et empêche le lancement ; il n’est pas une livraison échouée. Friction mineure : la copie exacte de la décision nécessite une case explicite ; avant de la cocher, la décision conservait ses valeurs à confirmer. La case permet de résoudre ce décalage sans code.

## Incidents de harnais, exclus des défauts produit

Premier lancement Node effectué sans TTY : stdin fermé, reprise avec TTY dans un nouveau profil. Le premier processus et son service PTY ont été arrêtés. Lecture `body.innerText` ne traversant pas le Shadow DOM : reprise par inspection des éléments GUI et captures. Un sélecteur de label exact n’a pas trouvé « Travail à effectuer » (30 secondes) ; seul le champ « Points à vérifier » a été effectivement personnalisé. Un clic cherchant « Options » comme bouton a été corrigé en clic sur son libellé de summary. Un titre du volet automatique était masqué tant que son summary restait fermé : ouverture du volet puis capture. Ces reprises concernent les sélecteurs du harnais et ne sont pas des échecs de clic d’un utilisateur.

## Fermeture

Fenêtre Electron fermée. Les deux services PTY propres aux profils senior, le processus Node du harnais et Xvfb :98 ont été arrêtés. Aucun processus d’un autre receveur n’a été touché. Profils de test conservés sous `/tmp/tricorder-senior-*` comme données de réception isolées ; aucune donnée du profil utilisateur n’a été lue.
