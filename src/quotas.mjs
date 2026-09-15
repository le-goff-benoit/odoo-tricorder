import { providerIcon } from './provider-brand.mjs';
// A quota belongs to the provider account, never to the selected project.
export function quotaPresentation(snapshot = {}, now = Date.now()) {
  const age = snapshot.observedAt ? now - Date.parse(snapshot.observedAt) : Infinity;
  const windows = (snapshot.windows || []).map(window => {
    const reset = window.resetsAt ? Date.parse(window.resetsAt) : null;
    const stale = !!window.stale || !Number.isFinite(age) || age > 300000 || age < -30000 || reset !== null && reset <= now;
    const usedPercent = !stale && Number.isFinite(window.usedPercent) ? window.usedPercent : null;
    return { ...window, stale, usedPercent, severity: usedPercent === null ? 'unknown' : usedPercent >= 95 ? 'danger' : usedPercent >= 80 ? 'warning' : 'normal',
      text: usedPercent === null ? (stale ? 'À actualiser' : 'Non disponible') : `${Math.round(usedPercent)} %`,
      resetText: Number.isFinite(reset) ? new Date(reset).toLocaleString('fr-CH', { dateStyle: 'short', timeStyle: 'short' }) : 'Non communiqué' };
  });
  const availability = windows.some(w => w.usedPercent !== null) ? 'available' : windows.some(w => w.stale) ? 'stale' : 'unavailable';
  return { ...snapshot, windows, availability, label: snapshot.provider === 'claude' ? 'Claude' : 'Codex',
    summary: windows.length ? windows.map(w => `${w.label} : ${w.text}`).join(' · ') : 'Quotas non disponibles',
    freshness: Number.isFinite(age) && age >= 0 ? (age < 60000 ? 'À l’instant' : `Il y a ${Math.floor(age / 60000)} min`) : 'Aucune observation' };
}

export function quotaPanel(snapshots = [], escape = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])), now = Date.now()) {
  return `<details class="quota-panel"><summary>Limites des comptes ${['codex', 'claude'].map(provider => {
    const q = quotaPresentation(snapshots.find(s => s.provider === provider) || { provider }, now);
    return `<span class="quota-chip" data-availability="${escape(q.availability)}">${providerIcon(provider)} ${q.label} · ${escape(q.summary)}</span>`;
  }).join('')}</summary><div class="quota-content"><p>Consommation du compte fournisseur · seuils visuels 80 % et 95 %.</p>${['codex', 'claude'].map(provider => {
    const q = quotaPresentation(snapshots.find(s => s.provider === provider) || { provider }, now);
    return `<section aria-label="Limites ${q.label}"><h3>${providerIcon(provider)} ${q.label}</h3>${q.windows.map(w => `<div class="quota-window" data-severity="${w.severity}"><strong>${escape(w.label)}${w.bucket ? ` · ${escape(w.bucket)}` : ''}</strong> <span>${escape(w.text)}</span>${w.usedPercent === null ? '' : `<meter min="0" max="100" low="80" high="95" optimum="0" value="${w.usedPercent}" aria-label="${escape(q.label + ' ' + w.label + ' consommé')}"></meter>`}<small>Réinitialisation : ${escape(w.resetText)}</small></div>`).join('') || '<p>Non disponible</p>'}<small>${escape(q.source || 'Source non observée')} · ${escape(q.freshness)}</small>${(q.warnings || []).map(w => `<p class="quota-note">${escape(w)}</p>`).join('')}</section>`;
  }).join('')}</div></details>`;
}
