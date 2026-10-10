# Contre-épreuve services — reçue

Candidat figé `/tmp/tricorder-rc16-reception`, affichage 1440 × 1000, profil synthétique et fournisseurs inertes. Script autonome `parcours.cjs`, sortie finale 0. Aucun service réel appelé.

Les trois corrections proposées sont reçues :

- **Objectif ou consigne complémentaire (facultatif)** explique que les informations saisies sont déjà transmises à l’agent. J’ai laissé ce champ vide, rempli les faits, l’impact et la destination ticket Odoo, puis lancé la simulation avec succès. La redondance perçue a disparu.
- Les champs plus compacts laissent la consigne et son aide lisibles. **Simuler le parcours** reste accessible dans le cadre initial, à y = 901 sur une hauteur de 1000 pixels, sans descendre jusqu’au bas de tous les réglages. Capture conseillée pour le README : `formulaire-support.png`.
- Dans Connexions, le chemin `plugins.json` se trouve dans **Configuration technique de la connexion**, replié par défaut. Le bouton de configuration et les états de service sont immédiatement lisibles. Capture : `connexions.png`.

Verdict : **adoption confirmée**, aucune réserve restante pour ces trois observations. Cet essai ne qualifie toujours pas un fournisseur IA ni un service externe.

Incident du pilote : une première lecture du libellé a précédé le chargement asynchrone du formulaire ; le script attend désormais le champ cible. Le rejeu corrigé termine sans erreur. Aucun changement aux sources ni aux profils clients.
