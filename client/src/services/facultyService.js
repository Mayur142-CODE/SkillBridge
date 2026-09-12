/**
 * Faculty Service
 * SkillBridge / SIH 26044 — Academia–Industry Portal
 *
 * Dedicated frontend API client for Faculty Profile & Digital Academic Portfolio.
 */

const API_BASE = '/api/faculty';

const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  const headers = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
};

export const facultyService = {
  // ── Dashboard Aggregation (Phase 6) ──
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

  // ── Profile & Academic Info ──
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

  async updateExpertise(expertiseAreas) {
    const res = await fetch(`${API_BASE}/profile/expertise`, {
      method: 'PUT',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
      body: JSON.stringify({ expertiseAreas }),
    });
    return res.json();
  },

  async updateResearchInterests(researchInterests) {
    const res = await fetch(`${API_BASE}/profile/research-interests`, {
      method: 'PUT',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
      body: JSON.stringify({ researchInterests }),
    });
    return res.json();
  },

  // ── Publications CRUD ──
  async addPublication(pubData) {
    const res = await fetch(`${API_BASE}/profile/publications`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
      body: JSON.stringify(pubData),
    });
    return res.json();
  },

  async updatePublication(id, pubData) {
    const res = await fetch(`${API_BASE}/profile/publications/${id}`, {
      method: 'PUT',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
      body: JSON.stringify(pubData),
    });
    return res.json();
  },

  async deletePublication(id) {
    const res = await fetch(`${API_BASE}/profile/publications/${id}`, {
      method: 'DELETE',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
    });
    return res.json();
  },

  // ── Previous Industry Collaborations CRUD ──
  async addCollaboration(collabData) {
    const res = await fetch(`${API_BASE}/profile/collaborations`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
      body: JSON.stringify(collabData),
    });
    return res.json();
  },

  async updateCollaboration(id, collabData) {
    const res = await fetch(`${API_BASE}/profile/collaborations/${id}`, {
      method: 'PUT',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
      body: JSON.stringify(collabData),
    });
    return res.json();
  },

  async deleteCollaboration(id) {
    const res = await fetch(`${API_BASE}/profile/collaborations/${id}`, {
      method: 'DELETE',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
    });
    return res.json();
  },

  // ── CV Management ──
  async uploadCV(file) {
    const formData = new FormData();
    formData.append('cv', file);

    const res = await fetch(`${API_BASE}/profile/cv`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        ...getAuthHeaders(),
      },
      body: formData,
    });
    return res.json();
  },

  async deleteCV() {
    const res = await fetch(`${API_BASE}/profile/cv`, {
      method: 'DELETE',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
    });
    return res.json();
  },

  getCVViewUrl() {
    return `${API_BASE}/profile/cv/view`;
  },

  getCVDownloadUrl() {
    return `${API_BASE}/profile/cv/download`;
  },

  // ── Supporting Documents CRUD ──
  async uploadDocument(title, category, file) {
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

  async deleteDocument(id) {
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

  getDocumentViewUrl(id) {
    return `${API_BASE}/profile/documents/${id}/view`;
  },

  getDocumentDownloadUrl(id) {
    return `${API_BASE}/profile/documents/${id}/download`;
  },

  // ── Phase 3: Opportunity Discovery ──
  async getOpportunities(params = {}) {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '') {
        query.append(key, val);
      }
    });

    const queryString = query.toString() ? `?${query.toString()}` : '';
    const res = await fetch(`${API_BASE}/opportunities${queryString}`, {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
    });
    return res.json();
  },

  async getOpportunityById(id) {
    const res = await fetch(`${API_BASE}/opportunities/${id}`, {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
    });
    return res.json();
  },

  async getOpportunityFilters() {
    const res = await fetch(`${API_BASE}/opportunities/filters`, {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
    });
    return res.json();
  },

  // ── Phase 4: Mentorship ──
  async getMentorshipProfile() {
    const res = await fetch(`${API_BASE}/mentorship`, {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
    });
    return res.json();
  },

  async updateMentorshipPreferences(prefs) {
    const res = await fetch(`${API_BASE}/mentorship/preferences`, {
      method: 'PUT',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
      body: JSON.stringify(prefs),
    });
    return res.json();
  },

  async getMentorshipRequests() {
    const res = await fetch(`${API_BASE}/mentorship/requests`, {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
    });
    return res.json();
  },

  async acceptMentorshipRequest(id, note = '') {
    const res = await fetch(`${API_BASE}/mentorship/requests/${id}/accept`, {
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

  async rejectMentorshipRequest(id, note = '') {
    const res = await fetch(`${API_BASE}/mentorship/requests/${id}/reject`, {
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

  async getMentees() {
    const res = await fetch(`${API_BASE}/mentorship/mentees`, {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
    });
    return res.json();
  },

  async getMentorshipHistory() {
    const res = await fetch(`${API_BASE}/mentorship/history`, {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
    });
    return res.json();
  },

  // ── Phase 4: Collaborations ──
  async getCollaborations(params = {}) {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '') {
        query.append(key, val);
      }
    });

    const queryString = query.toString() ? `?${query.toString()}` : '';
    const res = await fetch(`${API_BASE}/collaborations${queryString}`, {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
    });
    return res.json();
  },

  async getCollaborationById(id) {
    const res = await fetch(`${API_BASE}/collaborations/${id}`, {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
    });
    return res.json();
  },

  async joinCollaboration(id, role = 'Faculty Participant') {
    const res = await fetch(`${API_BASE}/collaborations/${id}/join`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
      body: JSON.stringify({ role }),
    });
    return res.json();
  },

  async proposeCollaboration(proposalData) {
    const res = await fetch(`${API_BASE}/collaborations/propose`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
      body: JSON.stringify(proposalData),
    });
    return res.json();
  },

  async getCurrentCollaborations() {
    const res = await fetch(`${API_BASE}/collaborations/current`, {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
    });
    return res.json();
  },

  async getCollaborationHistory() {
    const res = await fetch(`${API_BASE}/collaborations/history`, {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
    });
    return res.json();
  },

  // ── Phase 4: Notifications ──
  async getNotifications(params = {}) {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '') {
        query.append(key, val);
      }
    });

    const queryString = query.toString() ? `?${query.toString()}` : '';
    const res = await fetch(`${API_BASE}/notifications${queryString}`, {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
    });
    return res.json();
  },

  async markNotificationRead(id) {
    const res = await fetch(`${API_BASE}/notifications/${id}/read`, {
      method: 'PATCH',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
    });
    return res.json();
  },

  async markAllNotificationsRead() {
    const res = await fetch(`${API_BASE}/notifications/read-all`, {
      method: 'PATCH',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
    });
    return res.json();
  },

  // ── Phase 5: Faculty Applications ──
  async applyToOpportunity(opportunityId, data = {}) {
    const res = await fetch(`${API_BASE}/opportunities/${opportunityId}/apply`, {
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

  async getApplications(params = {}) {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '') {
        query.append(key, val);
      }
    });

    const queryString = query.toString() ? `?${query.toString()}` : '';
    const res = await fetch(`${API_BASE}/applications${queryString}`, {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
    });
    return res.json();
  },

  async getApplicationById(id) {
    const res = await fetch(`${API_BASE}/applications/${id}`, {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
    });
    return res.json();
  },

  async withdrawApplication(id, reason = '') {
    const res = await fetch(`${API_BASE}/applications/${id}/withdraw`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
      body: JSON.stringify({ reason }),
    });
    return res.json();
  },

  async getApplicationTimeline(id) {
    const res = await fetch(`${API_BASE}/applications/${id}/timeline`, {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
    });
    return res.json();
  },

  async getApplicationCertificate(id) {
    const res = await fetch(`${API_BASE}/applications/${id}/certificate`, {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
    });
    return res.json();
  },

  // ── Phase 5: Certificates ──
  async getCertificates() {
    const res = await fetch(`${API_BASE}/certificates`, {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
    });
    return res.json();
  },

  async getCertificateById(id) {
    const res = await fetch(`${API_BASE}/certificates/${id}`, {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
    });
    return res.json();
  },

  // Public unauthenticated verification
  async verifyPublicCertificate(code) {
    const res = await fetch(`/api/certificates/verify/${encodeURIComponent(code)}`);
    return res.json();
  },

  // ── Notifications ──
  async getNotifications() {
    const res = await fetch(`${API_BASE}/notifications`, {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
    });
    return res.json();
  },

  async markNotificationRead(id) {
    const res = await fetch(`${API_BASE}/notifications/${id}/read`, {
      method: 'PATCH',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
    });
    return res.json();
  },

  async markAllNotificationsRead() {
    const res = await fetch(`${API_BASE}/notifications/read-all`, {
      method: 'PATCH',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
    });
    return res.json();
  },
};
