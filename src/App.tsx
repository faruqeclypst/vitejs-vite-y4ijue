import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { TeachersProvider } from './contexts/TeachersContext';
import { RosterProvider } from './contexts/RosterContext';
import { AttendanceProvider } from './contexts/AttendanceContext';
import { StudentProvider } from './contexts/StudentContext';
import { AsramaProvider } from './contexts/AsramaContext';
import ProtectedRoute from './components/ProtectedRoute';
import Sidebar from './components/Sidebar';
import LandingPage from './pages/LandingPage';
import TeachersPage from './pages/TeachersPage';
import RosterPage from './pages/RosterPage';
import AttendancePage from './pages/AttendancePage';
import UserManagementPage from './pages/UserManagementPage';
import StudentManagementPage from './pages/StudentManagementPage';
import AsramaPage from './pages/AsramaPage';
import Login from './components/Login';
import StudentLeavePage from './pages/StudentLeavePage';
import { StudentLeaveProvider } from './contexts/StudentLeaveContext';
import { User } from 'lucide-react';

const AppRoutes = () => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <Router>
      <div className="flex flex-col md:flex-row min-h-screen bg-gray-50">
        {user && <Sidebar />}
        <div className="flex-1 flex flex-col min-h-screen">
          {user && (
            <header className="bg-white shadow-sm sticky top-0 z-10">
              <div className="h-14 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-end">
                <div className="flex items-center space-x-2">
                  <User className="h-5 w-5 text-gray-500" />
                  <span className="text-gray-700 font-medium">{user.username}</span>
                </div>
              </div>
            </header>
          )}
          <main className="flex-1 py-6">
            <div className="max-w-full mx-4 sm:mx-6 lg:mx-8">
              <Routes>
                <Route path="/login" element={user ? <Navigate to="/" /> : <Login />} />
                <Route path="/" element={
                  <ProtectedRoute allowedRoles={['admin', 'piket', 'wakil_kepala', 'pengasuh', 'admin_asrama']}>
                    <LandingPage />
                  </ProtectedRoute>
                } />
                <Route path="/teachers" element={<ProtectedRoute allowedRoles={['admin']}><TeachersPage /></ProtectedRoute>} />
                <Route path="/roster" element={<ProtectedRoute allowedRoles={['admin', 'piket']}><RosterPage /></ProtectedRoute>} />
                <Route path="/attendance" element={<ProtectedRoute allowedRoles={['admin', 'piket', 'wakil_kepala']}><AttendancePage /></ProtectedRoute>} />
                <Route path="/user-management" element={<ProtectedRoute allowedRoles={['admin', 'admin_asrama']}><UserManagementPage /></ProtectedRoute>} />
                <Route path="/students" element={<ProtectedRoute allowedRoles={['admin_asrama', 'pengasuh']}><StudentManagementPage /></ProtectedRoute>} />
                <Route path="/asrama" element={<ProtectedRoute allowedRoles={['admin_asrama']}><AsramaPage /></ProtectedRoute>} />
                <Route path="/student-leave" element={
                  <ProtectedRoute allowedRoles={['admin_asrama', 'pengasuh']}>
                    <StudentLeavePage />
                  </ProtectedRoute>
                } />
                <Route path="*" element={<Navigate to="/" />} />
              </Routes>
            </div>
          </main>
          {/* Padding bottom untuk mobile navigation */}
          <div className="h-16 md:hidden"></div>
        </div>
      </div>
    </Router>
  );
};

function App() {
  return (
    <AuthProvider>
      <TeachersProvider>
        <RosterProvider>
          <AttendanceProvider>
            <StudentProvider>
              <AsramaProvider>
                <StudentLeaveProvider>
                  <AppRoutes />
                </StudentLeaveProvider>
              </AsramaProvider>
            </StudentProvider>
          </AttendanceProvider>
        </RosterProvider>
      </TeachersProvider>
    </AuthProvider>
  );
}

export default App;
