import { useState } from 'react';

interface ConfirmationOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
}

const useConfirmation = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState<ConfirmationOptions | null>(null);
  const [resolve, setResolve] = useState<((value: boolean) => void) | null>(null);

  const confirm = (options: ConfirmationOptions): Promise<boolean> => {
    setOptions(options);
    setIsOpen(true);
    return new Promise((res) => {
      setResolve(() => res);
    });
  };

  const handleConfirm = () => {
    if (resolve) {
      resolve(true);
    }
    setIsOpen(false);
  };

  const handleCancel = () => {
    if (resolve) {
      resolve(false);
    }
    setIsOpen(false);
  };

  return {
    isOpen,
    options,
    confirm,
    handleConfirm,
    handleCancel,
  };
};

export default useConfirmation;