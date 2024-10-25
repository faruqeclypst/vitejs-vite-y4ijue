import React from 'react';
import StudentLeaveManagement from '../components/StudentLeaveManagement';

const StudentLeavePage: React.FC = () => {
  return (
    <div className="main-container mt-6">
      <div className="bg-white p-6 rounded-lg shadow-sm mb-6">
        <h2 className="h2">Manajemen Perizinan</h2>
        <p className="mt-2 text-gray-600">Kelola dan pantau data perizinan siswa</p>
      </div>
      <StudentLeaveManagement />
    </div>
  );
};

export default StudentLeavePage;
