import { useState, useEffect, useRef } from 'react';
import {
  UsersRound,
  FileSpreadsheet,
  ShieldCheck,
  ScrollText,
  Search,
  Plus,
  Upload,
  Eye,
  Download,
  BadgeCheck,
  UserRoundX,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Pencil,
  Loader,
  X,
} from 'lucide-react';
import { institutionService } from '../../services/institutionService';

/**
 * Institution Panel — Student Roster & Verification (Phase 3)
 *
 * Tabs:
 *   A. Roster — searchable / filterable / paginated roster of ALL owned students
 *      (User.institutionId → authenticated institution). Detail view shows
 *      identity, academic info, verification state, documents and NOCs.
 *   B. Bulk Enrollment — CSV upload with row-level error reporting.
 *   C. Verification — students awaiting academic verification with a verify action.
 *   D. NOCs — pick a student, list / issue No Objection Certificates.
 *
 * Ownership is enforced server-side (req.user._id); the UI never sends a
 * client-chosen institutionId.
 */

const TAB_META = [
  { id: 'roster', label: 'Roster', icon: UsersRound },
  { id: 'bulk', label: 'Bulk Enrollment', icon: FileSpreadsheet },
  { id: 'verification', label: 'Verification', icon: ShieldCheck },
  { id: 'nocs', label: 'NOCs', icon: ScrollText },
];

const ACCOUNT_STATUS_META = {
  verified: { label: 'Verified', badge: 'industry-badge--success' },
  pending: { label: 'Pending', badge: 'industry-badge--warning' },
  rejected: { label: 'Rejected', badge: 'industry-badge--error' },
  suspended: { label: 'Suspended', badge: 'industry-badge--error' },
  deactivated: { label: 'Deactivated', badge: 'industry-badge--neutral' },
};

const VERIFIED_META = {
  true: { label: 'Academic Verified', badge: 'industry-badge--success' },
  false: { label: 'Not Verified', badge: 'industry-badge--warning' },
};

const NOC_REASONS = ['internship', 'placement'];
const SORT_OPTIONS = [
  { value: 'recent', label: 'Recently joined' },
  { value: 'name', label: 'Name (A–Z)' },
  { value: 'email', label: 'Email (A–Z)' },
  { value: 'cgpa', label: 'CGPA (high first)' },
];

const CSV_EXPECTED_COLUMNS = [
  'name', 'email', 'password', 'studentId', 'rollNumber', 'university',
  'program', 'branch', 'academicYear', 'semester', 'division', 'degree', 'cgpa',
];

const formatDate = (value) => {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return value;
  }
};

