import React from 'react';
import ViolationManagement from '../components/ViolationManagement';

const ViolationPage: React.FC = () => {
  return (
    <div className="p-6">
      <div className="flex flex-col gap-4">
        {/* Header */}
        <div className="bg-white p-4 sm:p-6 rounded-lg shadow">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-800 cursor-pointer" onClick={(e) => {
            const target = e.currentTarget.nextElementSibling as HTMLElement;
            if (target) {
              target.classList.toggle('hidden');
              target.classList.toggle('sm:block');
            }
          }}>Pelanggaran Siswa</h2>
          <p className="mt-2 text-sm sm:text-base text-gray-600 hidden sm:block">Kelola data pelanggaran dan tindak lanjut siswa</p>
        </div>

        {/* Content */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-4">
            <ViolationManagement />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ViolationPage;
