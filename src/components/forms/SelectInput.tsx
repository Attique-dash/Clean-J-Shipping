// src/components/forms/SelectInput.tsx
import { forwardRef } from 'react';
import { ExclamationCircleIcon } from '@heroicons/react/20/solid';

interface SelectOption {
  value: string | number;
  label: string;
  disabled?: boolean;
}

interface SelectInputProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  options: SelectOption[];
  error?: string;
  helpText?: string;
  containerClassName?: string;
  labelClassName?: string;
  selectClassName?: string;
  errorClassName?: string;
}

const SelectInput = forwardRef<HTMLSelectElement, SelectInputProps>(
  (
    {
      label,
      options,
      error,
      helpText,
      containerClassName = '',
      labelClassName = '',
      selectClassName = '',
      errorClassName = '',
      className = '',
      id,
      ...props
    },
    ref
  ) => {
    const selectId = id || `select-${Math.random().toString(36).substring(2, 11)}`;

    return (
      <div className={containerClassName}>
        <label
          htmlFor={selectId}
          className={`block text-sm font-medium text-gray-700 ${labelClassName}`}
        >
          {label}
        </label>
        <div className="mt-1 relative">
          <select
            id={selectId}
            ref={ref}
            className={`block w-full rounded-md border ${
              error
                ? 'border-red-300 text-red-900 focus:outline-none focus:ring-red-500 focus:border-red-500'
                : 'border-gray-300 focus:ring-indigo-500 focus:border-indigo-500'
            } py-2 pl-3 pr-10 text-base sm:text-sm ${selectClassName} ${className}`}
            aria-invalid={!!error}
            aria-describedby={error ? `${selectId}-error` : helpText ? `${selectId}-help` : undefined}
            {...props}
          >
            {options.map((option) => (
              <option
                key={option.value}
                value={option.value}
                disabled={option.disabled}
              >
                {option.label}
              </option>
            ))}
          </select>
          {error && (
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
              <ExclamationCircleIcon className="h-5 w-5 text-red-500" aria-hidden="true" />
            </div>
          )}
        </div>
        {error ? (
          <p className={`mt-1 text-sm text-red-600 ${errorClassName}`} id={`${selectId}-error`}>
            {error}
          </p>
        ) : helpText ? (
          <p className="mt-1 text-sm text-gray-500" id={`${selectId}-help`}>
            {helpText}
          </p>
        ) : null}
      </div>
    );
  }
);

SelectInput.displayName = 'SelectInput';

export default SelectInput;