/**
 * Industry Opportunity UI helpers (Phase 3)
 * SkillBridge / SIH 26044 — Academia–Industry Portal
 *
 * Shared presentation metadata + date/budget formatters so the list,
 * form, and detail pages stay visually consistent with one source of
 * truth for badge styling.
 */

export const OPPORTUNITY_STATUS_META = {
  Draft: { label: 'Draft', badge: 'industry-badge--warning', hint: 'Not yet visible to students.' },
  Published: { label: 'Published', badge: 'industry-badge--success', hint: 'Visible in the student opportunity catalog.' },
  Closed: { label: 'Closed', badge: 'industry-badge--neutral', hint: 'Applications are no longer accepted.' },
  Cancelled: { label: 'Cancelled', badge: 'industry-badge--error', hint: 'This opportunity was withdrawn.' },
};

export const OPPORTUNITY_TYPE_META = {
  Internship: { badge: 'industry-badge--plum' },
  Apprenticeship: { badge: 'industry-badge--info' },
  'Live Project': { badge: 'industry-badge--saffron' },
  'Entry-level Job': { badge: 'industry-badge--saffron' },
};

export const WORK_MODE_LABELS = {
  Remote: 'Remote',
  'On-site': 'On-site',
  Hybrid: 'Hybrid',
};

export const VISIBILITY_LABELS = {
  'Open to All': 'Open to All',
  'Selected Universities': 'Selected Universities',
  'Campus Drive': 'Campus Drive',
};

export const formatDate = (value) => {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return String(value);
  }
};

export const formatDateTime = (value) => {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return String(value);
  }
};

export const formatCompensation = (opp) => {
  const salary = (opp?.salary || '').trim();
  const stipend = (opp?.stipend || '').trim();
  if (salary && stipend && stipend !== 'Unpaid') return `${salary} · Stipend ${stipend}`;
  if (salary) return salary;
  if (stipend && stipend !== 'Unpaid') return `Stipend ${stipend}`;
  return 'Unpaid';
};

export const toDateInputValue = (value) => {
  if (!value) return '';
  const d = new Date(value);
  if (isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};