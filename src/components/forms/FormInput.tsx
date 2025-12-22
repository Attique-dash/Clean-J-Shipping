// src/components/forms/FormInput.tsx
import { forwardRef } from 'react';
import { ExclamationCircleIcon } from '@heroicons/react/20/solid';

interface FormInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  helpText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  containerClassName?: string;
  labelClassName?: string;
  inputClassName?: string;
  errorClassName?: string;
}

const FormInput = forwardRef<HTMLInputElement, FormInputProps>(
  (
    {
      label,
      error,
      helpText,
      leftIcon,
      rightIcon,
      containerClassName = '',
      labelClassName = '',
      inputClassName = '',
      errorClassName = '',
      className = '',
      id,
      ...props
    },
    ref
  ) => {
    const inputId = id || `input-${Math.random().toString(36).substring(2, 11)}`;

    return (
      <div className={containerClassName}>
        <label
          htmlFor={inputId}
          className={`block text-sm font-medium text-gray-700 ${labelClassName}`}
        >
          {label}
        </label>
        <div className="mt-1 relative rounded-md shadow-sm">
          {leftIcon && (
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              {leftIcon}
            </div>
          )}
          <input
            id={inputId}
            ref={ref}
            className={`block w-full rounded-md border ${
              error
                ? 'border-red-300 text-red-900 placeholder-red-300 focus:outline-none focus:ring-red-500 focus:border-red-500'
                : 'border-gray-300 focus:ring-indigo-500 focus:border-indigo-500'
            } ${
              leftIcon ? 'pl-10' : 'pl-3'
            } pr-10 py-2 text-sm ${inputClassName} ${className}`}
            aria-invalid={!!error}
            aria-describedby={error ? `${inputId}-error` : helpText ? `${inputId}-help` : undefined}
            {...props}
          />
          {rightIcon && (
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
              {rightIcon}
            </div>
          )}
          {error && (
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
              <ExclamationCircleIcon className="h-5 w-5 text-red-500" aria-hidden="true" />
            </div>
          )}
        </div>
        {error ? (
          <p className={`mt-1 text-sm text-red-600 ${errorClassName}`} id={`${inputId}-error`}>
            {error}
          </p>
        ) : helpText ? (
          <p className="mt-1 text-sm text-gray-500" id={`${inputId}-help`}>
            {helpText}
          </p>
        ) : null}
      </div>
    );
  }
);

FormInput.displayName = 'FormInput';

export default FormInput;