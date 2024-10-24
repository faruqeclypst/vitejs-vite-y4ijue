import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { TeachersProvider } from './contexts/TeachersContext';
import { RosterProvider } from './contexts/RosterContext';
import { AttendanceProvider } from './contexts/AttendanceContext';
import { StudentProvider } from './contexts/StudentContext';
import { StudentLeaveProvider } from './contexts/StudentLeaveContext';
import ProtectedRoute from './components/ProtectedRoute';
import Sidebar from './components/Sidebar';
import LandingPage from './pages/LandingPage';
import TeachersPage from './pages/TeachersPage';
import RosterPage from './pages/RosterPage';
import AttendancePage from './pages/AttendancePage';
import UserManagementPage from './pages/UserManagementPage';
import StudentManagementPage from './pages/StudentManagementPage';
import Login from './components/Login';
import Header from './components/Header';
import { useState } from 'react';
import BarakPage from './pages/BarakPage';
import StudentLeavePage from './pages/StudentLeavePage';
import { BarakProvider } from './contexts/BarakContext';

const AppRoutes = () => {
  const { user, isLoading } = useAuth();
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <Router>
      <div className="flex min-h-screen bg-gray-50">
        {user && <Sidebar isExpanded={isSidebarExpanded} setIsExpanded={setIsSidebarExpanded} />}
        {/* Update margin left berdasarkan status sidebar */}
        <div className={`flex-1 flex flex-col transition-all duration-300 ${
          user ? (isSidebarExpanded ? 'md:ml-80' : 'md:ml-24') : ''
        }`}>
          {user && <Header />}
          <main className="flex-1 p-2 sm:p-4 lg:p-6">
            <div className="w-full max-w-[2000px] mx-auto">
              <Routes>
                <Route 
                  path="/login" 
                  element={user ? <Navigate to="/" /> : <Login />} 
                />
                <Route 
                  path="/" 
                  element={
                    <ProtectedRoute allowedRoles={['admin', 'piket', 'wakil_kepala', 'pengasuh', 'admin_asrama']}>
                      <LandingPage />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/teachers" 
                  element={
                    <ProtectedRoute allowedRoles={['admin']}>
                      <TeachersPage />
                    </ProtectedRoute>
                  } 
                />
                <Route path="/roster" element={<ProtectedRoute allowedRoles={['admin', 'piket']}><RosterPage /></ProtectedRoute>} />
                <Route path="/attendance" element={<ProtectedRoute allowedRoles={['admin', 'piket', 'wakil_kepala']}><AttendancePage /></ProtectedRoute>} />
                <Route path="/user-management" element={<ProtectedRoute allowedRoles={['admin', 'admin_asrama']}><UserManagementPage /></ProtectedRoute>} />
                <Route path="/students" element={<ProtectedRoute allowedRoles={['admin_asrama', 'pengasuh']}><StudentManagementPage /></ProtectedRoute>} />
                <Route path="/student-leave" element={
                  <ProtectedRoute allowedRoles={['admin_asrama', 'pengasuh']}>
                    <StudentLeavePage />
                  </ProtectedRoute>
                } />
                <Route 
                  path="/barak" 
                  element={
                    <ProtectedRoute allowedRoles={['admin', 'admin_asrama']}>
                      <BarakPage />
                    </ProtectedRoute>
                  } 
                />
                <Route path="*" element={<Navigate to="/" />} />
              </Routes>
            </div>
          </main>
          <div className="h-16 md:hidden" />
        </div>
      </div>
    </Router>
  );
};

const App = () => (
  <AuthProvider>
    <TeachersProvider>
      <RosterProvider>
        <AttendanceProvider>
          <StudentProvider>
            <BarakProvider>
              <StudentLeaveProvider>
                <AppRoutes />
              </StudentLeaveProvider>
            </BarakProvider>
          </StudentProvider>
        </AttendanceProvider>
      </RosterProvider>
    </TeachersProvider>
  </AuthProvider>
);

export default App;
