import React from 'react';
import UserManagement from '../components/UserManagement';

const UserManagementPage: React.FC = () => {
  return (
    <div className="p-6">
      <div className="flex flex-col gap-4">
        {/* Header */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-2xl font-bold text-gray-800 cursor-pointer" onClick={(e) => {
            const target = e.currentTarget.nextElementSibling as HTMLElement;
            if (target) {
              target.classList.toggle('hidden');
              target.classList.toggle('sm:block');
            }
          }}>Manajemen Pengguna</h2>
          <p className="mt-2 text-gray-600 hidden sm:block">Kelola akun dan hak akses pengguna sistem</p>
        </div>

        {/* Content */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-4">
            <UserManagement />
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserManagementPage;
