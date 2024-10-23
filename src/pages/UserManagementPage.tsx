import React from 'react';
import UserManagement from '../components/UserManagement';

const UserManagementPage: React.FC = () => {
  return (
    <div className="p-2 sm:p-4">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Manajemen Pengguna</h1>
      <UserManagement />
    </div>
  );
};

export default UserManagementPage;
