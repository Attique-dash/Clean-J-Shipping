"use client";

import React, { useEffect } from "react";
import { X } from "lucide-react";

export default function SharedModal({ 
  open, 
  title, 
  onClose, 
  children, 
  footer 
}: { 
  open: boolean; 
  title?: string; 
  onClose: () => void; 
  children: React.ReactNode; 
  footer?: React.ReactNode; 
}) {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) {
        onClose();
      }
    };

    if (open) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
        aria-hidden="true"
      />
      
      <div className="relative z-10 w-full max-w-2xl animate-in fade-in zoom-in duration-200">
        <div className="overflow-hidden rounded-2xl border-2 border-gray-200 bg-white shadow-2xl">
          <div className="flex items-center justify-between border-b-2 border-gray-200 bg-gradient-to-r from-gray-50 to-white px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="h-2 w-2 rounded-full bg-red-500" />
              <div className="h-2 w-2 rounded-full bg-yellow-500" />
              <div className="h-2 w-2 rounded-full bg-green-500" />
              {title && (
                <h3 className="ml-2 text-lg font-bold text-gray-900">{title}</h3>
              )}
            </div>
            <button
              onClick={onClose}
              className="group flex h-8 w-8 items-center justify-center rounded-lg transition-all hover:bg-red-50"
              aria-label="Close modal"
            >
              <X className="h-5 w-5 text-gray-400 transition-colors group-hover:text-red-600" />
            </button>
          </div>

          <div className="max-h-[calc(100vh-16rem)] overflow-y-auto px-6 py-6">
            {children}
          </div>

          {footer && (
            <div className="flex items-center justify-end gap-3 border-t-2 border-gray-200 bg-gray-50 px-6 py-4">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

