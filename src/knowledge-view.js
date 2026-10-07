export function knowledgeView(data, esc) {
  const memory = data || {};
  const learned = (memory.contributions || []).filter(c => c.kind === 'discovery' && c.state === 'accepted' && c.current !== false && c.freshness !== 'stale');
  const decisions = (memory.decisions || []).filter(d => ['accepted','confirmed'].includes(d.status) && d.freshness !== 'stale');
  const receiptLessons = (memory.receipts || []).filter(r => r.text).map(r => ({statement:r.text, current:r.current, title:'Bilan du travail'}));
  const text = v => typeof v === 'string' ? v : v.text || v.statement || v.content || '';
  const unique = [...new Map([...receiptLessons, ...learned, ...(memory.learnings || [])].map(r => [text(r), r])).values()].filter(r => text(r));
  return `<div class="page knowledge-page"><h2>Ce que cette release nous a appris</h2><p class="muted">Les acquis établis sont conservés pour le prochain travail sur ce projet.</p><div class="knowledge-list">${unique.map(r => `<article class="info-card"><h3>${esc(r.title || 'Apprentissage')}</h3><p>${esc(text(r))}</p>${r.effect || r.consequence ? `<p><strong>Pour la suite :</strong> ${esc(r.effect || r.consequence)}</p>` : ''}<small>${r.current === false || r.freshness === 'stale' || r.state === 'stale' ? 'À vérifier avant réutilisation' : r.promoted || r.project_learning ? 'Intégré au projet' : 'Apprentissage de la release'}</small></article>`).join('') || '<p>Aucun apprentissage établi n’a encore été renseigné pour cette release.</p>'}</div>
    ${decisions.length ? `<h3>Décisions à conserver</h3><div class="knowledge-list">${decisions.map(d => `<article class="info-card"><p>${esc(d.statement || d.text || d.decision || '')}</p>${d.exceptions?.length ? `<p>Exceptions : ${esc(d.exceptions.join(' · '))}</p>` : ''}</article>`).join('')}</div>` : ''}
    ${(memory.warnings || []).length ? `<details class="technical-details"><summary>Informations de lecture</summary>${memory.warnings.map(w => `<p>${esc(w)}</p>`).join('')}</details>` : ''}</div>`;
}
