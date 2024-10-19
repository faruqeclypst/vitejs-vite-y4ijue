import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Users, ClipboardList, Calendar, LogOut, UserCog, Home } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import ConfirmationModal from './ConfirmationModal';
import useConfirmation from '../hooks/useConfirmation';

const Sidebar: React.FC = () => {
  const location = useLocation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { confirm, isOpen, options, handleConfirm, handleCancel } = useConfirmation();

  const handleLogout = async () => {
    const confirmed = await confirm({
      title: 'Konfirmasi Logout',
      message: 'Apakah Anda yakin ingin keluar?',
      confirmText: 'Ya, Keluar',
      cancelText: 'Batal'
    });

    if (confirmed) {
      logout();
      navigate('/login');
    }
  };

  if (!user) return null;

  const navItems = [
    { path: '/', icon: Home, label: 'Home', roles: ['admin', 'piket', 'wakil_kepala'] },
    { path: '/teachers', icon: Users, label: 'Guru', roles: ['admin'] },
    { path: '/roster', icon: ClipboardList, label: 'Roster', roles: ['admin'] },
    { path: '/attendance', icon: Calendar, label: 'Absen', roles: ['admin', 'piket', 'wakil_kepala'] },
    { path: '/user-management', icon: UserCog, label: 'User', roles: ['admin'] },
  ];

  const filteredNavItems = navItems.filter(item => item.roles.includes(user.role));

  const NavItem: React.FC<{ item: typeof navItems[0], isMobile?: boolean }> = ({ item, isMobile }) => (
    <li>
      <Link
        to={item.path}
        className={`flex ${isMobile ? 'flex-col' : ''} items-center p-2 rounded transition-colors duration-200 ${
          location.pathname === item.path
            ? 'bg-blue-700 text-white'
            : 'text-blue-100 hover:bg-blue-700 hover:text-white'
        } ${isMobile ? 'justify-center' : ''}`}
      >
        <item.icon className={isMobile ? 'mb-1' : 'mr-3'} size={isMobile ? 24 : 20} />
        <span className={isMobile ? 'text-xs' : ''}>{item.label}</span>
      </Link>
    </li>
  );

  return (
    <>
      <nav className="bg-blue-600 text-white w-64 min-h-screen p-4 hidden md:block">
        <h1 className="text-2xl font-bold mb-8">Piket MOSA</h1>
        <ul className="space-y-2">
          {filteredNavItems.map((item) => (
            <NavItem key={item.path} item={item} />
          ))}
          <li>
            <button
              onClick={handleLogout}
              className="flex items-center p-2 rounded text-blue-100 hover:bg-blue-700 hover:text-white transition-colors duration-200 w-full"
            >
              <LogOut className="mr-3" size={20} />
              Logout
            </button>
          </li>
        </ul>
      </nav>
      <nav className="fixed bottom-0 left-0 right-0 bg-blue-600 border-t border-blue-700 md:hidden">
        <ul className="flex justify-around">
          {filteredNavItems.map((item) => (
            <NavItem key={item.path} item={item} isMobile />
          ))}
          <li>
            <button
              onClick={handleLogout}
              className="flex flex-col items-center justify-center p-2 text-blue-100 hover:text-white transition-colors duration-200"
            >
              <LogOut size={24} />
              <span className="text-xs mt-1">Logout</span>
            </button>
          </li>
        </ul>
      </nav>
      <ConfirmationModal
        isOpen={isOpen}
        onClose={handleCancel}
        onConfirm={handleConfirm}
        title={options?.title || ''}
        message={options?.message || ''}
        confirmText={options?.confirmText}
        cancelText={options?.cancelText}
      />
    </>
  );
};

export default Sidebar;