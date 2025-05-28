// components/ToastContainer.jsx
import React from 'react';
import { useToastStore } from '../stores/useToastStore';
import Toast from './Toast';

const ToastContainer = ({ className = '' }) => {
  const { toasts, removeToast } = useToastStore();

  if (toasts.length === 0) {
    return null;
  }

  return (
    <div className={`fixed top-4 right-4 z-50 max-w-sm w-full ${className}`}>
      {toasts.map((toast) => (
        <Toast key={toast.id} toast={toast} onRemove={removeToast} />
      ))}
    </div>
  );
};

export default ToastContainer;
