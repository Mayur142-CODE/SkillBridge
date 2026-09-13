/**
 * Industry Service
 * SkillBridge / SIH 26044 — Academia–Industry Portal
 *
 * Dedicated frontend API client for the Industry Partner Panel.
 */

const API_BASE = '/api/industry';

const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  const headers = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
};

export const industryService = {
  // ── Dashboard Aggregation (Phase 1) ──
  async getDashboard() {
    const res = await fetch(`${API_BASE}/dashboard`, {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
    });
    return res.json();
  },

  // ── Company Profile & Compliance (Phase 2) ──
  async getProfile() {
    const res = await fetch(`${API_BASE}/profile`, {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
    });
    return res.json();
  },

  async updateProfile(profileData) {
    const res = await fetch(`${API_BASE}/profile`, {
      method: 'PUT',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
      body: JSON.stringify(profileData),
    });
    return res.json();
  },

  async getSectors() {
    const res = await fetch(`${API_BASE}/sectors`, {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
    });
    return res.json();
  },

  // ── Compliance Documents (Phase 2) ──
  async getComplianceDocuments() {
    const res = await fetch(`${API_BASE}/profile/documents`, {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
    });
    return res.json();
  },

  async uploadComplianceDocument(title, category, file) {
    const formData = new FormData();
    formData.append('title', title);
    formData.append('category', category);
    formData.append('file', file);

    const res = await fetch(`${API_BASE}/profile/documents`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        ...getAuthHeaders(),
      },
      body: formData,
    });
    return res.json();
  },

  async deleteComplianceDocument(id) {
    const res = await fetch(`${API_BASE}/profile/documents/${id}`, {
      method: 'DELETE',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
    });
    return res.json();
  },

  // Authenticated document access (same-origin httpOnly cookie is sent automatically)
  getDocumentViewUrl(id) {
    return `${API_BASE}/profile/documents/${id}/view`;
  },

  getDocumentDownloadUrl(id) {
    return `${API_BASE}/profile/documents/${id}/download`;
  },

  // ── Opportunity Management (Phase 3) ──
  async getOpportunities(params = {}) {
    const query = new URLSearchParams();
    if (params.search) query.append('search', params.search);
    if (params.status && params.status !== 'All') query.append('status', params.status);
    if (params.type && params.type !== 'All') query.append('type', params.type);
    if (params.workMode && params.workMode !== 'All') query.append('workMode', params.workMode);
    if (params.visibility && params.visibility !== 'All') query.append('visibility', params.visibility);
    if (params.deadline && params.deadline !== 'All') query.append('deadline', params.deadline);
    if (params.sort && params.sort !== 'newest') query.append('sort', params.sort);
    if (params.page) query.append('page', params.page);
    if (params.limit) query.append('limit', params.limit);

    const res = await fetch(`${API_BASE}/opportunities?${query.toString()}`, {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
    });
    return res.json();
  },

  async getOpportunity(id) {
    const res = await fetch(`${API_BASE}/opportunities/${id}`, {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
    });
    return res.json();
  },

  async getOpportunityMeta() {
    const res = await fetch(`${API_BASE}/opportunities/meta`, {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
    });
    return res.json();
  },

  async createOpportunity(data) {
    const res = await fetch(`${API_BASE}/opportunities`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async updateOpportunity(id, data) {
    const res = await fetch(`${API_BASE}/opportunities/${id}`, {
      method: 'PUT',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async publishOpportunity(id) {
    const res = await fetch(`${API_BASE}/opportunities/${id}/publish`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
    });
    return res.json();
  },

  async closeOpportunity(id) {
    const res = await fetch(`${API_BASE}/opportunities/${id}/close`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
    });
    return res.json();
  },

  async cancelOpportunity(id) {
    const res = await fetch(`${API_BASE}/opportunities/${id}/cancel`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
    });
    return res.json();
  },

  async deleteOpportunity(id) {
    const res = await fetch(`${API_BASE}/opportunities/${id}`, {
      method: 'DELETE',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
    });
    return res.json();
  },

  // ── Applicant Tracking System (Phase 4) ──
  async getApplications(params = {}) {
    const query = new URLSearchParams();
    if (params.search) query.append('search', params.search);
    if (params.status && params.status !== 'All') query.append('status', params.status);
    if (params.type && params.type !== 'All') query.append('type', params.type);
    if (params.workMode && params.workMode !== 'All') query.append('workMode', params.workMode);
    if (params.opportunityId) query.append('opportunityId', params.opportunityId);
    if (params.sort && params.sort !== 'newest') query.append('sort', params.sort);
    if (params.page) query.append('page', params.page);
    if (params.limit) query.append('limit', params.limit);

    const res = await fetch(`${API_BASE}/applications?${query.toString()}`, {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
    });
    return res.json();
  },

  async getApplicationsMeta() {
    const res = await fetch(`${API_BASE}/applications/meta`, {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
    });
    return res.json();
  },

  async getApplication(id) {
    const res = await fetch(`${API_BASE}/applications/${id}`, {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
    });
    return res.json();
  },

  async getApplicationHistory(id) {
    const res = await fetch(`${API_BASE}/applications/${id}/history`, {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
    });
    return res.json();
  },

  async updateApplicationStatus(id, data) {
    const res = await fetch(`${API_BASE}/applications/${id}/status`, {
      method: 'PATCH',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async addEmployerNote(id, note) {
    const res = await fetch(`${API_BASE}/applications/${id}/notes`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
      body: JSON.stringify({ note }),
    });
    return res.json();
  },

  getResumeViewUrl(id) {
    return `${API_BASE}/applications/${id}/resume/view`;
  },

  getResumeDownloadUrl(id) {
    return `${API_BASE}/applications/${id}/resume/download`;
  },

  async scheduleInterview(id, data) {
    const res = await fetch(`${API_BASE}/applications/${id}/interviews`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async getApplicationInterviews(id) {
    const res = await fetch(`${API_BASE}/applications/${id}/interviews`, {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
    });
    return res.json();
  },

  async updateInterview(id, interviewId, data) {
    const res = await fetch(`${API_BASE}/applications/${id}/interviews/${interviewId}`, {
      method: 'PATCH',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async issueOffer(id, data) {
    const res = await fetch(`${API_BASE}/applications/${id}/offer`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async getApplicationOffers(id) {
    const res = await fetch(`${API_BASE}/applications/${id}/offers`, {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
    });
    return res.json();
  },

  async updateOffer(id, offerId, data) {
    const res = await fetch(`${API_BASE}/applications/${id}/offers/${offerId}`, {
      method: 'PATCH',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async getOffers(params = {}) {
    const query = new URLSearchParams();
    if (params.status && params.status !== 'All') query.append('status', params.status);
    if (params.page) query.append('page', params.page);
    if (params.limit) query.append('limit', params.limit);

    const res = await fetch(`${API_BASE}/offers?${query.toString()}`, {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
    });
    return res.json();
  },

  // ── Collaborative Project Management (Phase 5) ──
  async getCollaborationMeta() {
    const res = await fetch(`${API_BASE}/collaborations/meta`, {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
    });
    return res.json();
  },

  async getCollaborations(params = {}) {
    const query = new URLSearchParams();
    if (params.search) query.append('search', params.search);
    if (params.status && params.status !== 'All') query.append('status', params.status);
    if (params.type && params.type !== 'All') query.append('type', params.type);
    if (params.page) query.append('page', params.page);
    if (params.limit) query.append('limit', params.limit);

    const res = await fetch(`${API_BASE}/collaborations?${query.toString()}`, {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
    });
    return res.json();
  },

  async getCollaboration(id) {
    const res = await fetch(`${API_BASE}/collaborations/${id}`, {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
    });
    return res.json();
  },

  async acceptCollaboration(id, note) {
    const res = await fetch(`${API_BASE}/collaborations/${id}/accept`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
      body: JSON.stringify({ note }),
    });
    return res.json();
  },

  async rejectCollaboration(id, note) {
    const res = await fetch(`${API_BASE}/collaborations/${id}/reject`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
      body: JSON.stringify({ note }),
    });
    return res.json();
  },

  async updateCollaborationStatus(id, status, note) {
    const res = await fetch(`${API_BASE}/collaborations/${id}/status`, {
      method: 'PATCH',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
      body: JSON.stringify({ status, note }),
    });
    return res.json();
  },

  async getCollaborationOpportunities(params = {}) {
    const query = new URLSearchParams();
    if (params.search) query.append('search', params.search);
    if (params.status && params.status !== 'All') query.append('status', params.status);
    if (params.type && params.type !== 'All') query.append('type', params.type);
    if (params.mode && params.mode !== 'All') query.append('mode', params.mode);
    if (params.domain && params.domain !== 'All') query.append('domain', params.domain);
    if (params.page) query.append('page', params.page);
    if (params.limit) query.append('limit', params.limit);

    const res = await fetch(`${API_BASE}/collaborations/opportunities?${query.toString()}`, {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
    });
    return res.json();
  },

  async getCollaborationOpportunity(id) {
    const res = await fetch(`${API_BASE}/collaborations/opportunities/${id}`, {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
    });
    return res.json();
  },

  async getCollaborationApplications(params = {}) {
    const query = new URLSearchParams();
    if (params.search) query.append('search', params.search);
    if (params.status && params.status !== 'All') query.append('status', params.status);
    if (params.opportunityId) query.append('opportunityId', params.opportunityId);
    if (params.page) query.append('page', params.page);
    if (params.limit) query.append('limit', params.limit);

    const res = await fetch(`${API_BASE}/collaborations/applications?${query.toString()}`, {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
    });
    return res.json();
  },

  async getCollaborationApplication(id) {
    const res = await fetch(`${API_BASE}/collaborations/applications/${id}`, {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
    });
    return res.json();
  },

  async acceptCollaborationApplication(id, note) {
    const res = await fetch(`${API_BASE}/collaborations/applications/${id}/accept`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
      body: JSON.stringify({ note }),
    });
    return res.json();
  },

  async rejectCollaborationApplication(id, note) {
    const res = await fetch(`${API_BASE}/collaborations/applications/${id}/reject`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
      body: JSON.stringify({ note }),
    });
    return res.json();
  },

  getCollaborationResumeViewUrl(applicationId) {
    return `${API_BASE}/collaborations/applications/${applicationId}/resume/view`;
  },

  getCollaborationResumeDownloadUrl(applicationId) {
    return `${API_BASE}/collaborations/applications/${applicationId}/resume/download`;
  },

  getCollaborationDocumentViewUrl(applicationId, docId) {
    return `${API_BASE}/collaborations/applications/${applicationId}/documents/${docId}/view`;
  },

  getCollaborationDocumentDownloadUrl(applicationId, docId) {
    return `${API_BASE}/collaborations/applications/${applicationId}/documents/${docId}/download`;
  },

  // ── Candidate Search (Phase 6) ──
  async getCandidateMeta() {
    const res = await fetch(`${API_BASE}/candidates/meta`, {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
    });
    return res.json();
  },

  async getCandidates(params = {}) {
    const query = new URLSearchParams();
    if (params.search) query.append('search', params.search);
    if (params.skills && params.skills.length) query.append('skills', params.skills.join(','));
    if (params.skillMatchMode) query.append('skillMatchMode', params.skillMatchMode);
    if (params.minScore !== '' && params.minScore != null) query.append('minScore', params.minScore);
    if (params.maxScore !== '' && params.maxScore != null) query.append('maxScore', params.maxScore);
    if (params.minAssessmentScore !== '' && params.minAssessmentScore != null) query.append('minAssessmentScore', params.minAssessmentScore);
    if (params.maxAssessmentScore !== '' && params.maxAssessmentScore != null) query.append('maxAssessmentScore', params.maxAssessmentScore);
    if (params.verifiedOnly) query.append('verifiedOnly', 'true');
    if (params.education) query.append('education', params.education);
    if (params.sort) query.append('sort', params.sort);
    if (params.page) query.append('page', params.page);
    if (params.limit) query.append('limit', params.limit);

    const res = await fetch(`${API_BASE}/candidates?${query.toString()}`, {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
    });
    return res.json();
  },

  async getCandidate(id) {
    const res = await fetch(`${API_BASE}/candidates/${id}`, {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
    });
    return res.json();
  },
};