const toDateInput = (value) => {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export default function InstitutionStudentsPage() {
  const [activeTab, setActiveTab] = useState('roster');

  // ── Roster ──
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [students, setStudents] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 20, pages: 1 });
  const [facets, setFacets] = useState({ programs: [], branches: [], years: [] });
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    program: '',
    branch: '',
    academicYear: '',
    sort: 'recent',
    page: 1,
  });
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const searchTimer = useRef(null);

  // ── Detail ──
  const [detailStudent, setDetailStudent] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // ── Add-student modal ──
  const [addOpen, setAddOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const [addForm, setAddForm] = useState({
    name: '', email: '', password: '', degree: '', university: '', program: '',
    branch: '', academicYear: '', semester: '', division: '', studentId: '', rollNumber: '', cgpa: '',
  });

  // ── Verify modal ──
  const [verifyTarget, setVerifyTarget] = useState(null);
  const [verifyNote, setVerifyNote] = useState('');

  // ── Deactivate confirm ──
  const [deactivateTarget, setDeactivateTarget] = useState(null);
  const [deactivating, setDeactivating] = useState(false);

  // ── NOC modal ──
  const [nocTarget, setNocTarget] = useState(null);
  const [nocReason, setNocReason] = useState('internship');
  const [nocIssueDate, setNocIssueDate] = useState('');
  const [nocValidity, setNocValidity] = useState('');
  const [nocFile, setNocFile] = useState(null);
  const [nocErrors, setNocErrors] = useState({});

  // ── Bulk ──
  const [bulkFile, setBulkFile] = useState(null);
  const [bulkUploading, setBulkUploading] = useState(false);
  const [bulkResult, setBulkResult] = useState(null);
  const [bulkError, setBulkError] = useState(null);

  // ── NOC tab ──
  const [nocStudentId, setNocStudentId] = useState('');
  const [nocList, setNocList] = useState([]);
  const [nocListLoading, setNocListLoading] = useState(false);

  const successTimer = useRef(null);

  useEffect(() => {
    if (!successMsg) return;
    clearTimeout(successTimer.current);
    successTimer.current = setTimeout(() => setSuccessMsg(null), 4000);
    return () => clearTimeout(successTimer.current);
  }, [successMsg]);

  // Debounce free-text search input.
  useEffect(() => {
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setDebouncedSearch(filters.search);
    }, 350);
    return () => clearTimeout(searchTimer.current);
  }, [filters.search]);

  // Pool full roster refetch on debounced search.
  useEffect(() => {
    if (debouncedSearch !== filters.search) return;
    fetchRoster();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, filters.status, filters.program, filters.branch, filters.academicYear, filters.sort, filters.page]);

  const fetchRoster = async () => {
    setLoading(true);
    setError(null);
    try {
      const json = await institutionService.getStudents({
        search: debouncedSearch,
        status: filters.status,
        program: filters.program,
        branch: filters.branch,
        academicYear: filters.academicYear,
        sort: filters.sort,
        page: filters.page,
        limit: 20,
      });
      if (json && json.success) {
        setStudents(json.data.students || []);
        setPagination(json.data.pagination || { total: 0, page: 1, limit: 20, pages: 1 });
        setFacets(json.data.facets || { programs: [], branches: [], years: [] });
      } else {
        setError(json?.message || 'Failed to load student roster.');
      }
    } catch {
      setError('Network error while loading the roster.');
    } finally {
      setLoading(false);
    }
  };

  // Pool a fresh roster fetch once on mount.
  useEffect(() => {
    fetchRoster();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openDetail = async (id) => {
    setDetailStudent(null);
    setDetailLoading(true);
    try {
      const json = await institutionService.getStudent(id);
      setDetailStudent(json?.success ? json.data.student : null);
    } catch {
      setDetailStudent(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const refreshRoster = () => {
    fetchRoster();
    if (detailStudent) {
      openDetail(detailStudent._id);
    }
    if (nocStudentId) {
      fetchNocs(nocStudentId);
    }
    const tabStudentIds = students.map((s) => s._id);
    if (activeTab === 'verification' && filters.status !== '' && filters.status !== 'pending') {
      setFilters((f) => ({ ...f, status: '' }));
    } else if (tabStudentIds.length > 0) {
      fetchRoster();
    }
    fetchVerificationPending();
  };

  /* ── Add student ── */
  const openAdd = () => {
    setFormErrors({});
    setAddForm({
      name: '', email: '', password: '', degree: '', university: '', program: '',
      branch: '', academicYear: '', semester: '', division: '', studentId: '', rollNumber: '', cgpa: '',
    });
    setAddOpen(true);
  };

  const setAdd = (key, value) => setAddForm((f) => ({ ...f, [key]: value }));

  const submitAdd = async (e) => {
    e.preventDefault();
    setSaving(true);
    setFormErrors({});
    setError(null);
    try {
      const res = await institutionService.addStudent(addForm);
      if (res.success) {
        setAddOpen(false);
        setSuccessMsg(`Student ${res.data?.student?.name || ''} enrolled successfully.`);
        setFilters((f) => ({ ...f, page: 1 }));
        fetchRoster();
      } else if (res.status === 409 || (res.errors && Object.keys(res.errors).length > 0)) {
        if (res.status === 409) setError(res.message || 'An account with this email already exists.');
        else setFormErrors(res.errors || {});
      } else {
        setError(res.message || 'Failed to enroll the student.');
      }
    } catch {
      setError('Network error while enrolling the student.');
    } finally {
      setSaving(false);
    }
  };

  /* ── Verify ── */
  const submitVerify = async () => {
    if (!verifyTarget) return;
    setSaving(true);
    setError(null);
    try {
      const res = await institutionService.verifyStudent(verifyTarget._id, { note: verifyNote });
      if (res.success) {
        setVerifyTarget(null);
        setVerifyNote('');
        setSuccessMsg(`Academic credentials verified for ${verifyTarget.name}.`);
        refreshRoster();
      } else {
        setError(res.message || 'Verification failed.');
      }
    } catch {
      setError('Network error during verification.');
    } finally {
      setSaving(false);
    }
  };

  /* ── Deactivate ── */
  const confirmDeactivate = async () => {
    if (!deactivateTarget) return;
    setDeactivating(true);
    setError(null);
    try {
      const res = await institutionService.deactivateStudent(deactivateTarget._id);
      if (res.success) {
        setDeactivateTarget(null);
        setSuccessMsg(`${deactivateTarget.name}'s account deactivated.`);
        refreshRoster();
      } else {
        setError(res.message || 'Deactivation failed.');
      }
    } catch {
      setError('Network error during deactivation.');
    } finally {
      setDeactivating(false);
    }
  };

  /* ── NOC ── */
  const openNocModal = (student) => {
    setNocTarget(student);
    setNocReason('internship');
    setNocIssueDate(toDateInput(new Date()));
    setNocValidity('');
    setNocFile(null);
    setNocErrors({});
  };

  const submitNoc = async () => {
    if (!nocTarget) return;
    setSaving(true);
    setNocErrors({});
    setError(null);
    try {
      const res = await institutionService.issueNoc(
        nocTarget._id,
        { reason: nocReason, issueDate: nocIssueDate, validity: nocValidity },
        nocFile
      );
      if (res.success) {
        setNocTarget(null);
        setNocFile(null);
        setSuccessMsg(`NOC ${res.data?.noc?.issueNumber || ''} issued.`);
        refreshRoster();
      } else {
        setNocErrors(res.errors || {});
        setError(res.message || 'Failed to issue NOC.');
      }
    } catch {
      setError('Network error while issuing the NOC.');
    } finally {
      setSaving(false);
    }
  };

  /* ── NOC tab ── */
  const fetchNocs = async (studentId) => {
    if (!studentId) {
      setNocList([]);
      return;
    }
    setNocListLoading(true);
    try {
      const json = await institutionService.getStudentNocs(studentId);
      setNocList(json?.success ? json.data.nocs || [] : []);
    } catch {
      setNocList([]);
    } finally {
      setNocListLoading(false);
    }
  };

  const onNocStudentChange = (value) => {
    setNocStudentId(value);
    fetchNocs(value);
  };

  /* ── Verification tab ── */
  const [pendingStudents, setPendingStudents] = useState([]);
  const [pendingLoading, setPendingLoading] = useState(false);

  const fetchVerificationPending = async () => {
    setPendingLoading(true);
    try {
      const json = await institutionService.getStudents({ limit: 100, status: '', sort: 'recent' });
      if (json?.success) {
        const all = json.data.students || [];
        const pendingList = await Promise.all(
          all.map(async (s) => {
            if (s.studentProfile?.academicVerified) return null;
            const d = await institutionService.getStudent(s._id);
            return (d?.success ? d.data.student : s) || null;
          })
        );
        setPendingStudents(pendingList.filter(Boolean));
      } else {
        setPendingStudents([]);
      }
    } catch {
      setPendingStudents([]);
    } finally {
      setPendingLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'verification') {
      fetchVerificationPending();
    } else if (activeTab === 'nocs' && students.length > 0 && !nocStudentId) {
      setNocStudentId(students[0]._id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'nocs' && nocStudentId) {
      fetchNocs(nocStudentId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, nocStudentId]);

  const pageChanged = (page) => setFilters((f) => ({ ...f, page }));

  const Roster = () => (
    <div>
      {/* Filter bar */}
      <div className="industry-form">
        <div className="industry-form-row">
          <div className="industry-form-group">
            <label className="industry-form-label" htmlFor="roster-search">Search</label>
            <div style={{ position: 'relative' }}>
              <Search size={16} aria-hidden="true" style={{ position: 'absolute', left: 10, top: 11, color: 'var(--color-muted)' }} />
              <input
                id="roster-search"
                className="industry-input"
                style={{ paddingLeft: 34 }}
                placeholder="Name, email, student ID, roll no…"
                value={filters.search}
                onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value, page: 1 }))}
              />
            </div>
          </div>
          <div className="industry-form-group">
            <label className="industry-form-label" htmlFor="roster-status">Account status</label>
            <select
              id="roster-status"
              className="industry-select"
              value={filters.status}
              onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value, page: 1 }))}
            >
              <option value="">All statuses</option>
              <option value="verified">Verified</option>
              <option value="pending">Pending</option>
              <option value="rejected">Rejected</option>
              <option value="deactivated">Deactivated</option>
            </select>
          </div>
          <div className="industry-form-group">
            <label className="industry-form-label" htmlFor="roster-program">Program</label>
            <select
              id="roster-program"
              className="industry-select"
              value={filters.program}
              onChange={(e) => setFilters((f) => ({ ...f, program: e.target.value, page: 1 }))}
            >
              <option value="">All programs</option>
              {facets.programs.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div className="industry-form-group">
            <label className="industry-form-label" htmlFor="roster-branch">Branch</label>
            <select
              id="roster-branch"
              className="industry-select"
              value={filters.branch}
              onChange={(e) => setFilters((f) => ({ ...f, branch: e.target.value, page: 1 }))}
            >
              <option value="">All branches</option>
              {facets.branches.map((b) => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>
          <div className="industry-form-group">
            <label className="industry-form-label" htmlFor="roster-year">Year</label>
            <select
              id="roster-year"
              className="industry-select"
              value={filters.academicYear}
              onChange={(e) => setFilters((f) => ({ ...f, academicYear: e.target.value, page: 1 }))}
            >
              <option value="">All years</option>
              {facets.years.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div className="industry-form-group">
            <label className="industry-form-label" htmlFor="roster-sort">Sort</label>
            <select
              id="roster-sort"
              className="industry-select"
              value={filters.sort}
              onChange={(e) => setFilters((f) => ({ ...f, sort: e.target.value, page: 1 }))}
            >
              {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Stats strip */}
      <div className="industry-metrics-grid" style={{ margin: '20px 0' }}>
        <div className="industry-metric-card">
          <div className="industry-metric-value">{pagination.total}</div>
          <div className="industry-metric-label">Total students</div>
        </div>
        <div className="industry-metric-card">
          <div className="industry-metric-value">
            {students.filter((s) => s.studentProfile?.academicVerified).length}
          </div>
          <div className="industry-metric-label">Academic verified (this page)</div>
        </div>
        <div className="industry-metric-card">
          <div className="industry-metric-value">
            {students.filter((s) => s.status === 'deactivated').length}
          </div>
          <div className="industry-metric-label">Deactivated (this page)</div>
        </div>
      </div>

      {/* Table */}
      <div className="industry-recent-apps-table-wrap">
        <table className="industry-table">
          <thead>
            <tr>
              <th>Student</th>
              <th>Program</th>
              <th>Year</th>
              <th>CGPA</th>
              <th>Account</th>
              <th>Verification</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {students.length === 0 && !loading && (
              <tr>
                <td colSpan={7}>
                  <div className="industry-empty-state">
                    <p>No students match the current filters.</p>
                  </div>
                </td>
              </tr>
            )}
            {students.map((s) => {
              const statusMeta = ACCOUNT_STATUS_META[s.status] || ACCOUNT_STATUS_META.pending;
              const verified = s.studentProfile?.academicVerified;
              const vMeta = verified ? VERIFIED_META.true : VERIFIED_META.false;
              return (
                <tr key={s._id}>
                  <td>
                    <div className="industry-table__title-cell">
                      <div className="industry-table__strong">{s.name}</div>
                      <div className="industry-table__subtext">{s.email}</div>
                    </div>
                  </td>
                  <td>{s.studentProfile?.program || '—'}</td>
                  <td>{s.studentProfile?.academicYear || '—'}</td>
                  <td>{s.studentProfile?.cgpa || '—'}</td>
                  <td><span className={`industry-badge ${statusMeta.badge}`}>{statusMeta.label}</span></td>
                  <td><span className={`industry-badge ${vMeta.badge}`}>{vMeta.label}</span></td>
                  <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                    <button
                      className="industry-btn industry-btn--secondary industry-btn--sm"
                      onClick={() => openDetail(s._id)}
                      title="View student details"
                    >
                      <Eye size={14} /> View
                    </button>
                    {!verified && s.status !== 'deactivated' && (
                      <button
                        className="industry-btn industry-btn--primary industry-btn--sm"
                        style={{ marginLeft: 6 }}
                        onClick={() => { setVerifyTarget(s); setVerifyNote(''); }}
                        title="Verify academic credentials"
                      >
                        <BadgeCheck size={14} /> Verify
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="industry-pagination" style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 16, flexWrap: 'wrap' }}>
          <button
            className="industry-btn industry-btn--secondary industry-btn--sm"
            disabled={pagination.page <= 1}
            onClick={() => pageChanged(pagination.page - 1)}
          >
            Previous
          </button>
          <span style={{ fontSize: 13, color: 'var(--color-muted)' }}>
            Page {pagination.page} of {pagination.pages} · {pagination.total} student{pagination.total === 1 ? '' : 's'}
          </span>
          <button
            className="industry-btn industry-btn--secondary industry-btn--sm"
            disabled={pagination.page >= pagination.pages}
            onClick={() => pageChanged(pagination.page + 1)}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );

  const BulkEnrollment = () => (
    <div>
      <section className="industry-dashboard-section" aria-label="CSV import guidance">
        <div className="industry-section-header">
          <div className="industry-section-title-wrap">
            <h2 className="industry-section-title">Expected CSV columns</h2>
            <p className="industry-section-desc">
              First row must be a header. <strong>name, email</strong> and <strong>password</strong> are required
              (min 8 characters). All other columns are optional. Duplicate emails are skipped without failing the import.
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
          {CSV_EXPECTED_COLUMNS.map((c) => (
            <span key={c} className="industry-badge industry-badge--neutral">{c}</span>
          ))}
        </div>
        <div className="industry-alert industry-alert--info" style={{ marginTop: 12 }}>
          <div className="industry-alert__content">
            <p className="industry-alert__desc">
              Sample header row: <code>name,email,password,studentId,university,program,branch,academicYear,semester,division,degree,cgpa</code>
            </p>
          </div>
        </div>
      </section>

      <section className="industry-dashboard-section" aria-label="Upload CSV">
        <div className="industry-section-header">
          <div className="industry-section-title-wrap">
            <h2 className="industry-section-title">Upload roster CSV</h2>
            <p className="industry-section-desc">Institution is taken from your verified session — never from the file.</p>
          </div>
        </div>
        <div className="industry-form">
          <div className="industry-form-row">
            <div className="industry-form-group" style={{ flex: 1 }}>
              <label className="industry-form-label" htmlFor="bulk-csv">CSV file</label>
              <input
                id="bulk-csv"
                className="industry-input"
                type="file"
                accept=".csv,text/csv"
                onChange={(e) => { setBulkFile(e.target.files[0] || null); setBulkResult(null); setBulkError(null); }}
              />
            </div>
            <div className="industry-form-group" style={{ alignSelf: 'flex-end' }}>
              <button
                className="industry-btn industry-btn--primary"
                disabled={!bulkFile || bulkUploading}
                onClick={async () => {
                  if (!bulkFile) return;
                  setBulkUploading(true);
                  setBulkResult(null);
                  setBulkError(null);
                  try {
                    const res = await institutionService.bulkEnrollStudents(bulkFile);
                    if (res.success) {
                      setBulkResult(res.data.summary);
                      fetchRoster();
                      if (nocStudentId) fetchNocs(nocStudentId);
                    } else {
                      setBulkError(res.message || 'Bulk import failed.');
                    }
                  } catch {
                    setBulkError('Network error during bulk import.');
                  } finally {
                    setBulkUploading(false);
                  }
                }}
              >
                {bulkUploading ? <Loader2 size={16} className="spinner" /> : <Upload size={16} />}
                {bulkUploading ? 'Uploading…' : 'Upload & enroll'}
              </button>
            </div>
          </div>
        </div>

        {bulkError && (
          <div className="industry-alert industry-alert--error" style={{ marginTop: 16 }}>
            <div className="industry-alert__content">
              <h3 className="industry-alert__title">Import failed</h3>
              <p className="industry-alert__desc">{bulkError}</p>
            </div>
          </div>
        )}

        {bulkResult && (
          <div className="industry-dashboard-section" style={{ marginTop: 20 }}>
            <div className="industry-metrics-grid">
              <div className="industry-metric-card">
                <div className="industry-metric-value">{bulkResult.total}</div>
                <div className="industry-metric-label">Rows in file</div>
              </div>
              <div className="industry-metric-card">
                <div className="industry-metric-value">{bulkResult.created}</div>
                <div className="industry-metric-label">Students created</div>
              </div>
              <div className="industry-metric-card">
                <div className="industry-metric-value">{bulkResult.skipped}</div>
                <div className="industry-metric-label">Skipped</div>
              </div>
            </div>

            {bulkResult.errors.length > 0 ? (
              <div className="industry-recent-apps-table-wrap" style={{ marginTop: 16 }}>
                <table className="industry-table">
                  <thead>
                    <tr>
                      <th>Row</th>
                      <th>Email</th>
                      <th>Reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bulkResult.errors.map((err, i) => (
                      <tr key={i}>
                        <td>{err.row}</td>
                        <td>{err.email || '—'}</td>
                        <td>{err.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="industry-alert industry-alert--success" style={{ marginTop: 16 }}>
                <div className="industry-alert__content">
                  <p className="industry-alert__desc">All rows imported successfully — no errors.</p>
                </div>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );

  const VerificationTab = () => (
    <div>
      <div className="industry-alert industry-alert--info">
        <div className="industry-alert__content">
          <p className="industry-alert__desc">
            Students whose academic credentials are not yet verified. Verification confirms the institution has
            reviewed degree / program / CGPA data — authentication is separate and unchanged.
          </p>
        </div>
      </div>
      <div className="industry-recent-apps-table-wrap" style={{ marginTop: 16 }}>
        <table className="industry-table">
          <thead>
            <tr>
              <th>Student</th>
              <th>Program</th>
              <th>Year</th>
              <th>CGPA</th>
              <th>Account</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {pendingLoading && (
              <tr><td colSpan={6}><div className="industry-empty-state"><Loader size={18} className="spinner" /> Loading…</div></td></tr>
            )}
            {!pendingLoading && pendingStudents.length === 0 && (
              <tr>
                <td colSpan={6}>
                  <div className="industry-empty-state">
                    <CheckCircle2 size={20} />
                    <p>No students pending academic verification.</p>
                  </div>
                </td>
              </tr>
            )}
            {pendingStudents.map((s) => {
              const statusMeta = ACCOUNT_STATUS_META[s.status] || ACCOUNT_STATUS_META.pending;
              const vMeta = VERIFIED_META.false;
              return (
                <tr key={s._id}>
                  <td>
                    <div className="industry-table__title-cell">
                      <div className="industry-table__strong">{s.name}</div>
                      <div className="industry-table__subtext">{s.email}</div>
                    </div>
                  </td>
                  <td>{s.studentProfile?.program || '—'}</td>
                  <td>{s.studentProfile?.academicYear || '—'}</td>
                  <td>{s.studentProfile?.cgpa || '—'}</td>
                  <td><span className={`industry-badge ${statusMeta.badge}`}>{statusMeta.label}</span></td>
                  <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                    <button
                      className="industry-btn industry-btn--secondary industry-btn--sm"
                      onClick={() => openDetail(s._id)}
                      title="View details"
                    >
                      <Eye size={14} /> View
                    </button>
                    {s.status !== 'deactivated' && (
                      <button
                        className="industry-btn industry-btn--primary industry-btn--sm"
                        style={{ marginLeft: 6 }}
                        onClick={() => { setVerifyTarget(s); setVerifyNote(''); }}
                      >
                        <BadgeCheck size={14} /> Verify
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div style={{ marginTop: 12, display: 'flex', gap: 8, alignItems: 'center' }}>
        <span className="industry-badge {vMeta.badge}" aria-hidden="true">&nbsp;</span>
      </div>
    </div>
  );

  const NocTab = () => (
    <div>
      <div className="industry-form">
        <div className="industry-form-row">
          <div className="industry-form-group" style={{ flex: 1, maxWidth: 420 }}>
            <label className="industry-form-label" htmlFor="noc-student">Student</label>
            <select
              id="noc-student"
              className="industry-select"
              value={nocStudentId}
              onChange={(e) => onNocStudentChange(e.target.value)}
            >
              <option value="">Select a student…</option>
              {students.map((s) => (
                <option key={s._id} value={s._id}>{s.name} ({s.email})</option>
              ))}
            </select>
          </div>
          {nocStudentId && (
            <div className="industry-form-group" style={{ alignSelf: 'flex-end' }}>
              <button
                className="industry-btn industry-btn--primary"
                onClick={() => {
                  const s = students.find((x) => x._id === nocStudentId);
                  if (s) openNocModal(s);
                }}
              >
                <Plus size={16} /> Issue NOC
              </button>
            </div>
          )}
        </div>
      </div>

      {!nocStudentId && (
        <div className="industry-empty-state" style={{ marginTop: 16 }}>
          <ScrollText size={22} />
          <p>Select a student to view or issue their No Objection Certificates.</p>
        </div>
      )}

      {nocStudentId && (
        <div className="industry-recent-apps-table-wrap" style={{ marginTop: 16 }}>
          <table className="industry-table">
            <thead>
              <tr>
                <th>Issue number</th>
                <th>Reason</th>
                <th>Issue date</th>
                <th>Validity</th>
                <th style={{ textAlign: 'right' }}>Document</th>
              </tr>
            </thead>
            <tbody>
              {nocListLoading && (
                <tr><td colSpan={5}><div className="industry-empty-state"><Loader size={18} className="spinner" /> Loading…</div></td></tr>
              )}
              {!nocListLoading && nocList.length === 0 && (
                <tr>
                  <td colSpan={5}>
                    <div className="industry-empty-state">
                      <p>No NOCs issued for this student yet.</p>
                    </div>
                  </td>
                </tr>
              )}
              {nocList.map((n) => (
                <tr key={n._id}>
                  <td>
                    <div className="industry-table__title-cell">
                      <div className="industry-table__strong">{n.issueNumber}</div>
                      <div className="industry-table__subtext">{n.status}</div>
                    </div>
                  </td>
                  <td><span className="industry-badge industry-badge--info">{n.reason}</span></td>
                  <td>{formatDate(n.issueDate)}</td>
                  <td>{formatDate(n.validity)}</td>
                  <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                    {n.document ? (
                      <>
                        <a
                          className="industry-btn industry-btn--secondary industry-btn--sm"
                          href={institutionService.getNocDocViewUrl(n._id)}
                          target="_blank"
                          rel="noreferrer"
                          title={n.document.originalName}
                        >
                          <Eye size={14} /> View
                        </a>
                        <a
                          className="industry-btn industry-btn--secondary industry-btn--sm"
                          style={{ marginLeft: 6 }}
                          href={institutionService.getNocDocDownloadUrl(n._id)}
                          title={`Download ${n.document.originalName}`}
                        >
                          <Download size={14} /> Download
                        </a>
                      </>
                    ) : (
                      <span className="industry-table__subtext">No document</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  const renderTab = () => {
    switch (activeTab) {
      case 'bulk': return <BulkEnrollment />;
      case 'verification': return <VerificationTab />;
      case 'nocs': return <NocTab />;
      default: return <Roster />;
    }
  };

  if (loading && activeTab === 'roster' && students.length === 0) {
    return (
      <div className="industry-dashboard-loading" role="status" aria-label="Loading student roster">
        <div className="industry-dashboard-skeleton">
          <div className="industry-skeleton industry-skeleton--block" />
          <div className="industry-skeleton-grid">
            <div className="industry-skeleton industry-skeleton--card" />
            <div className="industry-skeleton industry-skeleton--card" />
            <div className="industry-skeleton industry-skeleton--card" />
          </div>
          <div className="industry-skeleton industry-skeleton--block" />
        </div>
      </div>
    );
  }

  return (
    <div className="industry-dashboard">
      <div className="industry-page-header">
        <div>
          <h1 className="industry-page-title">Student Roster &amp; Verification</h1>
          <p className="industry-page-subtitle">
            Manage enrolled students, verify academic credentials, and issue No Objection Certificates.
          </p>
        </div>
        {activeTab === 'roster' && (
          <button className="industry-btn industry-btn--primary" onClick={openAdd}>
            <Plus size={16} /> Enroll student
          </button>
        )}
      </div>

      {error && (
        <div className="industry-alert industry-alert--error" style={{ marginBottom: 16 }}>
          <AlertCircle size={18} className="industry-alert__icon" />
          <div className="industry-alert__content">
            <p className="industry-alert__desc">{error}</p>
            <button className="industry-btn industry-btn--secondary industry-btn--sm" onClick={() => { setError(null); fetchRoster(); }}>
              Retry
            </button>
          </div>
        </div>
      )}
      {successMsg && (
        <div className="industry-alert industry-alert--success" style={{ marginBottom: 16 }}>
          <CheckCircle2 size={18} className="industry-alert__icon" />
          <div className="industry-alert__content">
            <p className="industry-alert__desc">{successMsg}</p>
          </div>
        </div>
      )}

      <div className="segmented-tabs" role="tablist" aria-label="Student roster sections">
        {TAB_META.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            role="tab"
            aria-selected={activeTab === id}
            className={`segmented-tab${activeTab === id ? ' segmented-tab--active' : ''}`}
            onClick={() => setActiveTab(id)}
          >
            <span className="segmented-tab__icon"><Icon size={16} /></span>
            <span className="segmented-tab__label">{label}</span>
          </button>
        ))}
      </div>

      <section className="industry-dashboard-section" aria-label={TAB_META.find((t) => t.id === activeTab)?.label}>
        {renderTab()}
      </section>

      {/* ── Add / verify / deactivate / NOC + detail modals ── */}

      {addOpen && (
        <div className="industry-modal-overlay" role="dialog" aria-modal="true" aria-label="Enroll a new student">
          <div className="industry-modal industry-modal--lg" style={{ overflowY: 'auto', maxHeight: '90vh' }}>
            <div className="industry-modal__header">
              <h3 className="industry-modal__title">Enroll a student</h3>
              <button className="industry-modal__close" onClick={() => setAddOpen(false)} aria-label="Close"><X size={18} /></button>
            </div>
            <form onSubmit={submitAdd}>
              <div className="industry-modal__body">
                <p className="industry-modal__desc">
                  The student belongs to your institution automatically. The password is hashed server-side;
                  it is never stored or returned in plain text.
                </p>
                <div className="industry-form">
                  <div className="industry-form-row">
                    <div className="industry-form-group">
                      <label className="industry-form-label" htmlFor="add-name">Full name *</label>
                      <input id="add-name" className="industry-input" value={addForm.name} onChange={(e) => setAdd('name', e.target.value)} />
                      {formErrors.name && <span className="industry-form-error">{formErrors.name}</span>}
                    </div>
                    <div className="industry-form-group">
                      <label className="industry-form-label" htmlFor="add-email">Email *</label>
                      <input id="add-email" className="industry-input" type="email" value={addForm.email} onChange={(e) => setAdd('email', e.target.value)} />
                      {formErrors.email && <span className="industry-form-error">{formErrors.email}</span>}
                    </div>
                  </div>
                  <div className="industry-form-row">
                    <div className="industry-form-group">
                      <label className="industry-form-label" htmlFor="add-password">Temporary password * (min 8 chars)</label>
                      <input id="add-password" className="industry-input" type="password" value={addForm.password} onChange={(e) => setAdd('password', e.target.value)} />
                      {formErrors.password && <span className="industry-form-error">{formErrors.password}</span>}
                    </div>
                    <div className="industry-form-group">
                      <label className="industry-form-label" htmlFor="add-degree">Degree</label>
                      <input id="add-degree" className="industry-input" value={addForm.degree} onChange={(e) => setAdd('degree', e.target.value)} placeholder="Bachelor of Technology" />
                    </div>
                  </div>
                  <div className="industry-form-row">
                    <div className="industry-form-group">
                      <label className="industry-form-label" htmlFor="add-university">University</label>
                      <input id="add-university" className="industry-input" value={addForm.university} onChange={(e) => setAdd('university', e.target.value)} />
                    </div>
                    <div className="industry-form-group">
                      <label className="industry-form-label" htmlFor="add-program">Program</label>
                      <input id="add-program" className="industry-input" value={addForm.program} onChange={(e) => setAdd('program', e.target.value)} placeholder="B.Tech" />
                    </div>
                  </div>
                  <div className="industry-form-row">
                    <div className="industry-form-group">
                      <label className="industry-form-label" htmlFor="add-branch">Branch</label>
                      <input id="add-branch" className="industry-input" value={addForm.branch} onChange={(e) => setAdd('branch', e.target.value)} placeholder="Computer Science" />
                    </div>
                    <div className="industry-form-group">
                      <label className="industry-form-label" htmlFor="add-year">Academic year</label>
                      <input id="add-year" className="industry-input" value={addForm.academicYear} onChange={(e) => setAdd('academicYear', e.target.value)} placeholder="3rd Year" />
                    </div>
                  </div>
                  <div className="industry-form-row">
                    <div className="industry-form-group">
                      <label className="industry-form-label" htmlFor="add-semester">Semester</label>
                      <input id="add-semester" className="industry-input" value={addForm.semester} onChange={(e) => setAdd('semester', e.target.value)} />
                    </div>
                    <div className="industry-form-group">
                      <label className="industry-form-label" htmlFor="add-division">Division</label>
                      <input id="add-division" className="industry-input" value={addForm.division} onChange={(e) => setAdd('division', e.target.value)} />
                    </div>
                  </div>
                  <div className="industry-form-row">
                    <div className="industry-form-group">
                      <label className="industry-form-label" htmlFor="add-sid">Student ID</label>
                      <input id="add-sid" className="industry-input" value={addForm.studentId} onChange={(e) => setAdd('studentId', e.target.value)} />
                    </div>
                    <div className="industry-form-group">
                      <label className="industry-form-label" htmlFor="add-roll">Roll number</label>
                      <input id="add-roll" className="industry-input" value={addForm.rollNumber} onChange={(e) => setAdd('rollNumber', e.target.value)} />
                    </div>
                    <div className="industry-form-group">
                      <label className="industry-form-label" htmlFor="add-cgpa">CGPA</label>
                      <input id="add-cgpa" className="industry-input" value={addForm.cgpa} onChange={(e) => setAdd('cgpa', e.target.value)} placeholder="8.5" />
                      {formErrors.cgpa && <span className="industry-form-error">{formErrors.cgpa}</span>}
                    </div>
                  </div>
                </div>
              </div>
              <div className="industry-modal__footer">
                <button type="button" className="industry-btn industry-btn--secondary" onClick={() => setAddOpen(false)}>Cancel</button>
                <button type="submit" className="industry-btn industry-btn--primary" disabled={saving}>
                  {saving ? <Loader2 size={16} className="spinner" /> : <Plus size={16} />}
                  {saving ? 'Saving…' : 'Enroll student'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detail modal */}
      <div className="industry-modal-overlay" style={{ display: detailLoading ? 'flex' : 'none' }}>
        <div className="industry-modal industry-modal--lg" style={{ overflowY: 'auto', maxHeight: '90vh' }}>
          <div className="industry-modal__header"><h3 className="industry-modal__title">Loading student…</h3></div>
        </div>
      </div>

      {detailStudent && (
        <div className="industry-modal-overlay" role="dialog" aria-modal="true" aria-label="Student details">
          <div className="industry-modal industry-modal--lg" style={{ overflowY: 'auto', maxHeight: '90vh' }}>
            <div className="industry-modal__header">
              <h3 className="industry-modal__title">{detailStudent.name}</h3>
              <button className="industry-modal__close" onClick={() => setDetailStudent(null)} aria-label="Close"><X size={18} /></button>
            </div>
            <div className="industry-modal__body">
              <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap', marginBottom: 12 }}>
                <span className={`industry-badge ${ACCOUNT_STATUS_META[detailStudent.status]?.badge || 'industry-badge--neutral'}`}>
                  {ACCOUNT_STATUS_META[detailStudent.status]?.label || detailStudent.status}
                </span>
                <span className={`industry-badge ${detailStudent.studentProfile?.academicVerified ? 'industry-badge--success' : 'industry-badge--warning'}`}>
                  {detailStudent.studentProfile?.academicVerified ? 'Academic verified' : 'Not verified'}
                </span>
                <span className="industry-table__subtext">{detailStudent.email}</span>
              </div>

              <div className="industry-form">
                <div className="industry-form-row">
                  <div className="industry-form-group">
                    <label className="industry-form-label">University</label>
                    <div className="industry-input" style={{ pointerEvents: 'none' }}>{detailStudent.studentProfile?.university || '—'}</div>
                  </div>
                  <div className="industry-form-group">
                    <label className="industry-form-label">Degree</label>
                    <div className="industry-input" style={{ pointerEvents: 'none' }}>{detailStudent.studentProfile?.degree || '—'}</div>
                  </div>
                </div>
                <div className="industry-form-row">
                  <div className="industry-form-group">
                    <label className="industry-form-label">Program</label>
                    <div className="industry-input" style={{ pointerEvents: 'none' }}>{detailStudent.studentProfile?.program || '—'}</div>
                  </div>
                  <div className="industry-form-group">
                    <label className="industry-form-label">Branch</label>
                    <div className="industry-input" style={{ pointerEvents: 'none' }}>{detailStudent.studentProfile?.branch || '—'}</div>
                  </div>
                </div>
                <div className="industry-form-row">
                  <div className="industry-form-group">
                    <label className="industry-form-label">Academic year</label>
                    <div className="industry-input" style={{ pointerEvents: 'none' }}>{detailStudent.studentProfile?.academicYear || '—'}</div>
                  </div>
                  <div className="industry-form-group">
                    <label className="industry-form-label">Semester</label>
                    <div className="industry-input" style={{ pointerEvents: 'none' }}>{detailStudent.studentProfile?.semester || '—'}</div>
                  </div>
                  <div className="industry-form-group">
                    <label className="industry-form-label">Division</label>
                    <div className="industry-input" style={{ pointerEvents: 'none' }}>{detailStudent.studentProfile?.division || '—'}</div>
                  </div>
                </div>
                <div className="industry-form-row">
                  <div className="industry-form-group">
                    <label className="industry-form-label">Student ID</label>
                    <div className="industry-input" style={{ pointerEvents: 'none' }}>{detailStudent.studentProfile?.studentId || '—'}</div>
                  </div>
                  <div className="industry-form-group">
                    <label className="industry-form-label">Roll number</label>
                    <div className="industry-input" style={{ pointerEvents: 'none' }}>{detailStudent.studentProfile?.rollNumber || '—'}</div>
                  </div>
                  <div className="industry-form-group">
                    <label className="industry-form-label">CGPA</label>
                    <div className="industry-input" style={{ pointerEvents: 'none' }}>{detailStudent.studentProfile?.cgpa || '—'}</div>
                  </div>
                </div>
              </div>

              {detailStudent.studentProfile?.academicVerified && (
                <div className="industry-alert industry-alert--success" style={{ marginTop: 12 }}>
                  <div className="industry-alert__content">
                    <p className="industry-alert__desc">
                      <strong>Verified {formatDate(detailStudent.studentProfile?.academicVerifiedAt)}</strong>
                      {detailStudent.studentProfile?.academicVerificationNote ? ` — ${detailStudent.studentProfile.academicVerificationNote}` : ''}
                    </p>
                  </div>
                </div>
              )}
              {!detailStudent.studentProfile?.academicVerified && detailStudent.studentProfile?.academicVerificationNote && (
                <div className="industry-alert industry-alert--info" style={{ marginTop: 12 }}>
                  <div className="industry-alert__content">
                    <p className="industry-alert__desc">{detailStudent.studentProfile.academicVerificationNote}</p>
                  </div>
                </div>
              )}

              <h4 className="industry-section-title" style={{ marginTop: 20, fontSize: 15 }}>Documents</h4>
              {detailStudent.documents && detailStudent.documents.length > 0 ? (
                <div className="industry-recent-apps-table-wrap" style={{ marginTop: 8 }}>
                  <table className="industry-table">
                    <thead><tr><th>Title</th><th>Category</th><th>Uploaded</th></tr></thead>
                    <tbody>
                      {detailStudent.documents.map((d) => (
                        <tr key={d._id}>
                          <td>{d.title || '—'}</td>
                          <td>{d.category || '—'}</td>
                          <td>{formatDate(d.uploadedAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="industry-table__subtext" style={{ marginTop: 8 }}>No verified documents on record.</p>
              )}

              <h4 className="industry-section-title" style={{ marginTop: 20, fontSize: 15 }}>NOCs</h4>
              {detailStudent.nocs && detailStudent.nocs.length > 0 ? (
                <div className="industry-recent-apps-table-wrap" style={{ marginTop: 8 }}>
                  <table className="industry-table">
                    <thead><tr><th>Issue no.</th><th>Reason</th><th>Issue date</th><th>Validity</th></tr></thead>
                    <tbody>
                      {detailStudent.nocs.map((n) => (
                        <tr key={n._id}>
                          <td>{n.issueNumber}</td>
                          <td>{n.reason}</td>
                          <td>{formatDate(n.issueDate)}</td>
                          <td>{formatDate(n.validity)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="industry-table__subtext" style={{ marginTop: 8 }}>No NOCs issued.</p>
              )}
            </div>
            <div className="industry-modal__footer">
              <button
                className="industry-btn industry-btn--secondary"
                onClick={() => openNocModal(detailStudent)}
                title="Issue a No Objection Certificate"
              >
                <ScrollText size={16} /> Issue NOC
              </button>
              {!detailStudent.studentProfile?.academicVerified && detailStudent.status !== 'deactivated' && (
                <button
                  className="industry-btn industry-btn--primary"
                  onClick={() => { setVerifyTarget(detailStudent); setVerifyNote(''); }}
                >
                  <BadgeCheck size={16} /> Verify credentials
                </button>
              )}
              {detailStudent.status !== 'deactivated' && (
                <button
                  className="industry-btn industry-btn--danger"
                  onClick={() => setDeactivateTarget(detailStudent)}
                  title="Soft deactivate (never deletes history)"
                >
                  <UserRoundX size={16} /> Deactivate
                </button>
              )}
              <button className="industry-btn industry-btn--secondary" onClick={() => setDetailStudent(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Verify modal */}
      {verifyTarget && (
        <div className="industry-modal-overlay" role="dialog" aria-modal="true" aria-label="Verify academic credentials">
          <div className="industry-modal">
            <div className="industry-modal__header">
              <h3 className="industry-modal__title">Verify {verifyTarget.name}</h3>
              <button className="industry-modal__close" onClick={() => setVerifyTarget(null)} aria-label="Close"><X size={18} /></button>
            </div>
            <div className="industry-modal__body">
              <p className="industry-modal__desc">
                Confirms the institution has reviewed <strong>{verifyTarget.studentProfile?.degree || 'the degree'}</strong> ·{' '}
                {verifyTarget.studentProfile?.program || 'program'} (CGPA {verifyTarget.studentProfile?.cgpa || '—'}).
              </p>
              <div className="industry-form">
                <div className="industry-form-group">
                  <label className="industry-form-label" htmlFor="verify-note">Verification note (optional)</label>
                  <textarea id="verify-note" className="industry-textarea" rows={3} value={verifyNote} onChange={(e) => setVerifyNote(e.target.value)} placeholder="e.g. Verified against official mark sheets" />
                </div>
              </div>
            </div>
            <div className="industry-modal__footer">
              <button className="industry-btn industry-btn--secondary" onClick={() => setVerifyTarget(null)}>Cancel</button>
              <button className="industry-btn industry-btn--primary" onClick={submitVerify} disabled={saving}>
                {saving ? <Loader2 size={16} className="spinner" /> : <BadgeCheck size={16} />}
                {saving ? 'Verifying…' : 'Verify credentials'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Deactivate confirm */}
      {deactivateTarget && (
        <div className="industry-modal-overlay" role="dialog" aria-modal="true" aria-label="Deactivate student">
          <div className="industry-modal">
            <div className="industry-modal__header">
              <h3 className="industry-modal__title">Deactivate {deactivateTarget.name}?</h3>
              <button className="industry-modal__close" onClick={() => setDeactivateTarget(null)} aria-label="Close"><X size={18} /></button>
            </div>
            <div className="industry-modal__body">
              <p className="industry-modal__desc">
                This is a <strong>soft deactivation</strong>. The student can no longer sign in, but their
                applications, internships, documents and NOCs are preserved. No data is deleted.
              </p>
            </div>
            <div className="industry-modal__footer">
              <button className="industry-btn industry-btn--secondary" onClick={() => setDeactivateTarget(null)}>Cancel</button>
              <button className="industry-btn industry-btn--danger" onClick={confirmDeactivate} disabled={deactivating}>
                {deactivating ? <Loader2 size={16} className="spinner" /> : <UserRoundX size={16} />}
                {deactivating ? 'Deactivating…' : 'Deactivate account'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* NOC modal */}
      {nocTarget && (
        <div className="industry-modal-overlay" role="dialog" aria-modal="true" aria-label="Issue NOC">
          <div className="industry-modal">
            <div className="industry-modal__header">
              <h3 className="industry-modal__title">Issue NOC · {nocTarget.name}</h3>
              <button className="industry-modal__close" onClick={() => setNocTarget(null)} aria-label="Close"><X size={18} /></button>
            </div>
            <div className="industry-modal__body">
              <div className="industry-form">
                <div className="industry-form-group">
                  <label className="industry-form-label" htmlFor="noc-reason">Reason *</label>
                  <select id="noc-reason" className="industry-select" value={nocReason} onChange={(e) => setNocReason(e.target.value)}>
                    {NOC_REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                  {nocErrors.reason && <span className="industry-form-error">{nocErrors.reason}</span>}
                </div>
                <div className="industry-form-row">
                  <div className="industry-form-group">
                    <label className="industry-form-label" htmlFor="noc-date">Issue date</label>
                    <input id="noc-date" className="industry-input" type="date" value={nocIssueDate} onChange={(e) => setNocIssueDate(e.target.value)} />
                    {nocErrors.issueDate && <span className="industry-form-error">{nocErrors.issueDate}</span>}
                  </div>
                  <div className="industry-form-group">
                    <label className="industry-form-label" htmlFor="noc-validity">Validity (optional)</label>
                    <input id="noc-validity" className="industry-input" type="date" value={nocValidity} onChange={(e) => setNocValidity(e.target.value)} />
                    {nocErrors.validity && <span className="industry-form-error">{nocErrors.validity}</span>}
                  </div>
                </div>
                <div className="industry-form-group">
                  <label className="industry-form-label" htmlFor="noc-file">Supporting document (optional)</label>
                  <input id="noc-file" className="industry-input" type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" onChange={(e) => setNocFile(e.target.files[0] || null)} />
                </div>
              </div>
            </div>
            <div className="industry-modal__footer">
              <button className="industry-btn industry-btn--secondary" onClick={() => setNocTarget(null)}>Cancel</button>
              <button className="industry-btn industry-btn--primary" onClick={submitNoc} disabled={saving}>
                {saving ? <Loader2 size={16} className="spinner" /> : <ScrollText size={16} />}
                {saving ? 'Issuing…' : 'Issue NOC'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}