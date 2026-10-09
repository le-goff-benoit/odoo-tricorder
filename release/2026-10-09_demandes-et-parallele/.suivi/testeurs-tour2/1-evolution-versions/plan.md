# Tour 2 — évolution de workflows pendant leur utilisation

Profil : Product Owner / analyste métier (9/10), technique (3/10). Scénarios indépendants des rapports du tour 1 et des autres testeurs.

Banc : cinq parcours dans un projet synthétique « Procédures Achats et RH », affichage :181. HOME, XDG, state, runtime, codex et claude temporaires ; deux CLIs factices avant premier GUI/broker. Aucun paquet lancé tant que son chemin et son SHA ne sont pas autorisés. Fixtures préparées par API moteur du paquet autorisé ; pas de mutation d’état SQLite/JSON.

1. **Une procédure achats change pendant une demande de devis en attente** : ouvrir l’exécution V1 puis le workflow, modifier consigne, ports I/O et fournisseur/modèle. Attendu : nouvelle révision enregistrée, ancienne demande et question conservées.
2. **Une nouvelle commande utilise V2, l’ancienne reste en V1** : lancer depuis l’UI la révision enregistrée et revenir à la demande précédente. Attendu : les deux générations sont reconnaissables ; réponse ancienne appliquée uniquement à son exécution et contrat ancien figé.
3. **Le terminal et mon éditeur changent la même procédure RH** : garder un brouillon avec une consigne RH locale puis modifier le fichier de définition synthétique depuis le terminal (consigne concurrente et description distincte). Enregistrer, examiner la comparaison, choisir mon champ puis fusionner. Attendu : conservation des modifications distinctes et choix explicite du conflit ; aucune perte silencieuse.
4. **Une ancienne exécution ne peut lancer son agent** : consulter une demande avec un modèle manquant, utiliser l’action proposée pour configurer une copie. Attendu : copie distincte, demande reportée, config corrigeable ; résultats et décisions anciens non transférés.
5. **Changer le pack métier et le fournisseur** : installer via aperçu UI un pack achat V1 puis V2, changer l’IA d’un nouveau workflow sans altérer critères/ports/consigne. Attendu : ancien run conserve pack et IA figés ; nouveau lancement présente la configuration mise à jour, le contrat métier reste lisible et intact.

Preuves : captures UI par scénario, journal des gestes et valeurs observées ; lecture API moteur complémentaire pour vérifier ce qui est effectivement figé. Un retour de dossier natif simulé sera déclaré comme limite. Aucune simulation ne vaut preuve fournisseur.
