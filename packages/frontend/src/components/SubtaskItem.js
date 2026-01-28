import PropTypes from 'prop-types';
import React from 'react';

/**
 * SubtaskItem component for displaying a single subtask
 */
const SubtaskItem = ({
  subtask,
  isEditing,
  editTitle,
  editDueDate,
  parentDueDate,
  onToggleFinished,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onDelete,
  setEditTitle,
  setEditDueDate,
}) => {
  if (isEditing) {
    return (
      <div className="edit-subtask-form">
        <input
          type="text"
          value={editTitle}
          onChange={(e) => setEditTitle(e.target.value)}
          aria-label="Edit subtask title"
        />
        <input
          type="date"
          value={editDueDate}
          onChange={(e) => setEditDueDate(e.target.value)}
          max={parentDueDate}
          aria-label="Edit subtask due date"
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
      <div className="subtask-info">
        <input
          type="checkbox"
          checked={subtask.finished}
          onChange={() => onToggleFinished(subtask.id, subtask.finished)}
          aria-label={`Mark ${subtask.title} as ${subtask.finished ? 'unfinished' : 'finished'}`}
        />
        <span className="subtask-title">{subtask.title}</span>
        <span className="subtask-due-date">
          Due: {new Date(subtask.due_date).toLocaleDateString()}
        </span>
      </div>
      <div className="subtask-actions">
        <button onClick={onStartEdit} className="edit-btn">Edit</button>
        <button onClick={onDelete} className="delete-btn">Delete</button>
      </div>
    </>
  );
};

SubtaskItem.propTypes = {
  subtask: PropTypes.shape({
    id: PropTypes.number.isRequired,
    title: PropTypes.string.isRequired,
    due_date: PropTypes.string.isRequired,
    finished: PropTypes.bool.isRequired,
    parent_task_id: PropTypes.number.isRequired,
  }).isRequired,
  isEditing: PropTypes.bool.isRequired,
  editTitle: PropTypes.string,
  editDueDate: PropTypes.string,
  parentDueDate: PropTypes.string.isRequired,
  onToggleFinished: PropTypes.func.isRequired,
  onStartEdit: PropTypes.func.isRequired,
  onCancelEdit: PropTypes.func.isRequired,
  onSaveEdit: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
  setEditTitle: PropTypes.func.isRequired,
  setEditDueDate: PropTypes.func.isRequired,
};

export default SubtaskItem;
