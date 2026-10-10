const esc=value=>String(value ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function connectionStatus(capability) {
  if(capability.plugin_id && capability.qualified)return 'Adaptateur vérifié';
  if(capability.plugin_id && !capability.transport)return 'Détecté · connexion non vérifiée';
  if(['codex','claude'].includes(capability.id) && !capability.plugin_id && (capability.connected!==true || capability.qualified!==true))return capability.installed?'Installé · connexion à vérifier':'À installer';
  if(!capability.plugin_id && !['command','codex','claude'].includes(capability.id))return 'Service proposé · à configurer';
  return capability.usable?'Utilisable':'À configurer';
}
export function connectionEvidence(capability) {
  if(!capability.plugin_id)return !['command','codex','claude'].includes(capability.id)?'<p class="muted">Service proposé par Tricorder. Cette carte ne prouve pas qu’un compte est connecté.</p>':'';
  if(!capability.qualified)return '<p class="muted">La présence du plugin dans le fournisseur ne vérifie ni son accès dans Tricorder ni une opération métier.</p>';
  const effects={read:'Lecture',write:'Écriture',notify:'Notification'};
  return `<section class="connection-evidence"><p>Transport et identité vérifiés${capability.verified_at?' le '+esc(new Date(capability.verified_at*1000).toLocaleString('fr-CH')):''}.${capability.identity?' Compte ou service : '+esc(capability.identity)+'.':''}</p><ul>${Object.entries(capability.effects || {}).map(([operation,effect])=>`<li><strong>${esc(operation)}</strong> · ${esc(effects[effect] || effect)} · opération annoncée par l’adaptateur</li>`).join('')}</ul><p>Ce contrôle n’exécute pas les opérations métier. Leur réussite se vérifie dans le résultat et les preuves de chaque exécution réelle ; une simulation ne les qualifie pas.</p></section>`;
}
