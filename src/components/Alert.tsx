import React, { useEffect } from 'react';
import { AlertCircle, CheckCircle, XCircle, Info } from 'lucide-react';

type AlertType = 'success' | 'error' | 'info' | 'warning';

interface AlertProps {
  type: AlertType;
  message: string;
  duration?: number;
  onClose?: () => void;
}

const Alert: React.FC<AlertProps> = ({ 
  type, 
  message,
  duration = 3000,
  onClose 
}) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose?.();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const alertClasses = {
    success: 'bg-green-100 border-green-500 text-green-700',
    error: 'bg-red-100 border-red-500 text-red-700',
    info: 'bg-blue-100 border-blue-500 text-blue-700',
    warning: 'bg-yellow-100 border-yellow-500 text-yellow-700',
  };

  const icons = {
    success: <CheckCircle className="w-5 h-5 mr-2" />,
    error: <XCircle className="w-5 h-5 mr-2" />,
    info: <Info className="w-5 h-5 mr-2" />,
    warning: <AlertCircle className="w-5 h-5 mr-2" />,
  };

  return (
    <div className={`fixed bottom-4 right-4 z-[100] p-4 rounded-md border-l-4 ${alertClasses[type]} flex items-center shadow-lg`}>
      {icons[type]}
      <span>{message}</span>
    </div>
  );
};

export default Alert;
