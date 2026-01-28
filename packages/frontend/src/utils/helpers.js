/**
 * Format a date string to a localized date
 * @param {string} dateString - ISO date string
 * @returns {string} - Formatted date
 */
export const formatDate = (dateString) => {
  if (!dateString) return '';
  
  try {
    return new Date(dateString).toLocaleDateString();
  } catch (error) {
    console.error('Error formatting date:', error);
    return dateString;
  }
};

/**
 * Validate if a string is a valid date
 * @param {string} dateString - Date string to validate
 * @returns {boolean} - True if valid date
 */
export const isValidDate = (dateString) => {
  if (!dateString) return false;
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date.getTime());
};

/**
 * Add animation class and wait for animation to complete
 * @param {string} selector - CSS selector for element
 * @param {string} className - Class name to add
 * @param {number} duration - Animation duration in ms
 * @returns {Promise<void>}
 */
export const animateElement = async (selector, className, duration = 500) => {
  const element = document.querySelector(selector);
  if (element) {
    element.classList.add(className);
    await new Promise(resolve => setTimeout(resolve, duration));
  }
};

/**
 * Show confirmation dialog with custom message
 * @param {string} message - Confirmation message
 * @returns {boolean} - True if confirmed
 */
export const confirmAction = (message) => {
  return window.confirm(message);
};
