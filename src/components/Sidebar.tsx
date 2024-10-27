import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Users, ClipboardList, Calendar, Home, Menu, X, GraduationCap, FileText, Building, UserCog, LucideIcon, AlertTriangle, Megaphone } from 'lucide-react';
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
  const navigate = useNavigate();

  if (!user) return null;

  // Update navItems untuk admin_master
  const navItems: NavItem[] = [
    // Menu Home - Semua role memiliki akses
    { 
      path: '/', 
      icon: Home, 
      label: 'Dashboard', 
      roles: ['admin_master', 'admin', 'piket', 'admin_asrama', 'pengasuh', 'wakil_kepala'] 
    },

    // Menu Akademik
    { 
      path: '/teachers', 
      icon: Users, 
      label: 'Data Guru', 
      roles: ['admin_master', 'admin'] 
    },
    { 
      path: '/roster', 
      icon: ClipboardList, 
      label: 'Jadwal Guru', 
      roles: ['admin_master', 'admin', 'piket'] 
    },
    { 
      path: '/attendance', 
      icon: Calendar, 
      label: 'Absensi Guru', 
      roles: ['admin_master', 'admin', 'piket', 'wakil_kepala'] 
    },

    // Menu Asrama
    { 
      path: '/barak', 
      icon: Building, 
      label: 'Data Barak', 
      roles: ['admin_master', 'admin_asrama'] 
    },
    { 
      path: '/students', 
      icon: GraduationCap, 
      label: 'Data Siswa', 
      roles: ['admin_master', 'admin_asrama', 'pengasuh'] 
    },
    { 
      path: '/student-leave', 
      icon: FileText, 
      label: 'Data Perizinan', 
      roles: ['admin_master', 'admin_asrama', 'pengasuh'] 
    },

    // Menu Pengaturan
    { 
      path: '/user-management', 
      icon: UserCog, 
      label: 'Manajemen User', 
      roles: ['admin_master', 'admin', 'admin_asrama'] 
    },

    // Menu Pelanggaran dan Pembinaan
    { 
      path: '/violations', 
      icon: AlertTriangle, 
      label: 'Pelanggaran', 
      roles: ['admin_master', 'admin', 'admin_asrama', 'pengasuh'] 
    },
    { 
      path: '/guidance', 
      icon: Megaphone, 
      label: 'Pembinaan', 
      roles: ['admin_master', 'admin', 'admin_asrama', 'pengasuh'] 
    },
  ];

  // Update fungsi filter menu untuk admin_master
  const filteredNavItems = navItems.filter(item => {
    if (user?.role === 'admin_master') {
      return true; // Tampilkan semua menu untuk admin_master
    }
    return item.roles.includes(user?.role || '');
  });

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

  const MobileSidebar = () => {
    const [touchStart, setTouchStart] = useState<number | null>(null);
    const [touchEnd, setTouchEnd] = useState<number | null>(null);
    const [currentIndex, setCurrentIndex] = useState(0);

    // Update currentIndex ketika location berubah
    useEffect(() => {
      const pathIndex = filteredNavItems.findIndex(item => item.path === location.pathname);
      if (pathIndex !== -1) {
        setCurrentIndex(pathIndex);
      }
    }, [location.pathname, filteredNavItems]); // tambahkan filteredNavItems ke dependency

    const minSwipeDistance = 50;

    const onTouchStart = (e: React.TouchEvent) => {
      setTouchEnd(null); // reset touchEnd
      setTouchStart(e.targetTouches[0].clientX);
    };

    const onTouchMove = (e: React.TouchEvent) => {
      setTouchEnd(e.targetTouches[0].clientX);
    };

    const onTouchEnd = () => {
      if (!touchStart || !touchEnd) return;
      
      const distance = touchStart - touchEnd;
      const isLeftSwipe = distance > minSwipeDistance;
      const isRightSwipe = distance < -minSwipeDistance;
      
      const accessiblePaths = filteredNavItems.map(item => item.path);
      const currentPathIndex = accessiblePaths.indexOf(location.pathname);
      
      if (isLeftSwipe && currentPathIndex < accessiblePaths.length - 1) {
        // Swipe kiri (next)
        navigate(accessiblePaths[currentPathIndex + 1]);
        if (window.navigator && window.navigator.vibrate) {
          window.navigator.vibrate(50);
        }
      } else if (isRightSwipe && currentPathIndex > 0) {
        // Swipe kanan (previous)
        navigate(accessiblePaths[currentPathIndex - 1]);
        if (window.navigator && window.navigator.vibrate) {
          window.navigator.vibrate(50);
        }
      }

      // Reset touch states
      setTouchStart(null);
      setTouchEnd(null);
    };

    return (
      <nav 
        className="fixed bottom-0 left-0 right-0 bg-blue-700 text-white md:hidden z-50 touch-pan-x"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {/* Swipe Indicator di atas */}
        <div className="absolute -top-1 left-0 right-0 flex justify-center space-x-1 py-1">
          {filteredNavItems.map((_, index) => (
            <div
              key={index}
              className={`h-1 rounded-full transition-all duration-300 ${
                index === currentIndex 
                  ? 'w-4 bg-white' 
                  : 'w-1 bg-blue-300'
              }`}
            />
          ))}
        </div>

        {/* Menu Items */}
        <div className="overflow-x-auto">
          <ul className="flex items-center justify-around py-2 px-4">
            {filteredNavItems.map((item) => (
              <NavItem 
                key={item.path} 
                item={item} 
                isMobile 
              />
            ))}
          </ul>
        </div>
      </nav>
    );
  };

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
