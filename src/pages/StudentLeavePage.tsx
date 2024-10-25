import React from 'react';
import StudentLeaveManagement from '../components/StudentLeaveManagement';

const StudentLeavePage: React.FC = () => {
  return (
    <div className="main-container mt-6">
      <div className="flex flex-col space-y-4">
        {/* Header Section */}
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h2 className="h2">Manajemen Perizinan</h2>
          <p className="mt-2 text-gray-600">Kelola dan pantau data perizinan siswa</p>
        </div>

        {/* Content Section */}
        <div className="bg-white shadow-md rounded-lg p-4">
          <StudentLeaveManagement />
        </div>
      </div>
    </div>
  );
};

export default StudentLeavePage;
