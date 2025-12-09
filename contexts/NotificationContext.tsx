'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import ToastContainer from '@/components/ToastContainer';
import ConfirmModal, { ConfirmVariant } from '@/components/ConfirmModal';
import { ToastType } from '@/components/Toast';

interface ToastData {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

interface ConfirmData {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: ConfirmVariant;
  onConfirm: () => void;
  onCancel: () => void;
}

interface NotificationContextType {
  showToast: (
    type: ToastType,
    message: string,
    duration?: number
  ) => void;
  showConfirm: (
    title: string,
    message: string,
    options?: {
      confirmText?: string;
      cancelText?: string;
      variant?: ConfirmVariant;
    }
  ) => Promise<boolean>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(
  undefined
);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastData[]>([]);
  const [confirmData, setConfirmData] = useState<ConfirmData | null>(null);

  const showToast = useCallback(
    (type: ToastType, message: string, duration?: number) => {
      const id = `toast-${Date.now()}-${Math.random()}`;
      const newToast: ToastData = { id, type, message, duration };
      setToasts((prev) => [...prev, newToast]);
    },
    []
  );

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const showConfirm = useCallback(
    (
      title: string,
      message: string,
      options?: {
        confirmText?: string;
        cancelText?: string;
        variant?: ConfirmVariant;
      }
    ): Promise<boolean> => {
      return new Promise((resolve) => {
        const handleConfirm = () => {
          setConfirmData(null);
          resolve(true);
        };

        const handleCancel = () => {
          setConfirmData(null);
          resolve(false);
        };

        setConfirmData({
          title,
          message,
          confirmText: options?.confirmText,
          cancelText: options?.cancelText,
          variant: options?.variant,
          onConfirm: handleConfirm,
          onCancel: handleCancel,
        });
      });
    },
    []
  );

  return (
    <NotificationContext.Provider value={{ showToast, showConfirm }}>
      {children}
      <ToastContainer toasts={toasts} onClose={removeToast} />
      {confirmData && (
        <ConfirmModal
          isOpen={!!confirmData}
          title={confirmData.title}
          message={confirmData.message}
          confirmText={confirmData.confirmText}
          cancelText={confirmData.cancelText}
          variant={confirmData.variant}
          onConfirm={confirmData.onConfirm}
          onCancel={confirmData.onCancel}
        />
      )}
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error(
      'useNotification must be used within a NotificationProvider'
    );
  }
  return context;
}

