import { User } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useEffect, useState } from 'react';

const Header = () => {
  const { user } = useAuth();
  const [currentDateTime, setCurrentDateTime] = useState(new Date());

  useEffect(() => {
    // Update setiap detik
    const timer = setInterval(() => {
      setCurrentDateTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatDate = (date: Date) => {
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    };
    return date.toLocaleDateString('id-ID', options);
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };
  
  return (
    <header className="bg-white shadow-sm sticky top-0 z-10">
      <div className="h-14 w-full px-4 flex items-center justify-between">
        <div className="text-gray-700">
          <span className="font-medium">{formatDate(currentDateTime)}</span>
          <span className="mx-2">|</span>
          <span className="font-medium">{formatTime(currentDateTime)}</span>
        </div>
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
