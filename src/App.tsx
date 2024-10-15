import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import { TeachersProvider } from './contexts/TeachersContext';
import { RosterProvider } from './contexts/RosterContext';
import { AttendanceProvider } from './contexts/AttendanceContext';
import { StudentProvider } from './contexts/StudentContext';
import { AuthProvider } from './contexts/AuthContext';
import Sidebar from './components/Sidebar';
import TeachersPage from './pages/TeachersPage';
import RosterPage from './pages/RosterPage';
import AttendancePage from './pages/AttendancePage';
import StudentManagement from './components/StudentManagement';
import StudentLeaveRequestForm from './components/StudentLeaveRequest';
import LandingPage from './pages/LandingPage';
import Login from './components/Login';
import ProtectedRoute from './components/ProtectedRoute';
import UserManagement from './components/UserManagement';
import { ref, get } from 'firebase/database';
import { db } from './firebase';

function AppContent() {
  const [isInitialSetup, setIsInitialSetup] = useState<boolean | null>(null);

  useEffect(() => {
    const checkUsers = async () => {
      const usersRef = ref(db, 'users');
      const snapshot = await get(usersRef);
      setIsInitialSetup(!snapshot.exists());
    };
    checkUsers();
  }, []);

  if (isInitialSetup === null) {
    return <div>loading</div>; // Or a more sophisticated loading component
  }

  if (isInitialSetup) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
        <h1 className="text-2xl font-bold mb-4">Initial Setup</h1>
        <p className="mb-4">Please create an admin user to get started:</p>
        <UserManagement onUserAdded={() => setIsInitialSetup(false)} />
      </div>
    );
  }

  return (
    <Router>
      <TeachersProvider>
        <RosterProvider>
          <AttendanceProvider>
            <StudentProvider>
                <div className="flex flex-col md:flex-row min-h-screen bg-gray-100">
                  <Sidebar />
                  <main className="flex-1 p-4 md:p-8 mb-16 md:mb-0">
                    <div className="container mx-auto max-w-4xl">
                      <Routes>
                        <Route path="/login" element={<Login />} />
                        <Route path="/" element={
                          <ProtectedRoute allowedRoles={['admin', 'piket', 'wakil_kepala']}>
                            <LandingPage />
                          </ProtectedRoute>
                        } />
                        <Route path="/teachers" element={
                          <ProtectedRoute allowedRoles={['admin']}>
                            <TeachersPage />
                          </ProtectedRoute>
                        } />
                        <Route path="/roster" element={
                          <ProtectedRoute allowedRoles={['admin']}>
                            <RosterPage />
                          </ProtectedRoute>
                        } />
                        <Route path="/attendance" element={
                          <ProtectedRoute allowedRoles={['admin', 'piket', 'wakil_kepala']}>
                            <AttendancePage />
                          </ProtectedRoute>
                        } />
                        <Route path="/students" element={
                          <ProtectedRoute allowedRoles={['admin']}>
                            <StudentManagement />
                          </ProtectedRoute>
                        } />
                        <Route path="/leave-request" element={
                          <ProtectedRoute allowedRoles={['admin', 'piket', 'wakil_kepala']}>
                            <StudentLeaveRequestForm />
                          </ProtectedRoute>
                        } />
                        <Route path="/user-management" element={
                          <ProtectedRoute allowedRoles={['admin']}>
                            <UserManagement />
                          </ProtectedRoute>
                        } />
                        <Route path="*" element={<Navigate to="/" replace />} />
                      </Routes>
                    </div>
                  </main>
                </div>
            </StudentProvider>
          </AttendanceProvider>
        </RosterProvider>
      </TeachersProvider>
    </Router>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;