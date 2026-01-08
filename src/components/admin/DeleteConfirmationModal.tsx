"use client";

import { AlertTriangle, Trash2 } from "lucide-react";
import SharedModal from "./SharedModal";

type DeleteConfirmationModalProps = {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  itemName?: string;
  loading?: boolean;
};

export default function DeleteConfirmationModal({
  open,
  onClose,
  onConfirm,
  title,
  message,
  itemName,
  loading = false,
}: DeleteConfirmationModalProps) {
  return (
    <SharedModal
      open={open}
      title={title}
      onClose={onClose}
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="rounded-xl border-2 border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 transition-all hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-red-600 to-red-700 px-4 py-2.5 text-sm font-semibold text-white shadow-lg transition-all hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4" />
                Delete
              </>
            )}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-red-100">
            <AlertTriangle className="h-6 w-6 text-red-600" />
          </div>
          <div className="flex-1">
            <h4 className="text-lg font-bold text-gray-900">{title}</h4>
            <p className="mt-2 text-sm text-gray-600">{message}</p>
            {itemName && (
              <div className="mt-3 rounded-lg bg-gray-50 p-3">
                <p className="text-sm font-semibold text-gray-900">{itemName}</p>
              </div>
            )}
          </div>
        </div>
        <div className="rounded-xl border-2 border-amber-200 bg-amber-50 p-4">
          <p className="text-xs font-medium text-amber-900">
            ⚠️ This action cannot be undone. Please confirm that you want to proceed.
          </p>
        </div>
      </div>
    </SharedModal>
  );
}

