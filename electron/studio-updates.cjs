'use strict';
const repository = 'https://github.com/le-goff-benoit/odoo-tricorder';
const endpoint = 'https://api.github.com/repos/le-goff-benoit/odoo-tricorder/releases/latest';

function version(value) {
  const match = /^v?(\d+)\.(\d+)\.(\d+)(?:-([a-zA-Z0-9.-]+))?$/.exec(value || '');
  return match ? { numbers: match.slice(1, 4).map(Number), preview: Boolean(match[4]) } : null;
}
function newer(candidate, current) {
  const a = version(candidate), b = version(current);
  if (!a || !b || a.preview) return false;
  for (let i = 0; i < 3; i++) if (a.numbers[i] !== b.numbers[i]) return a.numbers[i] > b.numbers[i];
  return b.preview;
}
function releaseInfo(data, current) {
  if (!data || data.draft || data.prerelease || !version(data.tag_name)) throw new Error('Format de release inconnu');
  const info = { current, latest: data.tag_name, status: newer(data.tag_name, current) ? 'available' : 'current',
    notes: String(data.body || '').slice(0, 20000), url: `${repository}/releases/tag/${encodeURIComponent(data.tag_name)}`, checked: Date.now() };
  const asset = (data.assets || []).find(a => /^odoo-tricorder_[a-zA-Z0-9.~+-]+_amd64\.deb$/.test(a.name || '') && a.state === 'uploaded');
  if (asset && asset.browser_download_url === `${repository}/releases/download/${encodeURIComponent(data.tag_name)}/${asset.name}`) info.download = asset.browser_download_url;
  return info;
}
async function check(current, fetcher = fetch) {
  try {
    const response = await fetcher(endpoint, { signal: AbortSignal.timeout(5000), redirect: 'error', headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'Tricorder/' + current } });
    if (!response.ok) throw new Error('GitHub indisponible');
    const text = await response.text();
    if (text.length > 1_000_000) throw new Error('Réponse volumineuse');
    return releaseInfo(JSON.parse(text), current);
  } catch {
    return { current, status: 'unavailable', checked: Date.now(), reason: 'Vérification GitHub indisponible. Votre travail continue ; réessayez plus tard.' };
  }
}
module.exports = { newer, releaseInfo, check };
