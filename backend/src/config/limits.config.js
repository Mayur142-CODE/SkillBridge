/**
 * Student Profile & Digital Portfolio Limits Configuration
 * SkillBridge / SIH 26044 — Academia–Industry Portal
 *
 * Centralized source of truth for maximum allowed items per student resource.
 */
export const PROFILE_LIMITS = {
  projects: 10,
  certifications: 10,
  achievements: 10,
  internships: 10,
  documents: 10,
};

export const FACULTY_PROFILE_LIMITS = {
  maxCvSize: 5 * 1024 * 1024, // 5 MB
  maxDocuments: 10,
  maxDocumentSize: 10 * 1024 * 1024, // 10 MB
};

export const INDUSTRY_PROFILE_LIMITS = {
  maxComplianceDocuments: 10,
  maxComplianceDocumentSize: 10 * 1024 * 1024, // 10 MB
};

export const INSTITUTION_PROFILE_LIMITS = {
  maxAccreditations: 50,
  maxDepartments: 100,
  maxAccreditationDocumentSize: 10 * 1024 * 1024, // 10 MB
};

export const INSTITUTION_STUDENT_LIMITS = {
  maxBulkCsvSize: 2 * 1024 * 1024, // 2 MB
  maxBulkRows: 500,
  maxCgpa: 10,
};

export const INSTITUTION_MOU_LIMITS = {
  maxMous: 300, // max MoU records per institution
  maxDocumentSize: 10 * 1024 * 1024, // 10 MB (enforced by upload middleware)
  expiringSoonDays: 30, // an active MoU expiring within this window is "expiring soon"
};

export const INSTITUTION_PLACEMENT_LIMITS = {
  maxRecruiters: 25, // max recruiter rows surfaced in the TPO overview
  maxTrendMonths: 24, // max monthly trend buckets surfaced
  maxRecent: 8, // max recent application rows surfaced
  maxDistributionRows: 50, // max rows per branch / year / program distribution table
};
