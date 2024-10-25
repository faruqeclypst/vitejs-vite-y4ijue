import React from 'react';
import UserManagement from '../components/UserManagement';

const UserManagementPage: React.FC = () => {
  return (
    <div className="p-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col space-y-4">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">
              Manajemen Pengguna
            </h1>
          </div>

          {/* Main Content */}
          <div className="bg-white shadow-md rounded-lg p-4">
            <UserManagement />
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserManagementPage;
