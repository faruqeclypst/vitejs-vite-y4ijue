import React from 'react';
import StudentManagement from '../components/StudentManagement';

const StudentManagementPage: React.FC = () => {
  return (
    <div className="p-2 sm:p-4">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Manajemen Siswa</h1>
      <StudentManagement />
    </div>
  );
};

export default StudentManagementPage;