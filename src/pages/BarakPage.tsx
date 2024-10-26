import BarakManagement from '../components/BarakManagement';
import { useAuth } from '../contexts/AuthContext';
import { Navigate } from 'react-router-dom';

const BarakPage = () => {
  const { user } = useAuth();

  // Redirect jika user tidak memiliki akses
  if (!user || !(user.role === 'admin_master' || user.role === 'admin_asrama')) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="main-container mt-6">
      <div className="flex flex-col space-y-4">
        {/* Header Section */}
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h2 className="h2">Manajemen Barak</h2>
          <p className="mt-2 text-gray-600">Kelola data dan informasi barak asrama</p>
        </div>

        {/* Content Section */}
        <div className="bg-white shadow-md rounded-lg p-4">
          <BarakManagement />
        </div>
      </div>
    </div>
  );
};

export default BarakPage;
