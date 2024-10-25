import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Users, ClipboardList, Calendar, Home, Menu, X, GraduationCap, FileText, Building, UserCog, LucideIcon } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import ConfirmationModal from './ConfirmationModal';
import useConfirmation from '../hooks/useConfirmation';

interface SidebarProps {
  isExpanded: boolean;
  setIsExpanded: (expanded: boolean) => void;
}

interface NavItem {
  path: string;
  icon: LucideIcon;
  label: string;
  roles: string[];
}

const Sidebar: React.FC<SidebarProps> = ({ isExpanded, setIsExpanded }) => {
  const location = useLocation();
  const { user } = useAuth();
  const { isOpen, options, handleConfirm, handleCancel } = useConfirmation();

  if (!user) return null;

  // Update navItems untuk akses menu yang lebih spesifik
  const navItems: NavItem[] = [
    // Menu Home - Semua role memiliki akses
    { 
      path: '/', 
      icon: Home, 
      label: 'Dashboard', 
      roles: ['admin', 'piket', 'admin_asrama', 'pengasuh'] 
    },

    // Menu Akademik - Hanya untuk admin dan piket
    { 
      path: '/teachers', 
      icon: Users, 
      label: 'Data Guru', 
      roles: ['admin', 'piket'] 
    },
    { 
      path: '/roster', 
      icon: ClipboardList, 
      label: 'Jadwal Guru', 
      roles: ['admin', 'piket'] 
    },
    { 
      path: '/attendance', 
      icon: Calendar, 
      label: 'Absensi Guru', 
      roles: ['admin', 'piket'] 
    },

    // Menu Asrama - Untuk admin_asrama dan pengasuh
    { 
      path: '/barak', 
      icon: Building, 
      label: 'Data Barak', 
      roles: ['admin_asrama'] 
    },
    { 
      path: '/students', 
      icon: GraduationCap, 
      label: 'Data Siswa', 
      roles: ['admin_asrama', 'pengasuh'] 
    },
    { 
      path: '/student-leave', 
      icon: FileText, 
      label: 'Data Perizinan', 
      roles: ['admin_asrama', 'pengasuh'] 
    },

    // Menu Pengaturan - Hanya untuk admin dan admin_asrama
    { 
      path: '/user-management', 
      icon: UserCog, 
      label: 'Manajemen User', 
      roles: ['admin', 'admin_asrama'] 
    }
  ];

  const filteredNavItems = navItems.filter(item => item.roles.includes(user?.role || ''));

  const NavItem: React.FC<{ 
    item: NavItem, 
    onClick?: () => void, 
    isMobile?: boolean 
  }> = ({ item, onClick, isMobile }) => (
    <li>
      <Link
        to={item.path}
        className={`flex items-center ${isExpanded ? 'justify-start' : 'justify-center'} p-3 rounded-lg transition-colors duration-200 ${
          location.pathname === item.path
            ? 'bg-blue-600 text-white'
            : 'text-blue-100 hover:bg-blue-600 hover:text-white'
        }`}
        onClick={onClick}
      >
        <item.icon size={isMobile ? 20 : 24} />
        {isExpanded && !isMobile && <span className="ml-4 font-medium text-base">{item.label}</span>}
      </Link>
    </li>
  );

  const DesktopSidebar = () => (
    <nav className={`bg-blue-700 text-white ${
      isExpanded ? 'w-64' : 'w-20'
    } min-h-screen py-4 px-2 sm:px-4 transition-all duration-300 hidden md:flex flex-col fixed left-0 top-0 bottom-0 z-40`}>
      <div className={`flex ${isExpanded ? 'justify-between' : 'justify-center'} items-center mb-8`}>
        {/* {isExpanded && <h1 className="text-xl font-bold">Piket MOSA</h1>} */}
        <button onClick={() => setIsExpanded(!isExpanded)} className="p-2 rounded-full hover:bg-blue-600">
          {isExpanded ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>
      
      {/* Menu Items */}
      <ul className="space-y-2">
        {filteredNavItems.map((item) => (
          <NavItem key={item.path} item={item} />
        ))}
      </ul>
    </nav>
  );

  const MobileSidebar = () => (
    <nav className="fixed bottom-0 left-0 right-0 bg-blue-700 text-white md:hidden z-50">
      <div className="overflow-x-auto">
        <ul className="flex items-center justify-around py-2 px-4">
          {filteredNavItems.map((item) => (
            <NavItem key={item.path} item={item} isMobile />
          ))}
        </ul>
      </div>
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
