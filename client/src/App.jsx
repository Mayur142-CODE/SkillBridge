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

// ── Other Role Dashboards (minimal shells, unchanged) ─────
import IndustryDashboard     from './pages/dashboards/IndustryDashboard';
import AcademicianDashboard  from './pages/dashboards/AcademicianDashboard';
import InstitutionDashboard  from './pages/dashboards/InstitutionDashboard';
import AdminDashboard        from './pages/dashboards/AdminDashboard';

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
              <IndustryDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/industry/*"
          element={
            <ProtectedRoute allowedRoles={['industry']}>
              <IndustryDashboard />
            </ProtectedRoute>
          }
        />

        {/* ── Academician / Faculty Panel ── */}
        <Route
          path="/academician"
          element={
            <ProtectedRoute allowedRoles={['academician']}>
              <AcademicianDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/academician/*"
          element={
            <ProtectedRoute allowedRoles={['academician']}>
              <AcademicianDashboard />
            </ProtectedRoute>
          }
        />
        {/* Faculty alias */}
        <Route
          path="/faculty"
          element={
            <ProtectedRoute allowedRoles={['academician']}>
              <AcademicianDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/faculty/*"
          element={
            <ProtectedRoute allowedRoles={['academician']}>
              <AcademicianDashboard />
            </ProtectedRoute>
          }
        />

        {/* ── Institution Panel ── */}
        <Route
          path="/institution"
          element={
            <ProtectedRoute allowedRoles={['institution']}>
              <InstitutionDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/institution/*"
          element={
            <ProtectedRoute allowedRoles={['institution']}>
              <InstitutionDashboard />
            </ProtectedRoute>
          }
        />

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
