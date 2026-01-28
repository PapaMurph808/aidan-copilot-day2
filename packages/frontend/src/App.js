import React, { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sortByDate, setSortByDate] = useState(false);
  
  // Form states
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDueDate, setNewTaskDueDate] = useState('');
  const [editingTask, setEditingTask] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDueDate, setEditDueDate] = useState('');
  
  // Subtask form states
  const [addingSubtaskFor, setAddingSubtaskFor] = useState(null);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [newSubtaskDueDate, setNewSubtaskDueDate] = useState('');
  const [editingSubtask, setEditingSubtask] = useState(null);
  const [editSubtaskTitle, setEditSubtaskTitle] = useState('');
  const [editSubtaskDueDate, setEditSubtaskDueDate] = useState('');

  useEffect(() => {
    fetchTasks();
  }, [sortByDate]);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const url = sortByDate ? '/api/tasks?sort=due_date' : '/api/tasks';
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      const result = await response.json();
      setTasks(result);
      setError(null);
    } catch (err) {
      setError('Failed to fetch tasks: ' + err.message);
      console.error('Error fetching tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    if (!newTaskTitle.trim() || !newTaskDueDate) return;

    try {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          title: newTaskTitle,
          due_date: newTaskDueDate
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add task');
      }

      setNewTaskTitle('');
      setNewTaskDueDate('');
      fetchTasks();
    } catch (err) {
      setError('Error adding task: ' + err.message);
      console.error('Error adding task:', err);
    }
  };

  const handleToggleFinished = async (taskId, currentStatus) => {
    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ finished: !currentStatus }),
      });

      if (!response.ok) {
        throw new Error('Failed to update task');
      }

      fetchTasks();
    } catch (err) {
      setError('Error updating task: ' + err.message);
      console.error('Error updating task:', err);
    }
  };

  const handleStartEdit = (task) => {
    setEditingTask(task.id);
    setEditTitle(task.title);
    setEditDueDate(task.due_date);
  };

  const handleCancelEdit = () => {
    setEditingTask(null);
    setEditTitle('');
    setEditDueDate('');
  };

  const handleSaveEdit = async (taskId) => {
    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          title: editTitle,
          due_date: editDueDate
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update task');
      }

      setEditingTask(null);
      setEditTitle('');
      setEditDueDate('');
      fetchTasks();
    } catch (err) {
      setError('Error updating task: ' + err.message);
      console.error('Error updating task:', err);
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (!window.confirm('Are you sure you want to delete this task?')) return;
    
    // Add deleting class for animation
    const taskElement = document.querySelector(`[data-task-id="${taskId}"]`);
    if (taskElement) {
      taskElement.classList.add('deleting');
      
      // Wait for animation to complete before removing from state
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete task');
      }

      fetchTasks();
    } catch (err) {
      setError('Error deleting task: ' + err.message);
      console.error('Error deleting task:', err);
    }
  };

  const handleStartAddSubtask = (taskId) => {
    setAddingSubtaskFor(taskId);
    setNewSubtaskTitle('');
    setNewSubtaskDueDate('');
  };

  const handleCancelAddSubtask = () => {
    setAddingSubtaskFor(null);
    setNewSubtaskTitle('');
    setNewSubtaskDueDate('');
  };

  const handleCreateSubtask = async (taskId) => {
    if (!newSubtaskTitle.trim() || !newSubtaskDueDate) return;

    try {
      const response = await fetch(`/api/tasks/${taskId}/subtasks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          title: newSubtaskTitle,
          due_date: newSubtaskDueDate
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add subtask');
      }

      setAddingSubtaskFor(null);
      setNewSubtaskTitle('');
      setNewSubtaskDueDate('');
      fetchTasks();
    } catch (err) {
      setError('Error adding subtask: ' + err.message);
      console.error('Error adding subtask:', err);
    }
  };

  const handleToggleSubtaskFinished = async (subtaskId, currentStatus) => {
    try {
      const response = await fetch(`/api/subtasks/${subtaskId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ finished: !currentStatus }),
      });

      if (!response.ok) {
        throw new Error('Failed to update subtask');
      }

      fetchTasks();
    } catch (err) {
      setError('Error updating subtask: ' + err.message);
      console.error('Error updating subtask:', err);
    }
  };

  const handleStartEditSubtask = (subtask) => {
    setEditingSubtask(subtask.id);
    setEditSubtaskTitle(subtask.title);
    setEditSubtaskDueDate(subtask.due_date);
  };

  const handleCancelEditSubtask = () => {
    setEditingSubtask(null);
    setEditSubtaskTitle('');
    setEditSubtaskDueDate('');
  };

  const handleSaveEditSubtask = async (subtaskId) => {
    try {
      const response = await fetch(`/api/subtasks/${subtaskId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          title: editSubtaskTitle,
          due_date: editSubtaskDueDate
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update subtask');
      }

      setEditingSubtask(null);
      setEditSubtaskTitle('');
      setEditSubtaskDueDate('');
      fetchTasks();
    } catch (err) {
      setError('Error updating subtask: ' + err.message);
      console.error('Error updating subtask:', err);
    }
  };

  const handleDeleteSubtask = async (subtaskId) => {
    if (!window.confirm('Are you sure you want to delete this subtask?')) return;
    
    // Add deleting class for animation
    const subtaskElement = document.querySelector(`[data-subtask-id="${subtaskId}"]`);
    if (subtaskElement) {
      subtaskElement.classList.add('deleting');
      
      // Wait for animation to complete before removing from state
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    try {
      const response = await fetch(`/api/subtasks/${subtaskId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete subtask');
      }

      fetchTasks();
    } catch (err) {
      setError('Error deleting subtask: ' + err.message);
      console.error('Error deleting subtask:', err);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>TODO List Application</h1>
        <p>Manage your tasks and subtasks with due dates</p>
      </header>
      
      <main>
        <section className="add-task-section">
          <h2>Add New Task</h2>
          <form onSubmit={handleCreateTask}>
            <input
              type="text"
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              placeholder="Enter task title"
              aria-label="Task title"
              required
            />
            <input
              type="date"
              value={newTaskDueDate}
              onChange={(e) => setNewTaskDueDate(e.target.value)}
              aria-label="Task due date"
              required
            />
            <button type="submit">Add Task</button>
          </form>
        </section>

        <section className="tasks-section">
          <div className="section-header">
            <h2>Tasks</h2>
            <label className="sort-toggle">
              <input
                type="checkbox"
                checked={sortByDate}
                onChange={(e) => setSortByDate(e.target.checked)}
              />
              Sort by due date
            </label>
          </div>
          
          {loading && <p>Loading tasks...</p>}
          {error && <p className="error">{error}</p>}
          
          {!loading && !error && (
            <div className="tasks-list">
              {tasks.length > 0 ? (
                tasks.map((task) => (
                  <div key={task.id} className={`task-item ${task.finished ? 'finished' : ''}`} data-task-id={task.id}>
                    {editingTask === task.id ? (
                      <div className="edit-task-form">
                        <input
                          type="text"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                        />
                        <input
                          type="date"
                          value={editDueDate}
                          onChange={(e) => setEditDueDate(e.target.value)}
                        />
                        <div className="button-group">
                          <button onClick={() => handleSaveEdit(task.id)} className="save-btn">Save</button>
                          <button onClick={handleCancelEdit} className="cancel-btn">Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="task-header">
                          <div className="task-info">
                            <input
                              type="checkbox"
                              checked={task.finished}
                              onChange={() => handleToggleFinished(task.id, task.finished)}
                            />
                            <span className="task-title">{task.title}</span>
                            <span className="task-due-date">Due: {formatDate(task.due_date)}</span>
                          </div>
                          <div className="task-actions">
                            <button onClick={() => handleStartEdit(task)} className="edit-btn">Edit</button>
                            <button onClick={() => handleStartAddSubtask(task.id)} className="add-subtask-btn">Add Subtask</button>
                            <button onClick={() => handleDeleteTask(task.id)} className="delete-btn">Delete</button>
                          </div>
                        </div>

                        {addingSubtaskFor === task.id && (
                          <div className="add-subtask-form">
                            <input
                              type="text"
                              value={newSubtaskTitle}
                              onChange={(e) => setNewSubtaskTitle(e.target.value)}
                              placeholder="Subtask title"
                              aria-label="Subtask title"
                            />
                            <input
                              type="date"
                              value={newSubtaskDueDate}
                              onChange={(e) => setNewSubtaskDueDate(e.target.value)}
                              max={task.due_date}
                              aria-label="Subtask due date"
                            />
                            <div className="button-group">
                              <button onClick={() => handleCreateSubtask(task.id)} className="save-btn">Add</button>
                              <button onClick={handleCancelAddSubtask} className="cancel-btn">Cancel</button>
                            </div>
                          </div>
                        )}

                        {task.subtasks && task.subtasks.length > 0 && (
                          <div className="subtasks-list">
                            {task.subtasks.map((subtask) => (
                              <div key={subtask.id} className={`subtask-item ${subtask.finished ? 'finished' : ''}`} data-subtask-id={subtask.id}>
                                {editingSubtask === subtask.id ? (
                                  <div className="edit-subtask-form">
                                    <input
                                      type="text"
                                      value={editSubtaskTitle}
                                      onChange={(e) => setEditSubtaskTitle(e.target.value)}
                                      aria-label="Edit subtask title"
                                    />
                                    <input
                                      type="date"
                                      value={editSubtaskDueDate}
                                      onChange={(e) => setEditSubtaskDueDate(e.target.value)}
                                      max={task.due_date}
                                      aria-label="Edit subtask due date"
                                    />
                                    <div className="button-group">
                                      <button onClick={() => handleSaveEditSubtask(subtask.id)} className="save-btn">Save</button>
                                      <button onClick={handleCancelEditSubtask} className="cancel-btn">Cancel</button>
                                    </div>
                                  </div>
                                ) : (
                                  <>
                                    <div className="subtask-info">
                                      <input
                                        type="checkbox"
                                        checked={subtask.finished}
                                        onChange={() => handleToggleSubtaskFinished(subtask.id, subtask.finished)}
                                      />
                                      <span className="subtask-title">{subtask.title}</span>
                                      <span className="subtask-due-date">Due: {formatDate(subtask.due_date)}</span>
                                    </div>
                                    <div className="subtask-actions">
                                      <button onClick={() => handleStartEditSubtask(subtask)} className="edit-btn">Edit</button>
                                      <button onClick={() => handleDeleteSubtask(subtask.id)} className="delete-btn">Delete</button>
                                    </div>
                                  </>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                ))
              ) : (
                <p>No tasks found. Add some!</p>
              )}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default App;