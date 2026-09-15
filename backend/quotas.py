"""Provider account quotas, never inferred from project usage or credentials."""
import json
import math
from pathlib import Path
import time

from observation import iso, instant

FRESH_SECONDS = 300


def number(value, minimum=0, maximum=None):
    if isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value):
        return None
    return value if value >= minimum and (maximum is None or value <= maximum) else None


def window(key, value, minutes=None, claude=False):
    if not isinstance(value, dict):
        return None
    used = number(value.get('used_percentage' if claude else 'usedPercent'), maximum=100)
    duration = minutes if claude else number(value.get('windowDurationMins'), minimum=1)
    reset = number(value.get('resets_at' if claude else 'resetsAt'), minimum=1, maximum=253402300799)
    return {'id': key, 'label': '5 h' if duration == 300 else '7 jours' if duration == 10080 else f'{duration:g} min' if duration else key,
            'usedPercent': used, 'windowMinutes': duration, 'resetsAt': iso(reset)}


def normalize(provider, payload, observed_at=None):
    observed_at = time.time() if observed_at is None else observed_at
    payload = payload if isinstance(payload, dict) else {}
    windows = []
    if provider == 'codex':
        buckets = payload.get('rateLimitsByLimitId')
        if not isinstance(buckets, dict) or not buckets:
            buckets = {'codex': payload.get('rateLimits')}
        for bucket, limits in buckets.items():
            if not isinstance(limits, dict):
                continue
            for key in ('primary', 'secondary'):
                value = window(f'{bucket}:{key}', limits.get(key))
                if value:
                    value['bucket'] = str(bucket)[:120]
                    windows.append(value)
    else:
        limits = payload.get('rate_limits') or {}
        if isinstance(limits, dict):
            for key, minutes in (('five_hour', 300), ('seven_day', 10080)):
                value = window(key, limits.get(key), minutes, True)
                if value:
                    windows.append(value)
    return {'provider': provider, 'source': 'account/rateLimits/read' if provider == 'codex' else 'Claude statusLine',
            'observedAt': iso(observed_at), 'identity': 'unknown', 'availability': 'available' if any(w['usedPercent'] is not None for w in windows) else 'unavailable',
            'windows': windows, 'warnings': ['Identité du compte non exposée par cette source ; les sessions ne sont jamais additionnées.']}


def freshness(value, now=None):
    now = time.time() if now is None else now
    observed = instant(value.get('observedAt'))
    stale = observed is None or now - observed > FRESH_SECONDS or observed > now + 30
    for item in value['windows']:
        reset = instant(item.get('resetsAt'))
        item['stale'] = stale or reset is not None and now >= reset
        if item['stale']:
            item['lastUsedPercent'] = item['usedPercent']
            item['usedPercent'] = None
    if value['windows'] and all(w['stale'] for w in value['windows']):
        value['availability'] = 'stale'
    return value


def snapshot(sources=()):
    import codex_runtime
    try:
        codex = normalize('codex', codex_runtime.rate_limits())
    except (OSError, ValueError, BrokenPipeError):
        codex = normalize('codex', {})
        codex['observedAt'] = None
        codex['warnings'] = ['Service Codex existant indisponible ou quota non exposé. Aucun appel de modèle effectué.']
    candidates = []
    for source in list(dict.fromkeys(sources))[-100:]:
        try:
            path = Path(source)
            if path.is_symlink() or path.stat().st_size > 65536:
                continue
            value = json.loads(path.read_text())
            if value.get('provider') == 'claude' and isinstance(value.get('windows'), list):
                observed = instant(value.get('observedAt'))
                if observed is None:
                    continue  # A cache without provenance never becomes a fresh observation.
                # Re-normalize the allowlisted collection, never return arbitrary file fields.
                payload = {'rate_limits': {w['id']: {'used_percentage': w.get('usedPercent'), 'resets_at': instant(w.get('resetsAt'))}
                                          for w in value['windows'] if isinstance(w, dict) and w.get('id') in ('five_hour', 'seven_day')}}
                candidate = normalize('claude', payload, observed)
                candidates.append(candidate)
        except (OSError, ValueError, KeyError, TypeError, OverflowError):
            continue
    claude = max(candidates, key=lambda v: v['observedAt']) if candidates else normalize('claude', {})
    if not candidates:
        claude['observedAt'] = None
        claude['warnings'] = ['En attente du statusLine d’une session Claude lancée ici ; champ réservé aux abonnements compatibles après une réponse.']
    elif len(candidates) > 1:
        claude['warnings'].append('Dernière session observée uniquement ; compte commun non vérifiable entre sessions.')
    return [freshness(codex), freshness(claude)]
