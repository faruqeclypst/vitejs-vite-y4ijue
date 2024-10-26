import React from 'react';
import StudentManagement from '../components/StudentManagement';
import { useAuth } from '../contexts/AuthContext';
import { Navigate } from 'react-router-dom';

const StudentManagementPage: React.FC = () => {
  const { user } = useAuth();

  // Redirect jika user tidak memiliki akses
  if (!user || !(user.role === 'admin_master' || user.role === 'admin_asrama' || user.role === 'pengasuh')) {
    return <Navigate to="/" replace />;
  }

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
