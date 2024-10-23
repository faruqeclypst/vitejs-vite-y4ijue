import { User } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const Header = () => {
  const { user } = useAuth();
  
  return (
    <header className="bg-white shadow-sm sticky top-0 z-10">
      <div className="h-14 w-full px-4 flex items-center justify-end">
        <div className="flex items-center space-x-2">
          <User className="h-5 w-5 text-gray-500" />
          <div className="flex flex-col items-end">
            <span className="text-gray-700 font-medium">{user?.fullName}</span>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
