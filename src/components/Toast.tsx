// src/components/Toast.tsx
import { useEffect } from 'react';
import { XMarkIcon } from '@heroicons/react/20/solid';
import { useNotification } from '@/contexts/NotificationContext';

const Toast = () => {
  const { notifications, removeNotification } = useNotification();

  if (notifications.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2">
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className={`flex items-center justify-between p-4 rounded-md shadow-lg ${
            notification.type === 'success'
              ? 'bg-green-50 border border-green-200'
              : notification.type === 'error'
              ? 'bg-red-50 border border-red-200'
              : notification.type === 'warning'
              ? 'bg-yellow-50 border border-yellow-200'
              : 'bg-blue-50 border border-blue-200'
          }`}
          role="alert"
        >
          <div className="flex items-center">
            <div
              className={`flex-shrink-0 h-5 w-5 ${
                notification.type === 'success'
                  ? 'text-green-400'
                  : notification.type === 'error'
                  ? 'text-red-400'
                  : notification.type === 'warning'
                  ? 'text-yellow-400'
                  : 'text-blue-400'
              }`}
              aria-hidden="true"
            >
              {notification.type === 'success' ? (
                <svg
                  className="h-5 w-5"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
              ) : notification.type === 'error' ? (
                <svg
                  className="h-5 w-5"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
              ) : notification.type === 'warning' ? (
                <svg
                  className="h-5 w-5"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
              ) : (
                <svg
                  className="h-5 w-5"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
            </div>
            <p
              className={`ml-3 text-sm font-medium ${
                notification.type === 'success'
                  ? 'text-green-800'
                  : notification.type === 'error'
                  ? 'text-red-800'
                  : notification.type === 'warning'
                  ? 'text-yellow-800'
                  : 'text-blue-800'
              }`}
            >
              {notification.message}
            </p>
          </div>
          <button
            type="button"
            className="ml-4 -my-1.5 -mr-1.5 inline-flex rounded-md p-1.5 focus:outline-none focus:ring-2 focus:ring-offset-2"
            onClick={() => removeNotification(notification.id)}
          >
            <span className="sr-only">Dismiss</span>
            <XMarkIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
          </button>
        </div>
      ))}
    </div>
  );
};

export default Toast;