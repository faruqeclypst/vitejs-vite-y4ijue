import { useState } from 'react';

type AlertType = 'success' | 'error' | 'info' | 'warning';

interface AlertOptions {
  type: AlertType;
  message: string;
  duration?: number;
}

const useAlert = () => {
  const [alert, setAlert] = useState<AlertOptions | null>(null);

  const showAlert = (options: AlertOptions) => {
    setAlert(options);
  };

  const hideAlert = () => {
    setAlert(null);
  };

  return { alert, showAlert, hideAlert };
};

export default useAlert;