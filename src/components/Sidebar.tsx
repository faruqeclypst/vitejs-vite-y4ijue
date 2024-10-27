import React, { useState, useRef } from 'react';
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
    const [showAllMenu, setShowAllMenu] = useState(false);
    const [touchStart, setTouchStart] = useState<number | null>(null);
    const [touchEnd, setTouchEnd] = useState<number | null>(null);
    const menuRef = useRef<HTMLDivElement>(null);

    const minSwipeDistance = 50;

    const onTouchStart = (e: React.TouchEvent) => {
      setTouchEnd(null);
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
        navigate(accessiblePaths[currentPathIndex + 1]);
        if (window.navigator && window.navigator.vibrate) {
          window.navigator.vibrate(50);
        }
      } else if (isRightSwipe && currentPathIndex > 0) {
        navigate(accessiblePaths[currentPathIndex - 1]);
        if (window.navigator && window.navigator.vibrate) {
          window.navigator.vibrate(50);
        }
      }

      setTouchStart(null);
      setTouchEnd(null);
    };

    return (
      <>
        <nav 
          className="fixed bottom-0 left-0 right-0 bg-blue-700 text-white md:hidden z-50 touch-pan-x"
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          {/* Menu Items */}
          <div 
            ref={menuRef}
            className="overflow-x-hidden relative"
          >
            <ul className="flex items-center justify-between py-2 px-4">
              {filteredNavItems.slice(0, 4).map((item) => (
                <NavItem 
                  key={item.path} 
                  item={item} 
                  isMobile 
                />
              ))}
              <li>
                <button
                  onClick={() => setShowAllMenu(true)}
                  className="p-3 text-white hover:bg-blue-600 rounded-lg"
                >
                  <Menu size={20} />
                </button>
              </li>
            </ul>
          </div>
        </nav>

        {/* Modal menu */}
        {showAllMenu && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 md:hidden">
            <div className="bg-blue-700 p-4 absolute bottom-0 left-0 right-0">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-white font-bold">Menu Lainnya</h3>
                <button 
                  onClick={() => setShowAllMenu(false)}
                  className="text-white"
                >
                  <X size={24} />
                </button>
              </div>
              <ul className="grid grid-cols-4 gap-4">
                {filteredNavItems.map((item) => (
                  <li key={item.path} className="flex flex-col items-center">
                    <Link
                      to={item.path}
                      className={`flex flex-col items-center p-2 rounded-lg transition-colors duration-200 w-full ${
                        location.pathname === item.path
                          ? 'bg-blue-600 text-white'
                          : 'text-blue-100 hover:bg-blue-600 hover:text-white'
                      }`}
                      onClick={() => setShowAllMenu(false)}
                    >
                      <item.icon size={16} />
                      <span className="text-[10px] mt-0.5 text-center whitespace-nowrap">{item.label}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </>
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
