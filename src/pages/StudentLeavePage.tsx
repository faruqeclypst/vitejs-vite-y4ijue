import React from 'react';
import StudentLeaveManagement from '../components/StudentLeaveManagement';

const StudentLeavePage: React.FC = () => {
  return (
    <div className="p-2 sm:p-4">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-2xl font-bold text-gray-800">Perizinan Siswa</h1>
        <p className="mt-2 text-gray-600">Kelola data perizinan siswa</p>
      </div>
      <StudentLeaveManagement />
    </div>
  );
};

export default StudentLeavePage;
