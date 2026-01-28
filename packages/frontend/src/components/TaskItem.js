import PropTypes from 'prop-types';
import React from 'react';

/**
 * TaskItem component for displaying a single task
 */
const TaskItem = ({
  task,
  isEditing,
  editTitle,
  editDueDate,
  onToggleFinished,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onDelete,
  onStartAddSubtask,
  setEditTitle,
  setEditDueDate,
  children,
}) => {
  if (isEditing) {
    return (
      <div className="edit-task-form">
        <input
          type="text"
          value={editTitle}
          onChange={(e) => setEditTitle(e.target.value)}
          aria-label="Edit task title"
        />
        <input
          type="date"
          value={editDueDate}
          onChange={(e) => setEditDueDate(e.target.value)}
          aria-label="Edit task due date"
        />
        <div className="button-group">
          <button onClick={onSaveEdit} className="save-btn">Save</button>
          <button onClick={onCancelEdit} className="cancel-btn">Cancel</button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="task-header">
        <div className="task-info">
          <input
            type="checkbox"
            checked={task.finished}
            onChange={() => onToggleFinished(task.id, task.finished)}
            aria-label={`Mark ${task.title} as ${task.finished ? 'unfinished' : 'finished'}`}
          />
          <span className="task-title">{task.title}</span>
          <span className="task-due-date">
            Due: {new Date(task.due_date).toLocaleDateString()}
          </span>
        </div>
        <div className="task-actions">
          <button onClick={onStartEdit} className="edit-btn">Edit</button>
          <button onClick={onStartAddSubtask} className="add-subtask-btn">Add Subtask</button>
          <button onClick={onDelete} className="delete-btn">Delete</button>
        </div>
      </div>
      {children}
    </>
  );
};

TaskItem.propTypes = {
  task: PropTypes.shape({
    id: PropTypes.number.isRequired,
    title: PropTypes.string.isRequired,
    due_date: PropTypes.string.isRequired,
    finished: PropTypes.bool.isRequired,
    subtasks: PropTypes.array,
  }).isRequired,
  isEditing: PropTypes.bool.isRequired,
  editTitle: PropTypes.string,
  editDueDate: PropTypes.string,
  onToggleFinished: PropTypes.func.isRequired,
  onStartEdit: PropTypes.func.isRequired,
  onCancelEdit: PropTypes.func.isRequired,
  onSaveEdit: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
  onStartAddSubtask: PropTypes.func.isRequired,
  setEditTitle: PropTypes.func.isRequired,
  setEditDueDate: PropTypes.func.isRequired,
  children: PropTypes.node,
};

export default TaskItem;
