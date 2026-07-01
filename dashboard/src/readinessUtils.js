export function freshnessToDays(freshness) {
  if (typeof freshness === 'number' && !Number.isNaN(freshness)) {
    return Math.trunc(freshness);
  }

  const text = String(freshness || '1 Month').trim().toLowerCase();
  const match = text.match(/^(\d+)\s*(week|month|year)s?$/);
  if (!match) return 30;

  const amount = Number(match[1]);
  const unit = match[2];
  if (unit === 'week') return amount * 7;
  if (unit === 'month') return amount * 30;
  if (unit === 'year') return amount * 365;
  return 30;
}

export function parseReleaseDate(dateStr) {
  if (!dateStr || dateStr === 'N/A' || dateStr === 'Pending Analysis') return null;
  const isoMatch = String(dateStr).match(/(\d{4}-\d{2}-\d{2})/);
  if (!isoMatch) return null;
  const [year, month, day] = isoMatch[1].split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function isWithinReviewWindow(dateStr, windowDays) {
  const releaseDate = parseReleaseDate(dateStr);
  if (!releaseDate) return true;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const cutoff = new Date(today);
  cutoff.setDate(cutoff.getDate() - windowDays);
  releaseDate.setHours(0, 0, 0, 0);
  return releaseDate >= cutoff;
}

/** Build a readiness row from backend-written Firestore fields only. */
export function buildReadinessRow(url, reviewWindowDays) {
  const storedDate = url.last_date && url.last_date !== 'N/A' ? url.last_date : 'Pending Analysis';
  const storedStatus = url.last_status || 'Ready';
  const storedAction = url.next_action || 'Monitoring';
  const isStale = storedDate !== 'Pending Analysis' && !isWithinReviewWindow(storedDate, reviewWindowDays);

  if (isStale) {
    return {
      integration: url.name,
      status: 'Ready',
      impact: 'No Changes',
      action: 'Monitoring',
      last_date: 'Pending Analysis',
      isStale: true,
    };
  }

  return {
    integration: url.name,
    status: storedStatus,
    impact: url.last_impact || 'No Changes',
    action: storedAction,
    last_date: storedDate,
    isStale: false,
  };
}

export function statusBadgeClass(status) {
  if (status === 'Action Required') return 'badge badge-red';
  if (status === 'Needs Review') return 'badge badge-yellow';
  return 'badge badge-green';
}
