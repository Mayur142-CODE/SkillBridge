/**
 * Industry ATS UI helpers (Phase 4)
 * SkillBridge / SIH 26044 — Academia–Industry Portal
 *
 * Shared presentation metadata for the Applicant Tracking module:
 * application status badges, interview status badges, offer status badges,
 * and the server-authoritative next-action map for the pipeline.
 */

export const APPLICATION_STATUS_META = {
  Applied: { label: 'Applied', badge: 'industry-badge--info', hint: 'Application received.' },
  Shortlisted: { label: 'Shortlisted', badge: 'industry-badge--saffron', hint: 'Candidate has been shortlisted.' },
  Interview: { label: 'Interview', badge: 'industry-badge--plum', hint: 'Candidate is in the interview stage.' },
  Selected: { label: 'Selected', badge: 'industry-badge--success', hint: 'Candidate has been selected.' },
  Rejected: { label: 'Rejected', badge: 'industry-badge--error', hint: 'Application was not progressed.' },
  Withdrawn: { label: 'Withdrawn', badge: 'industry-badge--neutral', hint: 'Withdrawn by the student.' },
};

export const INTERVIEW_STATUS_META = {
  Scheduled: { label: 'Scheduled', badge: 'industry-badge--info', hint: 'Slot confirmed with the candidate.' },
  Completed: { label: 'Completed', badge: 'industry-badge--success', hint: 'Interview took place.' },
  Cancelled: { label: 'Cancelled', badge: 'industry-badge--error', hint: 'Slot was cancelled.' },
  Rescheduled: { label: 'Rescheduled', badge: 'industry-badge--warning', hint: 'Slot was moved to a new time.' },
};

export const OFFER_STATUS_META = {
  Pending: { label: 'Pending', badge: 'industry-badge--warning', hint: 'Awaiting candidate response.' },
  Accepted: { label: 'Accepted', badge: 'industry-badge--success', hint: 'Accepted by the candidate.' },
  Declined: { label: 'Declined', badge: 'industry-badge--error', hint: 'Declined by the candidate.' },
  Expired: { label: 'Expired', badge: 'industry-badge--neutral', hint: 'Offer no longer active.' },
};

export const APPLICATION_STATUS_TABS = ['All', 'Applied', 'Shortlisted', 'Interview', 'Selected', 'Rejected', 'Withdrawn'];

export const INTERVIEW_MODES = ['Video Call', 'Phone Call', 'On-site', 'Online Assessment'];

export const OFFER_TYPES = ['Internship', 'Apprenticeship', 'Live Project', 'Full-time Job'];

/**
 * Server-authoritative next actions for an application stage.
 * Mirrors the backend VALID_TRANSITIONS map (industry cannot set Withdrawn).
 */
export const NEXT_STATUS_ACTIONS = {
  Applied: [
    { to: 'Shortlisted', label: 'Shortlist', badge: 'industry-badge--saffron' },
    { to: 'Rejected', label: 'Reject', badge: 'industry-badge--error' },
  ],
  Shortlisted: [
    { to: 'Interview', label: 'Schedule as Interview', badge: 'industry-badge--plum' },
    { to: 'Selected', label: 'Select', badge: 'industry-badge--success' },
    { to: 'Rejected', label: 'Reject', badge: 'industry-badge--error' },
  ],
  Interview: [
    { to: 'Selected', label: 'Select', badge: 'industry-badge--success' },
    { to: 'Rejected', label: 'Reject', badge: 'industry-badge--error' },
  ],
  Selected: [],
  Rejected: [],
  Withdrawn: [],
};

export const formatDate = (value) => {
  if (!value) return '\u2014';
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
  if (!value) return '\u2014';
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

export const scoreLabel = (score) => {
  if (score == null) return 'N/A';
  if (score >= 85) return 'Excellent match';
  if (score >= 70) return 'Strong match';
  if (score >= 50) return 'Moderate match';
  return 'Weak match';
};