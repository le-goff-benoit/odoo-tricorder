# Critique visuelle — maquette v2

Maquette affichée dans Chrome isolé, captures 10–12 ; aucune lecture HTML. Aucun travail réellement exécuté.

L’aperçu sans création et les étapes nommées Préparer / Staging / Production corrigent le principal obstacle observé en rc.17. « Ce que vous obtenez », « Ce qu’il faut fournir » et les agents par étape sont lisibles immédiatement. Retour aux modèles explicite. Informations techniques repliables adaptées au public technique sans encombrer la lecture initiale.

Points à intégrer avant réception :

1. La carte dit seulement « nécessite les accès ». Il faut un état calculé de ce poste : prêt, connexion à configurer, capacité non disponible, avec détails. Sinon « une version livrée » reste une promesse alors que les contrôles rc.17 bloquaient honnêtement sans adaptateurs. Préserver cette transparence dans l’aperçu, pas uniquement après Lancer.
2. Trois étapes principales sont souhaitables si les détails conservent les opérations et décisions exactes. Staging et production doivent exposer quelle version, vers quelle cible, quelle autorisation et quelles preuves ; publier, attendre le build et réceptionner la version sont distincts dans le suivi. En cas d’échec du build ou de version différente, il faut afficher le blocage et empêcher la progression, sans masquer cela derrière une étape générique.
3. « Agent de livraison et vous » indique une collaboration mais pas sa frontière. Écrire concrètement : l’agent prépare/vérifie ; vous autorisez la publication exacte ; l’application n’avance qu’après vérification de la cible et version. L’utilisateur doit savoir ce qui demandera sa présence avant lancement.
4. Une information d’orchestration générique (« selon leurs dépendances ») est insuffisante pour un responsable technique. Montrer la règle du parcours : production attend réception staging ; qui réceptionne ; ce qui permet ou refuse une reprise. Pour d’autres modèles, indiquer explicitement travaux parallèles et qui consolide. Ne pas inventer du parallélisme dans une livraison séquentielle.
5. Les agents doivent exposer rôles, moyens et limites : profil d’agent, fournisseur/modèle, capacités réellement disponibles. Le nom seul « Agent de livraison » n’établit pas sa capacité à lire un build Odoo.sh.
6. Un résultat livré doit distinguer contrôles techniques réussis, critères métier validés et faits non vérifiés. L’identité de la version et ses cibles doivent être faciles à retrouver, sans ouvrir un journal interminable. L’action Réutiliser doit préparer une nouvelle occurrence et expliciter les informations conservées/changées.

Verdict : direction validée sur la compréhension de la méthode, réception impossible sur fiabilité de la livraison avant de voir préflight, contrôles, reprise et résultat fonctionner. L’aperçu doit simplifier la présentation tout en conservant la provenance des faits et les verrous effectifs.

Observation complémentaire : le détail ouvert des trois étapes est encore un texte générique (« Objectif, informations utilisées… »), donc ne qualifie pas encore ces points. « Voir les agents » ouvre une page générique Recherche / Analyse / Rédaction / Vérification ; l’Agent de livraison utilisé dans l’aperçu n’y apparaît pas. Le lien doit conduire aux agents effectivement référencés par le workflow, puis permettre d’explorer le catalogue, afin d’éviter une nouvelle impasse. La maquette a évolué pendant l’observation (libellé Informations techniques devenu Informations avancées) ; les captures conservent les états vus.
