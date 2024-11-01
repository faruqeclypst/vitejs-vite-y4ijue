import React from 'react';
import StudentManagement from './StudentManagement';
import { useAuth } from '../contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { TabType } from '../types';

const GraduatedStudent: React.FC = () => {
  const { user } = useAuth();

  if (!user || !(user.role === 'admin_master' || user.role === 'admin_asrama')) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="p-6">
      <div className="flex flex-col gap-4">
        {/* Header */}
        <div className="bg-white p-4 sm:p-6 rounded-lg shadow">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-800">Data Lulusan</h2>
          <p className="mt-2 text-sm sm:text-base text-gray-600">
            Kelola data dan informasi siswa lulusan
          </p>
        </div>

        {/* Content */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-4">
            <StudentManagement initialTab={'graduated' as TabType} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default GraduatedStudent; 