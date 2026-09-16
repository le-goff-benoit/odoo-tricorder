// Shared synthetic content for the three design variants (Orbital project).
window.TRICORDER_MOCK = {
  projects: [['equinox-studio', '19.1'], ['nova-services', '18.0'], ['orbital-industries', '19.0']],
  tabs: ['Terminal', 'Intentions', 'Plan', 'Mémoire', 'Express', 'Agents', 'Temps', 'Projet'],
  rows: [
    { id: 'Principal', kind: 'orch', title: 'Orchestration de la release', meta: 'Codex principal · Examine le résultat de T01 · modèle principal', badge: ['Orchestration', 'orch'], activity: ['codex', 'Orchestration en cours · Examine le résultat de T01', '00:08'] },
    { id: 'I02', kind: 'intent', title: 'Relancer automatiquement les impayés', meta: 'L’orchestrateur doit encore construire le plan de cette demande.', badge: ['À planifier', 'neutral'] },
    { id: 'T01', kind: 'task', title: 'Fiabiliser les factures partielles', meta: 'Contrôle à actualiser', badge: ['Réceptionnée', 'ok'], risk: true },
    { id: 'T02', kind: 'task', title: 'Planifier les interventions récurrentes', meta: 'Codex · développeur · Développement du module', badge: ['Prise en charge', 'warm'], activity: ['claude', 'Travail en cours', '00:08'] },
    { id: 'T03', kind: 'task', title: 'Recetter les documents de la release', meta: 'Après T01, T02', badge: ['En attente', 'neutral'], activity: ['claude', 'Commande en cours', '00:08'] },
  ],
};
