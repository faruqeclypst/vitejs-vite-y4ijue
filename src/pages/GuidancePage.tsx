import React from 'react';
import GuidanceManagement from '../components/GuidanceManagement';

const GuidancePage: React.FC = () => {
  return (
    <div className="main-container mt-6">
      <div className="flex flex-col space-y-4">
        {/* Header Section */}
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h2 className="h2">Pembinaan Siswa</h2>
          <p className="mt-2 text-gray-600">Kelola data pembinaan dan tindak lanjut pelanggaran siswa</p>
        </div>

        {/* Content Section */}
        <div className="bg-white shadow-md rounded-lg p-4">
          <GuidanceManagement />
        </div>
      </div>
    </div>
  );
};

export default GuidancePage;
