import PropTypes from 'prop-types';
import React from 'react';

/**
 * TaskForm component for creating new tasks
 */
const TaskForm = ({ onSubmit, title, dueDate, onTitleChange, onDueDateChange }) => {
  const handleSubmit = (e) => {
    e.preventDefault();
    if (title.trim() && dueDate) {
      onSubmit();
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        value={title}
        onChange={(e) => onTitleChange(e.target.value)}
        placeholder="Enter task title"
        required
        aria-label="Task title"
      />
      <input
        type="date"
        value={dueDate}
        onChange={(e) => onDueDateChange(e.target.value)}
        required
        aria-label="Task due date"
      />
      <button type="submit">Add Task</button>
    </form>
  );
};

TaskForm.propTypes = {
  onSubmit: PropTypes.func.isRequired,
  title: PropTypes.string.isRequired,
  dueDate: PropTypes.string.isRequired,
  onTitleChange: PropTypes.func.isRequired,
  onDueDateChange: PropTypes.func.isRequired,
};

export default TaskForm;
