import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/auth/ProtectedRoute';

// Public Pages
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import StudentRegister from './pages/StudentRegister';
import IndustryRegister from './pages/IndustryRegister';
import FacultyRegister from './pages/FacultyRegister';
import InstitutionRegister from './pages/InstitutionRegister';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import PendingVerification from './pages/PendingVerification';

// Role-Based Minimal Dashboard Panels (SIH 26044)
import StudentDashboard from './pages/dashboards/StudentDashboard';
import IndustryDashboard from './pages/dashboards/IndustryDashboard';
import AcademicianDashboard from './pages/dashboards/AcademicianDashboard';
import InstitutionDashboard from './pages/dashboards/InstitutionDashboard';
import AdminDashboard from './pages/dashboards/AdminDashboard';

function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* Public & Landing Routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/register/student" element={<StudentRegister />} />
        <Route path="/register/industry" element={<IndustryRegister />} />
        <Route path="/register/faculty" element={<FacultyRegister />} />
        <Route path="/register/institution" element={<InstitutionRegister />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password/:token" element={<ResetPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/pending-verification" element={<PendingVerification />} />

        {/* Protected Role Dashboards */}
        <Route
          path="/student/*"
          element={
            <ProtectedRoute allowedRoles={['student']}>
              <StudentDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/student"
          element={
            <ProtectedRoute allowedRoles={['student']}>
              <StudentDashboard />
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
        <Route
          path="/industry"
          element={
            <ProtectedRoute allowedRoles={['industry']}>
              <IndustryDashboard />
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
        <Route
          path="/academician"
          element={
            <ProtectedRoute allowedRoles={['academician']}>
              <AcademicianDashboard />
            </ProtectedRoute>
          }
        />
        {/* Faculty route alias to Academician */}
        <Route
          path="/faculty/*"
          element={
            <ProtectedRoute allowedRoles={['academician']}>
              <AcademicianDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/faculty"
          element={
            <ProtectedRoute allowedRoles={['academician']}>
              <AcademicianDashboard />
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
        <Route
          path="/institution"
          element={
            <ProtectedRoute allowedRoles={['institution']}>
              <InstitutionDashboard />
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
        <Route
          path="/admin"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />

        {/* Catch-all unknown routes */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}

export default App;
