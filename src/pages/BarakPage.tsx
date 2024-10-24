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
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Manajemen Barak</h1>
      <BarakManagement />
    </div>
  );
};

export default BarakPage;
