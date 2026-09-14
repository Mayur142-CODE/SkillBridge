/**
 * Institution Service
 * SkillBridge / SIH 26044 — Academia–Industry Portal
 *
 * Dedicated frontend API client for the Institution Panel.
 */

const API_BASE = '/api/institution';

const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  const headers = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
};

export const institutionService = {
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

  // ── Notifications (Phase 1) ──
  async getNotifications(params = {}) {
    const query = new URLSearchParams();

    if (params.page) query.set('page', params.page);
    if (params.limit) query.set('limit', params.limit);
    if (params.unreadOnly) query.set('unreadOnly', 'true');

    const queryString = query.toString();
    const res = await fetch(`${API_BASE}/notifications${queryString ? `?${queryString}` : ''}`, {
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

  // ── Institutional Profile (Phase 2) ──
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
      method: 'PATCH',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
      body: JSON.stringify(profileData),
    });
    return res.json();
  },

  // ── Accreditation Records (Phase 2) ──
  async getAccreditations() {
    const res = await fetch(`${API_BASE}/accreditations`, {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
    });
    return res.json();
  },

  async createAccreditation(data) {
    const res = await fetch(`${API_BASE}/accreditations`, {
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

  async updateAccreditation(id, data) {
    const res = await fetch(`${API_BASE}/accreditations/${id}`, {
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

  async deleteAccreditation(id) {
    const res = await fetch(`${API_BASE}/accreditations/${id}`, {
      method: 'DELETE',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
    });
    return res.json();
  },

  async uploadAccreditationDocument(id, file) {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${API_BASE}/accreditations/${id}/document`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        ...getAuthHeaders(),
      },
      body: formData,
    });
    return res.json();
  },

  async deleteAccreditationDocument(id) {
    const res = await fetch(`${API_BASE}/accreditations/${id}/document`, {
      method: 'DELETE',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
    });
    return res.json();
  },

  getAccreditationDocViewUrl(id) {
    return `${API_BASE}/accreditations/${id}/document/view`;
  },

  getAccreditationDocDownloadUrl(id) {
    return `${API_BASE}/accreditations/${id}/document/download`;
  },

  // ── Department Registry (Phase 2) ──
  async getDepartments(params = {}) {
    const query = new URLSearchParams();
    if (params.search) query.append('search', params.search);
    if (params.status) query.append('status', params.status);
    const res = await fetch(`${API_BASE}/departments?${query.toString()}`, {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
    });
    return res.json();
  },

  async createDepartment(data) {
    const res = await fetch(`${API_BASE}/departments`, {
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

  async updateDepartment(id, data) {
    const res = await fetch(`${API_BASE}/departments/${id}`, {
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

  async deleteDepartment(id) {
    const res = await fetch(`${API_BASE}/departments/${id}`, {
      method: 'DELETE',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
    });
    return res.json();
  },

  // ── Student Roster & Verification (Phase 3) ──
  async getStudents(params = {}) {
    const query = new URLSearchParams();
    if (params.search) query.append('search', params.search);
    if (params.status) query.append('status', params.status);
    if (params.program) query.append('program', params.program);
    if (params.branch) query.append('branch', params.branch);
    if (params.academicYear) query.append('academicYear', params.academicYear);
    if (params.sort) query.append('sort', params.sort);
    if (params.page) query.append('page', params.page);
    if (params.limit) query.append('limit', params.limit);
    const res = await fetch(`${API_BASE}/students?${query.toString()}`, {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
    });
    return res.json();
  },

  async getStudent(id) {
    const res = await fetch(`${API_BASE}/students/${id}`, {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
    });
    return res.json();
  },

  async addStudent(data) {
    const res = await fetch(`${API_BASE}/students`, {
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

  async bulkEnrollStudents(file) {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${API_BASE}/students/bulk`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        ...getAuthHeaders(),
      },
      body: formData,
    });
    return res.json();
  },

  async verifyStudent(id, data = {}) {
    const res = await fetch(`${API_BASE}/students/${id}/verify`, {
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

  async updateStudent(id, data) {
    const res = await fetch(`${API_BASE}/students/${id}`, {
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

  async deactivateStudent(id) {
    const res = await fetch(`${API_BASE}/students/${id}`, {
      method: 'DELETE',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
    });
    return res.json();
  },

  async issueNoc(id, data, file) {
    const formData = new FormData();
    if (data) {
      Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') formData.append(key, value);
      });
    }
    if (file) formData.append('file', file);
    const res = await fetch(`${API_BASE}/students/${id}/noc`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        ...getAuthHeaders(),
      },
      body: formData,
    });
    return res.json();
  },

  async getStudentNocs(id) {
    const res = await fetch(`${API_BASE}/students/${id}/noc`, {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
    });
    return res.json();
  },

  getNocDocViewUrl(id) {
    return `${API_BASE}/noc/${id}/document/view`;
  },

  getNocDocDownloadUrl(id) {
    return `${API_BASE}/noc/${id}/document/download`;
  },

  // ── Faculty Governance (Phase 4) ──
  async getFaculty(params = {}) {
    const query = new URLSearchParams();
    if (params.search) query.append('search', params.search);
    if (params.status) query.append('status', params.status);
    if (params.department) query.append('department', params.department);
    if (params.sort) query.append('sort', params.sort);
    if (params.page) query.append('page', params.page);
    if (params.limit) query.append('limit', params.limit);
    const res = await fetch(`${API_BASE}/faculty?${query.toString()}`, {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
    });
    return res.json();
  },

  async getFacultyDetail(id) {
    const res = await fetch(`${API_BASE}/faculty/${id}`, {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
    });
    return res.json();
  },

  async getFacultyEngagements(params = {}) {
    const query = new URLSearchParams();
    if (params.kind) query.append('kind', params.kind);
    if (params.type) query.append('type', params.type);
    if (params.status) query.append('status', params.status);
    if (params.search) query.append('search', params.search);
    if (params.facultyId) query.append('facultyId', params.facultyId);
    if (params.reviewable) query.append('reviewable', 'true');
    if (params.page) query.append('page', params.page);
    if (params.limit) query.append('limit', params.limit);
    const res = await fetch(`${API_BASE}/faculty/engagements?${query.toString()}`, {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
    });
    return res.json();
  },

  async getFacultyEngagementDetail(id) {
    const res = await fetch(`${API_BASE}/faculty/engagements/${id}`, {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
    });
    return res.json();
  },

  async approveFacultyEngagement(id, data = {}) {
    const res = await fetch(`${API_BASE}/faculty/engagements/${id}/approve`, {
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

  async rejectFacultyEngagement(id, data = {}) {
    const res = await fetch(`${API_BASE}/faculty/engagements/${id}/reject`, {
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

  // ── Placement & Training (TPO Oversight) (Phase 5) ──
  async getPlacements(params = {}) {
    const query = new URLSearchParams();
    if (params.type) query.append('type', params.type);
    if (params.program) query.append('program', params.program);
    if (params.branch) query.append('branch', params.branch);
    if (params.academicYear) query.append('academicYear', params.academicYear);
    if (params.fromDate) query.append('fromDate', params.fromDate);
    if (params.toDate) query.append('toDate', params.toDate);
    const queryString = query.toString();
    const res = await fetch(`${API_BASE}/placements${queryString ? `?${queryString}` : ''}`, {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
    });
    return res.json();
  },

  // ── Institutional MoUs (Phase 6) ──
  async getMous(params = {}) {
    const query = new URLSearchParams();
    if (params.search) query.append('search', params.search);
    if (params.status) query.append('status', params.status);
    if (params.type) query.append('type', params.type);
    if (params.partnerType) query.append('partnerType', params.partnerType);
    if (params.expiringSoon) query.append('expiringSoon', 'true');
    if (params.sort) query.append('sort', params.sort);
    if (params.page) query.append('page', params.page);
    if (params.limit) query.append('limit', params.limit);
    const queryString = query.toString();
    const res = await fetch(`${API_BASE}/mous${queryString ? `?${queryString}` : ''}`, {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
    });
    return res.json();
  },

  async getMou(id) {
    const res = await fetch(`${API_BASE}/mous/${id}`, {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
    });
    return res.json();
  },

  async createMou(data) {
    const res = await fetch(`${API_BASE}/mous`, {
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

  async updateMou(id, data) {
    const res = await fetch(`${API_BASE}/mous/${id}`, {
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

  async activateMou(id) {
    const res = await fetch(`${API_BASE}/mous/${id}/activate`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
    });
    return res.json();
  },

  async archiveMou(id) {
    const res = await fetch(`${API_BASE}/mous/${id}/archive`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
    });
    return res.json();
  },

  async deleteMou(id) {
    const res = await fetch(`${API_BASE}/mous/${id}`, {
      method: 'DELETE',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
    });
    return res.json();
  },

  async uploadMouDocument(id, file) {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${API_BASE}/mous/${id}/document`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        ...getAuthHeaders(),
      },
      body: formData,
    });
    return res.json();
  },

  async deleteMouDocument(id) {
    const res = await fetch(`${API_BASE}/mous/${id}/document`, {
      method: 'DELETE',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
    });
    return res.json();
  },

  getMouDocViewUrl(id) {
    return `${API_BASE}/mous/${id}/document/view`;
  },

  getMouDocDownloadUrl(id) {
    return `${API_BASE}/mous/${id}/document/download`;
  },
};