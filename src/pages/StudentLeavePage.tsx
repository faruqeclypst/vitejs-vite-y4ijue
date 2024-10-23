import React from 'react';
import StudentLeaveManagement from '../components/StudentLeaveManagement';

const StudentLeavePage: React.FC = () => {
  return (
    <div className="p-2 sm:p-4">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Perizinan Siswa</h1>
      <StudentLeaveManagement />
    </div>
  );
};

export default StudentLeavePage;
