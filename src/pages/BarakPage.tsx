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
          }}>Manajemen Barak</h2>
          <p className="mt-2 text-gray-600 hidden sm:block">Kelola data dan informasi barak asrama</p>
        </div>

        {/* Content */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-4">
            <BarakManagement />
          </div>
        </div>
      </div>
    </div>
  );
};

export default BarakPage;
