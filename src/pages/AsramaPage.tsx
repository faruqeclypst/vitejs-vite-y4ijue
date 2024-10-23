import React from 'react';
import AsramaManagement from '../components/AsramaManagement';

const AsramaPage: React.FC = () => {
  return (
    <div className="p-2 sm:p-4">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Manajemen Asrama</h1>
      <AsramaManagement />
    </div>
  );
};

export default AsramaPage;
