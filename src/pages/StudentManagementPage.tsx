import React from 'react';
import StudentManagement from '../components/StudentManagement';

const StudentManagementPage: React.FC = () => {
  return (
    <div className="main-container mt-6">
      <div className="bg-white p-6 rounded-lg shadow-sm mb-6">
        <h2 className="h2">Manajemen Siswa</h2>
        <p className="mt-2 text-gray-600">Kelola data dan informasi siswa asrama</p>
      </div>
      <StudentManagement />
    </div>
  );
};

export default StudentManagementPage;
