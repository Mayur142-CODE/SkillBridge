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
