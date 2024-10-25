import BarakManagement from '../components/BarakManagement';
import { useAuth } from '../contexts/AuthContext';
import { Navigate } from 'react-router-dom';

const BarakPage = () => {
  const { user } = useAuth();

  // Redirect jika user tidak memiliki akses
  if (!user || !['admin', 'admin_asrama'].includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="main-container mt-6">
      <div className="bg-white p-6 rounded-lg shadow-sm mb-6">
        <h2 className="h2">Manajemen Barak</h2>
        <p className="mt-2 text-gray-600">Kelola data dan informasi barak asrama</p>
      </div>
      <BarakManagement />
    </div>
  );
};

export default BarakPage;
