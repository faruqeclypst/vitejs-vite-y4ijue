import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { TeachersProvider } from './contexts/TeachersContext';
import { RosterProvider } from './contexts/RosterContext';
import { AttendanceProvider } from './contexts/AttendanceContext';
import { StudentProvider } from './contexts/StudentContext';
import { ClassesProvider } from './contexts/ClassesContext';
import Sidebar from './components/Sidebar';
import TeachersPage from './pages/TeachersPage';
import RosterPage from './pages/RosterPage';
import AttendancePage from './pages/AttendancePage';
import StudentManagement from './components/StudentManagement';
import StudentLeaveRequestForm from './components/StudentLeaveRequest';
import LandingPage from './pages/LandingPage';

function App() {
  return (
    <Router>
      <TeachersProvider>
        <RosterProvider>
          <AttendanceProvider>
            <StudentProvider>
              <ClassesProvider>
                <div className="flex flex-col md:flex-row min-h-screen bg-gray-100">
                  <Sidebar />
                  <main className="flex-1 p-4 md:p-8 mb-16 md:mb-0">
                    <div className="container mx-auto">
                      <Routes>
                        <Route path="/" element={<LandingPage />} />
                        <Route path="/teachers" element={<TeachersPage />} />
                        <Route path="/roster" element={<RosterPage />} />
                        <Route path="/attendance" element={<AttendancePage />} />
                        <Route path="/students" element={<StudentManagement />} />
                        <Route path="/leave-request" element={<StudentLeaveRequestForm />} />
                      </Routes>
                    </div>
                  </main>
                </div>
              </ClassesProvider>
            </StudentProvider>
          </AttendanceProvider>
        </RosterProvider>
      </TeachersProvider>
    </Router>
  );
}

export default App;