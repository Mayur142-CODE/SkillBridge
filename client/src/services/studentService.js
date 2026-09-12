/**
 * Student Panel API Service
 * SkillBridge / SIH 26044 — Academia–Industry Portal
 *
 * Centralized API client for all student profile, projects, certifications,
 * achievements, internship history, documents, and public portfolio interactions.
 */

const handleResponse = async (res) => {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const error = new Error(data.message || `Request failed with status ${res.status}`);
    error.status = res.status;
    error.data = data;
    throw error;
  }
  return data;
};

export const PROFILE_LIMITS = {
  projects: 10,
  certifications: 10,
  achievements: 10,
  internships: 10,
  documents: 10,
};

export const studentService = {
  // ── Profile & Core Account ──
  getProfile: async () => {
    const res = await fetch('/api/student/profile', {
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
    });
    return handleResponse(res);
  },

  updateProfile: async (profileData) => {
    const res = await fetch('/api/student/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(profileData),
    });
    return handleResponse(res);
  },

  uploadResume: async (file) => {
    const formData = new FormData();
    formData.append('resume', file);
    const res = await fetch('/api/student/profile/resume', {
      method: 'POST',
      credentials: 'include',
      body: formData,
    });
    return handleResponse(res);
  },

  deleteResume: async () => {
    const res = await fetch('/api/student/profile/resume', {
      method: 'DELETE',
      credentials: 'include',
    });
    return handleResponse(res);
  },

  uploadAvatar: async (file) => {
    const formData = new FormData();
    formData.append('avatar', file);
    const res = await fetch('/api/student/profile/avatar', {
      method: 'POST',
      credentials: 'include',
      body: formData,
    });
    return handleResponse(res);
  },

  removeAvatar: async () => {
    const res = await fetch('/api/student/profile/avatar', {
      method: 'DELETE',
      credentials: 'include',
    });
    return handleResponse(res);
  },

  togglePortfolioVisibility: async (portfolioPublic) => {
    const res = await fetch('/api/student/profile/portfolio-visibility', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ portfolioPublic }),
    });
    return handleResponse(res);
  },

  // ── Projects CRUD ──
  getProjects: async () => {
    const res = await fetch('/api/student/projects', {
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
    });
    return handleResponse(res);
  },

  createProject: async (projectData) => {
    const res = await fetch('/api/student/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(projectData),
    });
    return handleResponse(res);
  },

  updateProject: async (id, projectData) => {
    const res = await fetch(`/api/student/projects/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(projectData),
    });
    return handleResponse(res);
  },

  deleteProject: async (id) => {
    const res = await fetch(`/api/student/projects/${id}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    return handleResponse(res);
  },

  // ── Certifications CRUD ──
  getCertifications: async () => {
    const res = await fetch('/api/student/certifications', {
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
    });
    return handleResponse(res);
  },

  createCertification: async (certData) => {
    const res = await fetch('/api/student/certifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(certData),
    });
    return handleResponse(res);
  },

  updateCertification: async (id, certData) => {
    const res = await fetch(`/api/student/certifications/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(certData),
    });
    return handleResponse(res);
  },

  deleteCertification: async (id) => {
    const res = await fetch(`/api/student/certifications/${id}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    return handleResponse(res);
  },

  // ── Achievements CRUD ──
  getAchievements: async () => {
    const res = await fetch('/api/student/achievements', {
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
    });
    return handleResponse(res);
  },

  createAchievement: async (achievementData) => {
    const res = await fetch('/api/student/achievements', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(achievementData),
    });
    return handleResponse(res);
  },

  updateAchievement: async (id, achievementData) => {
    const res = await fetch(`/api/student/achievements/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(achievementData),
    });
    return handleResponse(res);
  },

  deleteAchievement: async (id) => {
    const res = await fetch(`/api/student/achievements/${id}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    return handleResponse(res);
  },

  // ── Internship History CRUD ──
  getInternships: async () => {
    const res = await fetch('/api/student/internships', {
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
    });
    return handleResponse(res);
  },

  createInternship: async (internshipData) => {
    const res = await fetch('/api/student/internships', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(internshipData),
    });
    return handleResponse(res);
  },

  updateInternship: async (id, internshipData) => {
    const res = await fetch(`/api/student/internships/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(internshipData),
    });
    return handleResponse(res);
  },

  deleteInternship: async (id) => {
    const res = await fetch(`/api/student/internships/${id}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    return handleResponse(res);
  },

  // ── Document Vault ──
  getDocuments: async (category = '') => {
    const url = category ? `/api/student/documents?category=${encodeURIComponent(category)}` : '/api/student/documents';
    const res = await fetch(url, {
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
    });
    return handleResponse(res);
  },

  uploadDocument: async (file, title, category) => {
    const formData = new FormData();
    formData.append('file', file);
    if (title) formData.append('title', title);
    if (category) formData.append('category', category);

    const res = await fetch('/api/student/documents', {
      method: 'POST',
      credentials: 'include',
      body: formData,
    });
    return handleResponse(res);
  },

  deleteDocument: async (id) => {
    const res = await fetch(`/api/student/documents/${id}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    return handleResponse(res);
  },

  getDocumentViewUrl: (id) => `/api/student/documents/${id}/view`,

  // ── Public Portfolio ──
  getPublicPortfolio: async (slug) => {
    const res = await fetch(`/api/portfolio/${slug}`, {
      headers: { 'Content-Type': 'application/json' },
    });
    return handleResponse(res);
  },

  // ── Phase 3: Skill Assessments ──
  getAssessments: async () => {
    const res = await fetch('/api/student/assessments', {
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
    });
    return handleResponse(res);
  },

  getAssessment: async (id) => {
    const res = await fetch(`/api/student/assessments/${id}`, {
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
    });
    return handleResponse(res);
  },

  startAssessment: async (id) => {
    const res = await fetch(`/api/student/assessments/${id}/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
    });
    return handleResponse(res);
  },

  getAttemptQuestions: async (attemptId) => {
    const res = await fetch(`/api/student/assessment-attempts/${attemptId}/questions`, {
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
    });
    return handleResponse(res);
  },

  submitAssessment: async (attemptId, answers) => {
    const res = await fetch(`/api/student/assessment-attempts/${attemptId}/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ answers }),
    });
    return handleResponse(res);
  },

  getAttemptResult: async (attemptId) => {
    const res = await fetch(`/api/student/assessment-attempts/${attemptId}/result`, {
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
    });
    return handleResponse(res);
  },

  getAssessmentHistory: async () => {
    const res = await fetch('/api/student/assessment-attempts', {
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
    });
    return handleResponse(res);
  },

  getStudentSkills: async () => {
    const res = await fetch('/api/student/skills', {
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
    });
    return handleResponse(res);
  },

  getSkillGaps: async () => {
    const res = await fetch('/api/student/skills/gaps', {
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
    });
    return handleResponse(res);
  },

  // ── Phase 4: Skill Mapping & Personalized Recommendations ──
  getRecommendations: async () => {
    const res = await fetch('/api/student/recommendations', {
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
    });
    return handleResponse(res);
  },

  getRecommendedRoles: async (sector = '') => {
    const query = sector && sector !== 'All' ? `?sector=${encodeURIComponent(sector)}` : '';
    const res = await fetch(`/api/student/recommendations/roles${query}`, {
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
    });
    return handleResponse(res);
  },

  getRoleRecommendation: async (id) => {
    const res = await fetch(`/api/student/recommendations/roles/${id}`, {
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
    });
    return handleResponse(res);
  },

  getRecommendedIndustries: async () => {
    const res = await fetch('/api/student/recommendations/industries', {
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
    });
    return handleResponse(res);
  },

  getRecommendedCompanies: async () => {
    const res = await fetch('/api/student/recommendations/companies', {
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
    });
    return handleResponse(res);
  },

  getSkillRecommendations: async () => {
    const res = await fetch('/api/student/recommendations/skills', {
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
    });
    return handleResponse(res);
  },

  getCareerGuidance: async () => {
    const res = await fetch('/api/student/recommendations/career-guidance', {
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
    });
    return handleResponse(res);
  },

  // ── Phase 5: Learning Hub & Courses ──
  getLearningPrograms: async (params = {}) => {
    const query = new URLSearchParams();
    if (params.search) query.append('search', params.search);
    if (params.type && params.type !== 'All') query.append('type', params.type);
    if (params.level && params.level !== 'All') query.append('level', params.level);
    if (params.mode && params.mode !== 'All') query.append('mode', params.mode);
    if (params.skill && params.skill !== 'All') query.append('skill', params.skill);
    if (params.sort) query.append('sort', params.sort);
    if (params.page) query.append('page', params.page);
    if (params.limit) query.append('limit', params.limit);

    const res = await fetch(`/api/student/learning/programs?${query.toString()}`, {
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
    });
    return handleResponse(res);
  },

  getLearningProgram: async (id) => {
    const res = await fetch(`/api/student/learning/programs/${id}`, {
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
    });
    return handleResponse(res);
  },

  enrollInProgram: async (id) => {
    const res = await fetch(`/api/student/learning/programs/${id}/enroll`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
    });
    return handleResponse(res);
  },

  getMyEnrollments: async (status = 'All') => {
    const query = status && status !== 'All' ? `?status=${encodeURIComponent(status)}` : '';
    const res = await fetch(`/api/student/learning/enrollments${query}`, {
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
    });
    return handleResponse(res);
  },

  getEnrollment: async (id) => {
    const res = await fetch(`/api/student/learning/enrollments/${id}`, {
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
    });
    return handleResponse(res);
  },

  completeLesson: async (enrollmentId, lessonId) => {
    const res = await fetch(
      `/api/student/learning/enrollments/${enrollmentId}/lessons/${lessonId}/complete`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      }
    );
    return handleResponse(res);
  },

  // ── Phase 5: Mentorship Discovery & Requests ──
  getMentors: async (params = {}) => {
    const query = new URLSearchParams();
    if (params.type && params.type !== 'All') query.append('type', params.type);
    if (params.availability && params.availability !== 'All') query.append('availability', params.availability);
    if (params.search) query.append('search', params.search);

    const res = await fetch(`/api/student/mentors?${query.toString()}`, {
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
    });
    return handleResponse(res);
  },

  sendMentorshipRequest: async (mentorId, message) => {
    const res = await fetch('/api/student/mentorship/requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ mentorId, message }),
    });
    return handleResponse(res);
  },

  getMentorshipRequests: async () => {
    const res = await fetch('/api/student/mentorship/requests', {
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
    });
    return handleResponse(res);
  },

  cancelMentorshipRequest: async (id) => {
    const res = await fetch(`/api/student/mentorship/requests/${id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
    });
    return handleResponse(res);
  },

  // ── Phase 5: Public Certificate Verification ──
  verifyCertificate: async (verificationCode) => {
    const res = await fetch(`/api/certificates/verify/${encodeURIComponent(verificationCode)}`, {
      headers: { 'Content-Type': 'application/json' },
    });
    return handleResponse(res);
  },

  // ── Phase 6: Opportunities & Internships / Placements ──
  getOpportunities: async (params = {}) => {
    const query = new URLSearchParams();
    if (params.search) query.append('search', params.search);
    if (params.type && params.type !== 'All') query.append('type', params.type);
    if (params.workMode && params.workMode !== 'All') query.append('workMode', params.workMode);
    if (params.location) query.append('location', params.location);
    if (params.company) query.append('company', params.company);
    if (params.tab) query.append('tab', params.tab);
    if (params.sort) query.append('sort', params.sort);
    if (params.page) query.append('page', params.page);
    if (params.limit) query.append('limit', params.limit);

    const res = await fetch(`/api/student/opportunities?${query.toString()}`, {
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
    });
    return handleResponse(res);
  },

  getOpportunityById: async (id) => {
    const res = await fetch(`/api/student/opportunities/${id}`, {
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
    });
    return handleResponse(res);
  },

  applyOpportunity: async (id, data = {}) => {
    const res = await fetch(`/api/student/opportunities/${id}/apply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  // ── Phase 6: Applications Tracking & Timeline ──────────
  getApplications: async (params = {}) => {
    const query = new URLSearchParams();
    if (params.status && params.status !== 'All') query.append('status', params.status);
    if (params.type && params.type !== 'All') query.append('type', params.type);
    if (params.search) query.append('search', params.search);
    if (params.page) query.append('page', params.page);
    if (params.limit) query.append('limit', params.limit);

    const res = await fetch(`/api/student/applications?${query.toString()}`, {
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
    });
    return handleResponse(res);
  },

  getApplicationById: async (id) => {
    const res = await fetch(`/api/student/applications/${id}`, {
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
    });
    return handleResponse(res);
  },

  withdrawApplication: async (id, data = {}) => {
    const res = await fetch(`/api/student/applications/${id}/withdraw`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  // ── Notifications ─────────────────────────────────────
  getNotifications: async (params = {}) => {
    const query = new URLSearchParams();
    if (params.page) query.append('page', params.page);
    if (params.limit) query.append('limit', params.limit);
    if (params.unreadOnly) query.append('unreadOnly', 'true');

    const res = await fetch(`/api/student/notifications?${query.toString()}`, {
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
    });
    return handleResponse(res);
  },

  markNotificationRead: async (id) => {
    const res = await fetch(`/api/student/notifications/${id}/read`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
    });
    return handleResponse(res);
  },

  markAllNotificationsRead: async () => {
    const res = await fetch('/api/student/notifications/read-all', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
    });
    return handleResponse(res);
  },
};
