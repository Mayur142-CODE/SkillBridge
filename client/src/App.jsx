import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/auth/ProtectedRoute';

// ── Public Pages ─────────────────────────────────────────
import LandingPage           from './pages/LandingPage';
import LoginPage             from './pages/LoginPage';
import RegisterPage          from './pages/RegisterPage';
import StudentRegister       from './pages/StudentRegister';
import IndustryRegister      from './pages/IndustryRegister';
import FacultyRegister       from './pages/FacultyRegister';
import InstitutionRegister   from './pages/InstitutionRegister';
import ForgotPassword        from './pages/ForgotPassword';
import ResetPassword         from './pages/ResetPassword';
import PendingVerification   from './pages/PendingVerification';

// ── Student Panel ─────────────────────────────────────────
import StudentLayout         from './components/student/StudentLayout';
import StudentDashboardPage  from './pages/student/StudentDashboardPage';
import StudentProfilePage    from './pages/student/StudentProfilePage';
import PublicPortfolioPage   from './pages/PublicPortfolioPage';
import StudentComingSoonPage from './pages/student/StudentComingSoonPage';
import StudentAssessmentPage from './pages/student/StudentAssessmentPage';
import AssessmentTakingPage  from './pages/student/AssessmentTakingPage';
import AssessmentResultPage  from './pages/student/AssessmentResultPage';
import StudentRecommendationsPage from './pages/student/StudentRecommendationsPage';
import StudentLearningHubPage from './pages/student/StudentLearningHubPage';
import ProgramDetailPage     from './pages/student/ProgramDetailPage';
import MyLearningPage        from './pages/student/MyLearningPage';
import LearningPlayerPage    from './pages/student/LearningPlayerPage';
import MentorsPage           from './pages/student/MentorsPage';
import PublicCertificatePage from './pages/PublicCertificatePage';
import StudentOpportunitiesPage from './pages/student/StudentOpportunitiesPage';
import OpportunityDetailPage from './pages/student/OpportunityDetailPage';
import StudentApplicationsPage from './pages/student/StudentApplicationsPage';
import ApplicationDetailPage from './pages/student/ApplicationDetailPage';
import StudentNotificationsPage from './pages/student/StudentNotificationsPage';

import IndustryLayout        from './components/industry/IndustryLayout';
import IndustryDashboardPage from './pages/industry/IndustryDashboardPage';
import IndustryProfilePage   from './pages/industry/IndustryProfilePage';
import IndustryOpportunitiesPage from './pages/industry/IndustryOpportunitiesPage';
import IndustryOpportunityFormPage from './pages/industry/IndustryOpportunityFormPage';
import IndustryOpportunityDetailPage from './pages/industry/IndustryOpportunityDetailPage';
import IndustryApplicationsPage from './pages/industry/IndustryApplicationsPage';
import IndustryApplicationDetailPage from './pages/industry/IndustryApplicationDetailPage';
import IndustryCollaborationsPage from './pages/industry/IndustryCollaborationsPage';
import IndustryCollaborationDetailPage from './pages/industry/IndustryCollaborationDetailPage';
import IndustryCollaborationApplicationPage from './pages/industry/IndustryCollaborationApplicationPage';
import IndustryCandidatesPage from './pages/industry/IndustryCandidatesPage';
import IndustryCandidateDetailPage from './pages/industry/IndustryCandidateDetailPage';

// ── Institution Panel ──────────────────────────────────
import InstitutionLayout       from './components/institution/InstitutionLayout';
import InstitutionDashboardPage from './pages/institution/InstitutionDashboardPage';
import InstitutionProfilePage  from './pages/institution/InstitutionProfilePage';
import InstitutionStudentsPage from './pages/institution/InstitutionStudentsPage';
import InstitutionFacultyGovernancePage from './pages/institution/InstitutionFacultyGovernancePage';
import InstitutionPlacementsPage from './pages/institution/InstitutionPlacementsPage';
import InstitutionMousPage from './pages/institution/InstitutionMousPage';
import AcademicianDashboard  from './pages/dashboards/AcademicianDashboard';
import AdminDashboard        from './pages/dashboards/AdminDashboard';

