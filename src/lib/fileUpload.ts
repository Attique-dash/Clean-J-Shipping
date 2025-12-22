// src/lib/fileUpload.ts
export const validateFile = (
  file: File,
  options: {
    allowedTypes?: string[];
    maxSizeMB?: number;
  } = {}
): { valid: boolean; error?: string } => {
  const { allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'], maxSizeMB = 5 } = options;
  const maxSize = maxSizeMB * 1024 * 1024; // Convert MB to bytes

  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: `Invalid file type. Allowed types: ${allowedTypes.join(', ')}`,
    };
  }

  if (file.size > maxSize) {
    return {
      valid: false,
      error: `File is too large. Maximum size is ${maxSizeMB}MB`,
    };
  }

  return { valid: true };
};

export const readFileAsDataURL = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
};

export const uploadFile = async (
  file: File,
  uploadUrl: string,
  onProgress?: (progress: number) => void
): Promise<{ url: string }> => {
  const formData = new FormData();
  formData.append('file', file);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        const progress = Math.round((event.loaded / event.total) * 100);
        onProgress(progress);
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const response = JSON.parse(xhr.responseText);
          resolve(response);
        } catch (error) {
          reject(new Error('Invalid response from server'));
        }
      } else {
        reject(new Error(`Upload failed with status ${xhr.status}`));
      }
    };

    xhr.onerror = () => {
      reject(new Error('Network error during file upload'));
    };

    xhr.open('POST', uploadUrl, true);
    xhr.send(formData);
  });
};