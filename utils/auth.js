import bcrypt from 'bcryptjs';

/**
 * Hashes a password using bcrypt
 * @param {string} password - The plain text password to hash
 * @returns {Promise<string>} The hashed password
 */
export async function hashPassword(password) {
  if (!password) {
    throw new Error('Password is required');
  }
  if (password.length < 12) {
    throw new Error('Password must be at least 12 characters long');
  }
  const salt = await bcrypt.genSalt(12); // Increased salt rounds for better security
  return await bcrypt.hash(password, salt);
}

/**
 * Compares a plain text password with a hashed password
 * @param {string} password - The plain text password
 * @param {string} hashedPassword - The hashed password to compare against
 * @returns {Promise<boolean>} True if passwords match, false otherwise
 */
export async function verifyPassword(password, hashedPassword) {
  if (!password || !hashedPassword) {
    return false;
  }
  return await bcrypt.compare(password, hashedPassword);
}

/**
 * Validates password strength
 * @param {string} password - The password to validate
 * @returns {{valid: boolean, message: string}} Validation result
 */
export function validatePasswordStrength(password) {
  const minLength = 12;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);

  if (password.length < minLength) {
    return {
      valid: false,
      message: `Password must be at least ${minLength} characters long`
    };
  }
  if (!hasUppercase) {
    return {
      valid: false,
      message: 'Password must contain at least one uppercase letter'
    };
  }
  if (!hasLowercase) {
    return {
      valid: false,
      message: 'Password must contain at least one lowercase letter'
    };
  }
  if (!hasNumbers) {
    return {
      valid: false,
      message: 'Password must contain at least one number'
    };
  }
  if (!hasSpecial) {
    return {
      valid: false,
      message: 'Password must contain at least one special character'
    };
  }
  return { valid: true, message: 'Password is strong' };
}
