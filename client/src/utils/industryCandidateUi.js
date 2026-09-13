/**
 * Industry Candidate Search UI helpers (Phase 6)
 * SkillBridge / SIH 26044 — Academia–Industry Portal
 *
 * Pure presentation constants + tiny formatters. No data logic lives here —
 * every score shown in the Candidate Search UI comes from the real
 * StudentSkill / AssessmentAttempt records resolved server-side.
 */

export const CANDIDATE_SORT_OPTIONS = [
  { value: 'recent', label: 'Newest first' },
  { value: 'name', label: 'Name (A–Z)' },
  { value: 'skill', label: 'Highest skill score' },
  { value: 'assessment', label: 'Top assessment' },
  { value: 'relevance', label: 'Skill match (when skills selected)' },
];

export const MATCH_MODE_OPTIONS = [
  { value: 'any', label: 'Any skill', description: 'Candidate holds at least one requested skill' },
  { value: 'all', label: 'All skills', description: 'Candidate holds every requested skill' },
];

export const VERIFICATION_THRESHOLD = 60;

export const skillScoreBadge = (score) => {
  if (score >= 80) return 'industry-badge--success';
  if (score >= VERIFICATION_THRESHOLD) return 'industry-badge--info';
  if (score >= 40) return 'industry-badge--warning';
  return 'industry-badge--error';
};

export const levelLabel = (level) => level || 'Beginner';

export const verifiedBadge = (verified, score) =>
  verified ? 'industry-badge--success' : skillScoreBadge(score);

export const formatDate = (value) => {
  if (!value) return '\u2014';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '\u2014';
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

export const initialsOf = (name) =>
  (name || '?')
    .split(' ')
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase() || '?';