/**
 * Validators and security utilities for frontend forms and user inputs.
 * These provide essential safeguards against XSS, injection, and data integrity issues.
 */

/**
 * Sanitize user input by removing potentially dangerous HTML/scripts
 * @param {string} input - Raw user input
 * @returns {string} - Sanitized safe string
 */
export const sanitizeInput = (input) => {
  if (typeof input !== 'string') return '';
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

/**
 * Validate project name: 1-100 chars, no special chars, alphanumeric + spaces/hyphens
 * @param {string} name - Project name to validate
 * @returns {{ valid: boolean, error?: string }}
 */
export const validateProjectName = (name) => {
  if (!name || typeof name !== 'string') {
    return { valid: false, error: 'Project name is required' };
  }
  const trimmed = name.trim();
  if (trimmed.length < 1) {
    return { valid: false, error: 'Project name cannot be empty' };
  }
  if (trimmed.length > 100) {
    return { valid: false, error: 'Project name must be under 100 characters' };
  }
  if (!/^[a-zA-Z0-9\s\-_()]+$/.test(trimmed)) {
    return { valid: false, error: 'Project name contains invalid characters' };
  }
  return { valid: true };
};

/**
 * Validate email address format
 * @param {string} email - Email to validate
 * @returns {{ valid: boolean, error?: string }}
 */
export const validateEmail = (email) => {
  if (!email || typeof email !== 'string') {
    return { valid: false, error: 'Email is required' };
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { valid: false, error: 'Invalid email format' };
  }
  if (email.length > 254) {
    return { valid: false, error: 'Email is too long' };
  }
  return { valid: true };
};

/**
 * Validate password strength
 * @param {string} password - Password to validate
 * @returns {{ valid: boolean, error?: string, strength: 'weak'|'fair'|'good'|'strong' }}
 */
export const validatePassword = (password) => {
  if (!password || typeof password !== 'string') {
    return { valid: false, error: 'Password is required', strength: 'weak' };
  }
  if (password.length < 8) {
    return { valid: false, error: 'Password must be at least 8 characters', strength: 'weak' };
  }
  if (password.length > 128) {
    return { valid: false, error: 'Password is too long', strength: 'weak' };
  }

  let strength = 'weak';
  const checks = {
    lower: /[a-z]/.test(password),
    upper: /[A-Z]/.test(password),
    number: /\d/.test(password),
    special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
  };

  const checkCount = Object.values(checks).filter(Boolean).length;
  if (checkCount >= 4) strength = 'strong';
  else if (checkCount === 3) strength = 'good';
  else if (checkCount === 2) strength = 'fair';

  return { valid: password.length >= 8, strength };
};

/**
 * Validate color hex value
 * @param {string} color - Color hex code (e.g., #ffffff)
 * @returns {boolean}
 */
export const validateColor = (color) => {
  if (typeof color !== 'string') return false;
  return /^#[0-9A-Fa-f]{6}$/.test(color);
};

/**
 * Validate numeric value within range
 * @param {number} value - Value to validate
 * @param {number} min - Minimum allowed value
 * @param {number} max - Maximum allowed value
 * @returns {boolean}
 */
export const validateNumberInRange = (value, min, max) => {
  return Number.isFinite(value) && value >= min && value <= max;
};

/**
 * Validate array of IDs (ensures all are positive integers)
 * @param {array} ids - Array of IDs to validate
 * @returns {boolean}
 */
export const validateIds = (ids) => {
  if (!Array.isArray(ids)) return false;
  return ids.every(id => Number.isInteger(id) && id > 0);
};

/**
 * Safe JSON parse with fallback
 * @param {string} jsonString - JSON string to parse
 * @param {any} fallback - Fallback value if parse fails
 * @returns {any}
 */
export const safeJsonParse = (jsonString, fallback = {}) => {
  try {
    return JSON.parse(jsonString);
  } catch (err) {
    console.warn('JSON parse failed:', err);
    return fallback;
  }
};

/**
 * Debounce function to prevent rapid-fire requests
 * @param {Function} func - Function to debounce
 * @param {number} delay - Delay in milliseconds
 * @returns {Function}
 */
export const debounce = (func, delay) => {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
};

/**
 * Rate limiter to prevent request flooding
 * @param {number} maxRequests - Max requests allowed
 * @param {number} windowMs - Time window in milliseconds
 * @returns {Function} - Returns a function that checks if request is allowed
 */
export const createRateLimiter = (maxRequests = 5, windowMs = 60000) => {
  const requests = [];
  return () => {
    const now = Date.now();
    const recentRequests = requests.filter(time => now - time < windowMs);
    if (recentRequests.length >= maxRequests) {
      return false;
    }
    requests.push(now);
    return true;
  };
};

/**
 * Check if string is URL-safe
 * @param {string} str - String to validate
 * @returns {boolean}
 */
export const isUrlSafe = (str) => {
  if (typeof str !== 'string') return false;
  try {
    new URL(str);
    return true;
  } catch {
    return false;
  }
};
