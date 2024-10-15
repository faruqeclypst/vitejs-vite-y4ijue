import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Users, ClipboardList, Calendar, UserPlus, FileText } from 'lucide-react';

const Sidebar: React.FC = () => {
  const location = useLocation();

  const navItems = [
    { path: '/', icon: Users, label: 'Home' },
    { path: '/teachers', icon: Users, label: 'Teachers' },
    { path: '/roster', icon: ClipboardList, label: 'Roster' },
    { path: '/attendance', icon: Calendar, label: 'Attendance' },
    { path: '/students', icon: UserPlus, label: 'Students' },
    { path: '/leave-request', icon: FileText, label: 'Leave Requests' },
  ];

  return (
    <nav className="bg-blue-600 text-white w-64 min-h-screen p-4">
      <h1 className="text-2xl font-bold mb-8">Piket MOSA</h1>
      <ul className="space-y-2">
        {navItems.map((item) => (
          <li key={item.path}>
            <Link
              to={item.path}
              className={`flex items-center p-2 rounded hover:bg-blue-700 ${
                location.pathname === item.path ? 'bg-blue-700' : ''
              }`}
            >
              <item.icon className="mr-2" size={20} />
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
};

export default Sidebar;