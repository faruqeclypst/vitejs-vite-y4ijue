import React from 'react';
import StudentManagement from '../components/StudentManagement';

const StudentManagementPage: React.FC = () => {
  return (
    <div className="main-container mt-6">
      <div className="flex flex-col space-y-4">
        {/* Header Section */}
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h2 className="h2">Manajemen Siswa</h2>
          <p className="mt-2 text-gray-600">Kelola data dan informasi siswa asrama</p>
        </div>

        {/* Content Section */}
        <div className="bg-white shadow-md rounded-lg p-4">
          <StudentManagement />
        </div>
      </div>
    </div>
  );
};

export default StudentManagementPage;
