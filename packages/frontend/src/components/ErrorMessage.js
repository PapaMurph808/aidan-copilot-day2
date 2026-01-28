import PropTypes from 'prop-types';
import React from 'react';

/**
 * ErrorMessage component for displaying error messages
 */
const ErrorMessage = ({ message, onDismiss }) => {
  if (!message) return null;

  return (
    <div className="error" role="alert">
      {message}
      {onDismiss && (
        <button 
          onClick={onDismiss} 
          className="error-dismiss"
          aria-label="Dismiss error"
        >
          ×
        </button>
      )}
    </div>
  );
};

ErrorMessage.propTypes = {
  message: PropTypes.string,
  onDismiss: PropTypes.func,
};

export default ErrorMessage;