// ── Academician / Faculty Panel ─────────────────────────
import FacultyLayout         from './components/faculty/FacultyLayout';
import FacultyDashboardPage  from './pages/faculty/FacultyDashboardPage';
import FacultyProfilePage    from './pages/faculty/FacultyProfilePage';
import FacultyOpportunitiesPage from './pages/faculty/FacultyOpportunitiesPage';
import FacultyOpportunityDetailPage from './pages/faculty/FacultyOpportunityDetailPage';
import FacultyMentorshipPage from './pages/faculty/FacultyMentorshipPage';
import FacultyCollaborationsPage from './pages/faculty/FacultyCollaborationsPage';
import FacultyCollaborationDetailPage from './pages/faculty/FacultyCollaborationDetailPage';
import FacultyApplicationsPage from './pages/faculty/FacultyApplicationsPage';
import FacultyApplicationDetailPage from './pages/faculty/FacultyApplicationDetailPage';
import FacultyNotificationsPage from './pages/faculty/FacultyNotificationsPage';
import FacultyComingSoonPage from './pages/faculty/FacultyComingSoonPage';

function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* ── Public Routes ── */}
        <Route path="/"                         element={<LandingPage />} />
        <Route path="/login"                    element={<LoginPage />} />
        <Route path="/register"                 element={<RegisterPage />} />
        <Route path="/register/student"         element={<StudentRegister />} />
        <Route path="/register/industry"        element={<IndustryRegister />} />
        <Route path="/register/faculty"         element={<FacultyRegister />} />
        <Route path="/register/institution"     element={<InstitutionRegister />} />
        <Route path="/forgot-password"          element={<ForgotPassword />} />
        <Route path="/reset-password/:token"    element={<ResetPassword />} />
        <Route path="/reset-password"           element={<ResetPassword />} />
        <Route path="/pending-verification"     element={<PendingVerification />} />
        <Route path="/portfolio/:slug"          element={<PublicPortfolioPage />} />
        <Route path="/certificate/verify/:verificationCode" element={<PublicCertificatePage />} />

        {/* ── Student Panel — nested routes inside StudentLayout ──
            ProtectedRoute checks auth + role; StudentLayout renders <Outlet />.
            New modules are added here as phases are completed.
        ── */}
        <Route
          path="/student"
          element={
            <ProtectedRoute allowedRoles={['student']}>
              <StudentLayout />
            </ProtectedRoute>
          }
        >
          {/* Phase 1 — Dashboard */}
          <Route index                  element={<StudentDashboardPage />} />

          {/* Phase 2 — Profile & Portfolio */}
          <Route path="profile"         element={<StudentProfilePage />} />

          {/* Phase 3 — Skill Assessment & Skill Engine */}
          <Route path="assessment"                   element={<StudentAssessmentPage />} />
          <Route path="assessment/:assessmentId"     element={<AssessmentTakingPage />} />
          <Route path="assessment/result/:attemptId" element={<AssessmentResultPage />} />
          <Route path="skills"                       element={<StudentAssessmentPage />} />

          {/* Phase 4 — Skill Mapping & Personalized Recommendations */}
          <Route path="recommendations"              element={<StudentRecommendationsPage />} />
          <Route path="skill-mapping"                 element={<StudentRecommendationsPage />} />

          {/* Phase 5 — Learning Hub & Certifications */}
          <Route path="learning"                                element={<StudentLearningHubPage />} />
          <Route path="learning/program/:id"                    element={<ProgramDetailPage />} />
          <Route path="learning/my-learning"                    element={<MyLearningPage />} />
          <Route path="learning/my-learning/:enrollmentId"      element={<LearningPlayerPage />} />
          <Route path="learning/mentors"                        element={<MentorsPage />} />
          <Route path="learning/mentorship"                     element={<MentorsPage />} />

          {/* Phase 6 — Internships & Placements */}
          <Route path="opportunities"                   element={<StudentOpportunitiesPage />} />
          <Route path="opportunities/:id"               element={<OpportunityDetailPage />} />
          <Route path="internships"                     element={<StudentOpportunitiesPage />} />
          <Route path="internships/:id"                 element={<OpportunityDetailPage />} />

          {/* Phase 6 — My Applications */}
          <Route path="applications"                    element={<StudentApplicationsPage />} />
          <Route path="applications/:id"                element={<ApplicationDetailPage />} />

          {/* Phase 2/Vault — Document Vault */}
          <Route path="documents" element={<StudentProfilePage initialTab="resume" />} />

          {/* Notifications */}
          <Route path="notifications"                   element={<StudentNotificationsPage />} />

          {/* Fallback: unknown child paths redirect to dashboard */}
          <Route path="*" element={<Navigate to="/student" replace />} />
        </Route>

        {/* ── Industry Panel ── */}
        <Route
          path="/industry"
          element={
            <ProtectedRoute allowedRoles={['industry']}>
              <IndustryLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<IndustryDashboardPage />} />
          <Route path="dashboard" element={<Navigate to="/industry" replace />} />
          <Route path="profile" element={<IndustryProfilePage />} />
          <Route path="opportunities" element={<IndustryOpportunitiesPage />} />
          <Route path="opportunities/new" element={<IndustryOpportunityFormPage />} />
          <Route path="opportunities/:id" element={<IndustryOpportunityDetailPage />} />
          <Route path="opportunities/:id/edit" element={<IndustryOpportunityFormPage />} />
          <Route path="applications" element={<IndustryApplicationsPage />} />
          <Route path="applications/:id" element={<IndustryApplicationDetailPage />} />
          <Route path="collaborations" element={<IndustryCollaborationsPage />} />
          <Route path="collaborations/applications/:id" element={<IndustryCollaborationApplicationPage />} />
          <Route path="collaborations/:id" element={<IndustryCollaborationDetailPage />} />
          <Route path="candidates" element={<IndustryCandidatesPage />} />
          <Route path="candidates/:studentId" element={<IndustryCandidateDetailPage />} />
          <Route path="*" element={<IndustryDashboardPage />} />
        </Route>

        {/* ── Academician / Faculty Panel ── */}
        <Route
          path="/faculty"
          element={
            <ProtectedRoute allowedRoles={['academician']}>
              <FacultyLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<FacultyDashboardPage />} />
          <Route path="dashboard" element={<Navigate to="/faculty" replace />} />
          <Route path="profile" element={<FacultyProfilePage />} />
          <Route path="opportunities" element={<FacultyOpportunitiesPage />} />
          <Route path="opportunities/:id" element={<FacultyOpportunityDetailPage />} />
          <Route path="collaborations" element={<FacultyCollaborationsPage />} />
          <Route path="collaborations/:id" element={<FacultyCollaborationDetailPage />} />
          <Route path="mentorship" element={<FacultyMentorshipPage />} />
          <Route path="applications" element={<FacultyApplicationsPage />} />
          <Route path="applications/:id" element={<FacultyApplicationDetailPage />} />
          <Route path="notifications" element={<FacultyNotificationsPage />} />
          <Route path="*" element={<Navigate to="/faculty" replace />} />
        </Route>

        {/* Backward compatibility: redirect /academician routes to /faculty */}
        <Route path="/academician" element={<Navigate to="/faculty" replace />} />
        <Route path="/academician/*" element={<Navigate to="/faculty" replace />} />

        {/* ── Institution Panel ──
            ProtectedRoute checks auth + role; InstitutionLayout renders <Outlet />.
            Phases 2–6 nav destinations point to honest placeholders until built.
        ── */}
        <Route
          path="/institution"
          element={
            <ProtectedRoute allowedRoles={['institution']}>
              <InstitutionLayout />
            </ProtectedRoute>
          }
        >
          {/* Phase 1 — Dashboard */}
          <Route index element={<InstitutionDashboardPage />} />
          <Route path="dashboard" element={<Navigate to="/institution" replace />} />

          {/* Phase 2 — Institutional Profile & Accreditation */}
          <Route path="profile" element={<InstitutionProfilePage />} />

          {/* Phase 3 — Student Roster & Verification */}
          <Route path="students" element={<InstitutionStudentsPage />} />

          {/* Phase 4 — Faculty Governance */}
          <Route path="faculty-governance" element={<InstitutionFacultyGovernancePage />} />

          {/* Phase 5 — Placement & Training (TPO) Oversight */}
          <Route path="placements" element={<InstitutionPlacementsPage />} />

          {/* Phase 6 — Institutional MoUs */}
          <Route path="mous" element={<InstitutionMousPage />} />

          {/* Fallback: unknown child paths redirect to dashboard */}
          <Route path="*" element={<Navigate to="/institution" replace />} />
        </Route>

        {/* ── Admin Panel ── */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/*"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />

        {/* ── Catch-all ── */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}

export default App;
