import { Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import StudentRegister from './pages/StudentRegister';
import IndustryRegister from './pages/IndustryRegister';
import FacultyRegister from './pages/FacultyRegister';
import InstitutionRegister from './pages/InstitutionRegister';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';

function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/register/student" element={<StudentRegister />} />
      <Route path="/register/industry" element={<IndustryRegister />} />
      <Route path="/register/faculty" element={<FacultyRegister />} />
      <Route path="/register/institution" element={<InstitutionRegister />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      {/* Future role-based dashboard routes */}
      {/* <Route path="/student/*" element={<StudentDashboard />} /> */}
      {/* <Route path="/industry/*" element={<IndustryDashboard />} /> */}
      {/* <Route path="/faculty/*" element={<FacultyDashboard />} /> */}
      {/* <Route path="/institution/*" element={<InstitutionDashboard />} /> */}
      {/* <Route path="/admin/*" element={<AdminDashboard />} /> */}
    </Routes>
  );
}

export default App;
