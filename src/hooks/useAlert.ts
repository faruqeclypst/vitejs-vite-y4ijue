import { useState, useCallback } from 'react';

type AlertType = 'success' | 'error' | 'info' | 'warning';

interface AlertOptions {
  type: AlertType;
  message: string;
  duration?: number;
}

const useAlert = () => {
  const [alert, setAlert] = useState<AlertOptions | null>(null);

  const showAlert = useCallback((options: AlertOptions) => {
    setAlert(options);
    // Set timer to automatically hide alert
    const timer = setTimeout(() => {
      setAlert(null);
    }, options.duration || 3000);

    // Clean up timer if alert changes
    return () => clearTimeout(timer);
  }, []);

  const hideAlert = useCallback(() => {
    setAlert(null);
  }, []);

  return { alert, showAlert, hideAlert };
};

export default useAlert;
