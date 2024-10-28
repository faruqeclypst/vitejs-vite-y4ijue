import { useState, useEffect } from 'react';

type AlertType = 'success' | 'error' | 'info' | 'warning';

interface AlertOptions {
  type: AlertType;
  message: string;
  duration?: number;
}

const useAlert = () => {
  const [alert, setAlert] = useState<AlertOptions | null>(null);

  useEffect(() => {
    if (alert && alert.duration) {
      const timer = setTimeout(() => {
        setAlert(null);
      }, alert.duration);

      return () => clearTimeout(timer);
    }
  }, [alert]);

  const showAlert = (options: AlertOptions) => {
    setAlert({ ...options, duration: options.duration || 3000 });
  };

  const hideAlert = () => {
    setAlert(null);
  };

  return { alert, showAlert, hideAlert };
};

export default useAlert;
