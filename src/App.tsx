import { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { TeachersProvider } from './contexts/TeachersContext';
import { RosterProvider } from './contexts/RosterContext';
import { AttendanceProvider } from './contexts/AttendanceContext';
import { StudentProvider } from './contexts/StudentContext';
import { StudentLeaveProvider } from './contexts/StudentLeaveContext';
import ProtectedRoute from './components/ProtectedRoute';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import { useState } from 'react';
import { BarakProvider } from './contexts/BarakContext';
import { ViolationProvider } from './contexts/ViolationContext';
import { GuidanceProvider } from './contexts/GuidanceContext';

// Lazy load pages
const Login = lazy(() => import('./components/Login'));
const LandingPage = lazy(() => import('./pages/LandingPage'));
const TeachersPage = lazy(() => import('./pages/TeachersPage' /* webpackChunkName: "teachers" */));
const RosterPage = lazy(() => import('./pages/RosterPage'));
const AttendancePage = lazy(() => import('./pages/AttendancePage'));
const UserManagementPage = lazy(() => import('./pages/UserManagementPage'));
const StudentManagementPage = lazy(() => import('./pages/StudentManagementPage'));
const BarakPage = lazy(() => import('./pages/BarakPage'));
const StudentLeavePage = lazy(() => import('./pages/StudentLeavePage'));
const ViolationPage = lazy(() => import('./pages/ViolationPage'));
const GuidancePage = lazy(() => import('./pages/GuidancePage'));

// Loading component
const LoadingSpinner = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
  </div>
);

const AppRoutes = () => {
  const { user, isLoading } = useAuth();
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <Router>
      <div className={`min-h-screen ${!user ? 'h-screen overflow-hidden' : 'flex bg-gray-50'}`}>
        {user && <Sidebar isExpanded={isSidebarExpanded} setIsExpanded={setIsSidebarExpanded} />}
        <div className={`flex-1 flex flex-col transition-all duration-300 ${
          user ? (isSidebarExpanded ? 'md:ml-64' : 'md:ml-20') : ''
        }`}>
          {user && <Header />}
          <main className={`flex-1 ${!user ? 'h-full' : ''}`}>
            <Suspense fallback={<LoadingSpinner />}>
              <Routes>
                <Route 
                  path="/login" 
                  element={user ? <Navigate to="/" /> : <Login />} 
                />
                <Route 
                  path="/" 
                  element={
                    <ProtectedRoute allowedRoles={['admin_master', 'admin', 'piket', 'wakil_kepala', 'pengasuh', 'admin_asrama']}>
                      <LandingPage />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/teachers" 
                  element={
                    <ProtectedRoute allowedRoles={['admin_master', 'admin']}>
                      <TeachersPage />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/roster" 
                  element={
                    <ProtectedRoute allowedRoles={['admin_master', 'admin', 'piket']}>
                      <RosterPage />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/attendance" 
                  element={
                    <ProtectedRoute allowedRoles={['admin_master', 'admin', 'piket', 'wakil_kepala']}>
                      <AttendancePage />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/user-management" 
                  element={
                    <ProtectedRoute allowedRoles={['admin_master', 'admin', 'admin_asrama']}>
                      <UserManagementPage />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/barak" 
                  element={
                    <ProtectedRoute allowedRoles={['admin_master', 'admin_asrama']}>
                      <BarakPage />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/students" 
                  element={
                    <ProtectedRoute allowedRoles={['admin_master', 'admin_asrama', 'pengasuh']}>
                      <StudentManagementPage />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/student-leave" 
                  element={
                    <ProtectedRoute allowedRoles={['admin_master', 'admin_asrama', 'pengasuh']}>
                      <StudentLeavePage />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/violations" 
                  element={
                    <ProtectedRoute allowedRoles={['admin_master', 'admin', 'admin_asrama', 'pengasuh']}>
                      <ViolationPage />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/guidance" 
                  element={
                    <ProtectedRoute allowedRoles={['admin_master', 'admin', 'admin_asrama', 'pengasuh']}>
                      <GuidancePage />
                    </ProtectedRoute>
                  } 
                />
                <Route path="*" element={<Navigate to="/" />} />
              </Routes>
            </Suspense>
          </main>
          <div className="h-20 md:hidden" />
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
                <ViolationProvider>
                  <GuidanceProvider>
                    <AppRoutes />
                  </GuidanceProvider>
                </ViolationProvider>
              </StudentLeaveProvider>
            </BarakProvider>
          </StudentProvider>
        </AttendanceProvider>
      </RosterProvider>
    </TeachersProvider>
  </AuthProvider>
);

export default App;
