import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Users, ClipboardList, Calendar, LogOut, UserCog, Home, Menu, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import ConfirmationModal from './ConfirmationModal';
import useConfirmation from '../hooks/useConfirmation';

const Sidebar: React.FC = () => {
  const location = useLocation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { confirm, isOpen, options, handleConfirm, handleCancel } = useConfirmation();
  const [isExpanded, setIsExpanded] = useState(false);

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
    { path: '/roster', icon: ClipboardList, label: 'Roster', roles: ['admin', 'piket'] },
    { path: '/attendance', icon: Calendar, label: 'Absen', roles: ['admin', 'piket', 'wakil_kepala'] },
    { path: '/user-management', icon: UserCog, label: 'User', roles: ['admin'] },
  ];

  const filteredNavItems = navItems.filter(item => item.roles.includes(user.role));

  const NavItem: React.FC<{ item: typeof navItems[0], onClick?: () => void, isMobile?: boolean }> = ({ item, onClick, isMobile }) => (
    <li>
      <Link
        to={item.path}
        className={`flex items-center justify-center p-2 rounded-lg transition-colors duration-200 ${
          location.pathname === item.path
            ? 'bg-blue-600 text-white'
            : 'text-blue-100 hover:bg-blue-600 hover:text-white'
        }`}
        onClick={onClick}
      >
        <item.icon size={isMobile ? 20 : 24} />
      </Link>
    </li>
  );

  const DesktopSidebar = () => (
    <nav className={`bg-blue-700 text-white ${isExpanded ? 'w-64' : 'w-20'} min-h-screen p-4 transition-all duration-300 hidden md:block`}>
      <div className={`flex ${isExpanded ? 'justify-between' : 'justify-center'} items-center mb-8`}>
        {isExpanded && <h1 className="text-2xl font-bold">Piket MOSA</h1>}
        <button onClick={() => setIsExpanded(!isExpanded)} className="p-2 rounded-full hover:bg-blue-600">
          {isExpanded ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>
      <ul className="space-y-2">
        {filteredNavItems.map((item) => (
          <li key={item.path}>
            <Link
              to={item.path}
              className={`flex items-center ${isExpanded ? 'justify-start' : 'justify-center'} p-2 rounded-lg transition-colors duration-200 ${
                location.pathname === item.path
                  ? 'bg-blue-600 text-white'
                  : 'text-blue-100 hover:bg-blue-600 hover:text-white'
              }`}
            >
              <item.icon size={24} />
              {isExpanded && <span className="ml-3 font-bold">{item.label}</span>}
            </Link>
          </li>
        ))}
        <li>
          <button
            onClick={handleLogout}
            className={`flex items-center ${isExpanded ? 'justify-start' : 'justify-center'} p-2 rounded-lg text-blue-100 hover:bg-blue-600 hover:text-white transition-colors duration-200 w-full`}
          >
            <LogOut size={24} />
            {isExpanded && <span className="ml-3 font-bold">Logout</span>}
          </button>
        </li>
      </ul>
    </nav>
  );

  const MobileSidebar = () => (
    <nav className="fixed bottom-0 left-0 right-0 bg-blue-700 text-white md:hidden z-50">
      <ul className="flex justify-around py-2 px-4">
        {filteredNavItems.map((item) => (
          <NavItem key={item.path} item={item} isMobile />
        ))}
        <li>
          <button
            onClick={handleLogout}
            className="flex items-center justify-center p-2 rounded-lg text-blue-100 hover:bg-blue-600 hover:text-white transition-colors duration-200"
          >
            <LogOut size={20} />
          </button>
        </li>
      </ul>
    </nav>
  );

  return (
    <>
      <DesktopSidebar />
      <MobileSidebar />
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
