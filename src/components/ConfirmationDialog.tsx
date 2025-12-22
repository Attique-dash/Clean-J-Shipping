// src/components/ConfirmationDialog.tsx
import { useState } from 'react';
import Modal from './Modal';
import Button from './Button';

interface ConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string | React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: 'default' | 'danger';
  loading?: boolean;
}

export default function ConfirmationDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'default',
  loading = false,
}: ConfirmationDialogProps) {
  const handleConfirm = () => {
    onConfirm();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="sm"
      closeOnClickOutside={!loading}
      closeOnEsc={!loading}
    >
      <div className="mt-2">
        <p className="text-sm text-gray-500">{message}</p>
      </div>

      <div className="mt-5 sm:mt-6 sm:grid sm:grid-flow-row-dense sm:grid-cols-2 sm:gap-3">
        <Button
          type="button"
          variant={variant === 'danger' ? 'destructive' : 'default'}
          className="w-full justify-center sm:col-start-2"
          onClick={handleConfirm}
          isLoading={loading}
          disabled={loading}
        >
          {confirmText}
        </Button>
        <Button
          type="button"
          variant="outline"
          className="mt-3 w-full justify-center sm:col-start-1 sm:mt-0"
          onClick={onClose}
          disabled={loading}
        >
          {cancelText}
        </Button>
      </div>
    </Modal>
  );
}