/**
 * Industry Collaboration UI helpers (Phase 5)
 * SkillBridge / SIH 26044 — Academia–Industry Portal
 *
 * Shared presentation metadata for the Collaborative Project Management module:
 * collaboration status badges, collab-type chips, and the server-authoritative
 * next-action map for the collaboration lifecycle.
 */

export const COLLABORATION_STATUS_META = {
  Proposed: { label: 'Proposed', badge: 'industry-badge--info', hint: 'Awaiting your review.' },
  Requested: { label: 'Requested', badge: 'industry-badge--info', hint: 'Requested by the faculty partner.' },
  Accepted: { label: 'Accepted', badge: 'industry-badge--success', hint: 'Approved and ready to launch.' },
  Active: { label: 'Active', badge: 'industry-badge--plum', hint: 'In progress.' },
  Upcoming: { label: 'Upcoming', badge: 'industry-badge--warning', hint: 'Scheduled ahead.' },
  Completed: { label: 'Completed', badge: 'industry-badge--success', hint: 'Delivered successfully.' },
  Rejected: { label: 'Rejected', badge: 'industry-badge--error', hint: 'Not approved by your company.' },
  Cancelled: { label: 'Cancelled', badge: 'industry-badge--neutral', hint: 'Stopped before completion.' },
};

export const COLLABORATION_TYPE_META = {
  'Guest Lecture': { label: 'Guest Lecture', badge: 'industry-badge--info' },
  Workshop: { label: 'Workshop', badge: 'industry-badge--info' },
  'Live Industry Project': { label: 'Live Industry Project', badge: 'industry-badge--info' },
  'Innovation Challenge': { label: 'Innovation Challenge', badge: 'industry-badge--info' },
  'Collaborative Research': { label: 'Collaborative Research', badge: 'industry-badge--info' },
  Consultancy: { label: 'Consultancy', badge: 'industry-badge--info' },
};

export const COLLABORATION_TABS = ['Proposals', 'Active', 'History'];

/**
 * Server-authoritative next actions mapped to a collaboration status.
 * Mirrors the backend COLLABORATION_ACTIVE_TRANSITIONS whitelist:
 *   Accepted → Active | Cancelled
 *   Active   → Completed | Cancelled
 *   Upcoming → Cancelled
 */
export const COLLABORATION_NEXT_ACTIONS = {
  Proposed: [
    { to: 'Accepted', label: 'Approve Proposal', badge: 'industry-badge--success' },
    { to: 'Rejected', label: 'Decline Proposal', badge: 'industry-badge--error' },
  ],
  Requested: [
    { to: 'Accepted', label: 'Approve Proposal', badge: 'industry-badge--success' },
    { to: 'Rejected', label: 'Decline Proposal', badge: 'industry-badge--error' },
  ],
  Accepted: [
    { to: 'Active', label: 'Mark Active', badge: 'industry-badge--plum' },
    { to: 'Cancelled', label: 'Cancel', badge: 'industry-badge--neutral' },
  ],
  Active: [
    { to: 'Completed', label: 'Mark Completed', badge: 'industry-badge--success' },
    { to: 'Cancelled', label: 'Cancel', badge: 'industry-badge--neutral' },
  ],
  Upcoming: [{ to: 'Cancelled', label: 'Cancel', badge: 'industry-badge--neutral' }],
  Completed: [],
  Rejected: [],
  Cancelled: [],
};

export const collaborationTab = (status) => {
  if (status === 'Proposed' || status === 'Requested') return 'Proposals';
  if (
    status === 'Accepted' ||
    status === 'Active' ||
    status === 'Upcoming'
  )
    return 'Active';
  return 'History';
};

const COLLABORATION_TYPES_LIST = ['Guest Lecture', 'Workshop', 'Live Industry Project', 'Innovation Challenge', 'Collaborative Research', 'Consultancy'];

export const COLLABORATION_TYPE_OPTIONS = ['All', ...COLLABORATION_TYPES_LIST];

export const COLLABORATION_STATUS_OPTIONS = ['All', ...Object.keys(COLLABORATION_STATUS_META)];

export const COLLABORATION_MODE_OPTIONS = ['All', 'Online', 'Offline', 'Hybrid'];

export const FACULTY_OPPORTUNITY_STATUS_OPTIONS = ['All', 'Proposed', 'Open', 'Closed', 'Completed', 'Cancelled'];

export const FACULTY_APPLICATION_STATUS_OPTIONS = ['All', 'Applied', 'Under Review', 'Shortlisted', 'Interview', 'Selected', 'Rejected', 'Withdrawn', 'Completed'];

export const COLLABORATION_APPLICATION_NEXT_ACTIONS = {
  Applied: [
    { to: 'Selected', label: 'Accept', badge: 'industry-badge--success' },
    { to: 'Rejected', label: 'Reject', badge: 'industry-badge--error' },
  ],
  'Under Review': [
    { to: 'Selected', label: 'Accept', badge: 'industry-badge--success' },
    { to: 'Rejected', label: 'Reject', badge: 'industry-badge--error' },
  ],
  Shortlisted: [
    { to: 'Selected', label: 'Accept', badge: 'industry-badge--success' },
    { to: 'Rejected', label: 'Reject', badge: 'industry-badge--error' },
  ],
  Interview: [
    { to: 'Selected', label: 'Accept', badge: 'industry-badge--success' },
    { to: 'Rejected', label: 'Reject', badge: 'industry-badge--error' },
  ],
  Selected: [],
  Rejected: [],
  Withdrawn: [],
  Completed: [],
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
    return new Date(value).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
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