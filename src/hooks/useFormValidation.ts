// src/hooks/useFormValidation.ts
import { useState, useCallback } from 'react';
import { z, ZodSchema } from 'zod';
import { useNotification } from '@/contexts/NotificationContext';

interface UseFormValidationOptions<T> {
  schema: ZodSchema<T>;
  defaultValues: T;
  onSubmit: (data: T) => Promise<void> | void;
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
}

export function useFormValidation<T>({
  schema,
  defaultValues,
  onSubmit,
  onSuccess,
  onError,
}: UseFormValidationOptions<T>) {
  const [formData, setFormData] = useState<T>(defaultValues);
  const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const notification = useNotification();

  const validate = useCallback(() => {
    try {
      schema.parse(formData);
      setErrors({});
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          const path = err.path[0] as string;
          newErrors[path] = err.message;
        });
        setErrors(newErrors as Partial<Record<keyof T, string>>);
      }
      return false;
    }
  }, [formData, schema]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      const { name, value, type } = e.target;
      
      setFormData((prev) => ({
        ...prev,
        [name]: type === 'number' ? Number(value) : value,
      }));

      // Clear error when user starts typing
      if (errors[name as keyof T]) {
        setErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors[name as keyof T];
          return newErrors;
        });
      }
    },
    [errors]
  );

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      
      if (!validate()) {
        notification.addNotification('Please fix the form errors', 'error');
        return;
      }

      setIsSubmitting(true);
      try {
        await onSubmit(formData);
        onSuccess?.(formData);
      } catch (error) {
        console.error('Form submission error:', error);
        onError?.(error as Error);
        notification.addNotification(
          error instanceof Error ? error.message : 'An error occurred',
          'error'
        );
      } finally {
        setIsSubmitting(false);
      }
    },
    [formData, notification, onError, onSubmit, onSuccess, validate]
  );

  const resetForm = useCallback(() => {
    setFormData(defaultValues);
    setErrors({});
  }, [defaultValues]);

  return {
    formData,
    errors,
    isSubmitting,
    handleChange,
    handleSubmit,
    resetForm,
    setFormData,
    validate,
  };
}