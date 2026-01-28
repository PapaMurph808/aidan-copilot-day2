const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const Database = require('better-sqlite3');

// Initialize express app
const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Initialize in-memory SQLite database
const db = new Database(':memory:');

// Create tables for tasks and subtasks
db.exec(`
  CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    due_date TEXT NOT NULL,
    finished INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS subtasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    parent_task_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    due_date TEXT NOT NULL,
    finished INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (parent_task_id) REFERENCES tasks(id) ON DELETE CASCADE
  );
`);

console.log('In-memory database initialized for TODO list application');

// Helper function to validate date
const isValidDate = (dateString) => {
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date);
};

// API Routes

// Get all tasks with their subtasks, optionally sorted by due date
app.get('/api/tasks', (req, res) => {
  try {
    const { sort } = req.query;
    
    let tasksQuery = 'SELECT * FROM tasks';
    if (sort === 'due_date') {
      tasksQuery += ' ORDER BY due_date ASC';
    } else {
      tasksQuery += ' ORDER BY created_at DESC';
    }
    
    const tasks = db.prepare(tasksQuery).all();
    
    // Get subtasks for each task
    const tasksWithSubtasks = tasks.map(task => {
      const subtasks = db.prepare('SELECT * FROM subtasks WHERE parent_task_id = ? ORDER BY due_date ASC').all(task.id);
      return {
        ...task,
        finished: Boolean(task.finished),
        subtasks: subtasks.map(st => ({
          ...st,
          finished: Boolean(st.finished)
        }))
      };
    });
    
    res.json(tasksWithSubtasks);
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

// Create a new task
app.post('/api/tasks', (req, res) => {
  try {
    const { title, due_date } = req.body;
    
    if (!title || typeof title !== 'string' || title.trim() === '') {
      return res.status(400).json({ error: 'Task title is required' });
    }
    
    if (!due_date || !isValidDate(due_date)) {
      return res.status(400).json({ error: 'Valid due date is required' });
    }
    
    const result = db.prepare('INSERT INTO tasks (title, due_date) VALUES (?, ?)').run(title, due_date);
    const id = result.lastInsertRowid;
    
    const newTask = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
    res.status(201).json({
      ...newTask,
      finished: Boolean(newTask.finished),
      subtasks: []
    });
  } catch (error) {
    console.error('Error creating task:', error);
    res.status(500).json({ error: 'Failed to create task' });
  }
});

// Update a task
app.put('/api/tasks/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { title, due_date, finished } = req.body;
    
    const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    const updates = [];
    const values = [];
    
    if (title !== undefined) {
      if (typeof title !== 'string' || title.trim() === '') {
        return res.status(400).json({ error: 'Task title cannot be empty' });
      }
      updates.push('title = ?');
      values.push(title);
    }
    
    if (due_date !== undefined) {
      if (!isValidDate(due_date)) {
        return res.status(400).json({ error: 'Valid due date is required' });
      }
      
      // Check if any subtasks would violate the date constraint
      const subtasks = db.prepare('SELECT * FROM subtasks WHERE parent_task_id = ?').all(id);
      const newDueDate = new Date(due_date);
      for (const subtask of subtasks) {
        if (new Date(subtask.due_date) > newDueDate) {
          return res.status(400).json({ error: 'Due date cannot be earlier than subtask due dates' });
        }
      }
      
      updates.push('due_date = ?');
      values.push(due_date);
    }
    
    if (finished !== undefined) {
      updates.push('finished = ?');
      values.push(finished ? 1 : 0);
    }
    
    if (updates.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }
    
    values.push(id);
    db.prepare(`UPDATE tasks SET ${updates.join(', ')} WHERE id = ?`).run(...values);
    
    const updatedTask = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
    const subtasks = db.prepare('SELECT * FROM subtasks WHERE parent_task_id = ?').all(id);
    
    res.json({
      ...updatedTask,
      finished: Boolean(updatedTask.finished),
      subtasks: subtasks.map(st => ({
        ...st,
        finished: Boolean(st.finished)
      }))
    });
  } catch (error) {
    console.error('Error updating task:', error);
    res.status(500).json({ error: 'Failed to update task' });
  }
});

// Delete a task
app.delete('/api/tasks/:id', (req, res) => {
  try {
    const { id } = req.params;
    
    const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    db.prepare('DELETE FROM subtasks WHERE parent_task_id = ?').run(id);
    db.prepare('DELETE FROM tasks WHERE id = ?').run(id);
    
    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    console.error('Error deleting task:', error);
    res.status(500).json({ error: 'Failed to delete task' });
  }
});

// Create a subtask
app.post('/api/tasks/:id/subtasks', (req, res) => {
  try {
    const { id } = req.params;
    const { title, due_date } = req.body;
    
    const parentTask = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
    if (!parentTask) {
      return res.status(404).json({ error: 'Parent task not found' });
    }
    
    if (!title || typeof title !== 'string' || title.trim() === '') {
      return res.status(400).json({ error: 'Subtask title is required' });
    }
    
    if (!due_date || !isValidDate(due_date)) {
      return res.status(400).json({ error: 'Valid due date is required' });
    }
    
    // Validate that subtask due date is not after parent task due date
    const parentDueDate = new Date(parentTask.due_date);
    const subtaskDueDate = new Date(due_date);
    
    if (subtaskDueDate > parentDueDate) {
      return res.status(400).json({ error: 'Subtask due date must be less than or equal to parent task due date' });
    }
    
    const result = db.prepare('INSERT INTO subtasks (parent_task_id, title, due_date) VALUES (?, ?, ?)')
      .run(id, title, due_date);
    const subtaskId = result.lastInsertRowid;
    
    const newSubtask = db.prepare('SELECT * FROM subtasks WHERE id = ?').get(subtaskId);
    res.status(201).json({
      ...newSubtask,
      finished: Boolean(newSubtask.finished)
    });
  } catch (error) {
    console.error('Error creating subtask:', error);
    res.status(500).json({ error: 'Failed to create subtask' });
  }
});

// Update a subtask
app.put('/api/subtasks/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { title, due_date, finished } = req.body;
    
    const subtask = db.prepare('SELECT * FROM subtasks WHERE id = ?').get(id);
    if (!subtask) {
      return res.status(404).json({ error: 'Subtask not found' });
    }
    
    const parentTask = db.prepare('SELECT * FROM tasks WHERE id = ?').get(subtask.parent_task_id);
    
    const updates = [];
    const values = [];
    
    if (title !== undefined) {
      if (typeof title !== 'string' || title.trim() === '') {
        return res.status(400).json({ error: 'Subtask title cannot be empty' });
      }
      updates.push('title = ?');
      values.push(title);
    }
    
    if (due_date !== undefined) {
      if (!isValidDate(due_date)) {
        return res.status(400).json({ error: 'Valid due date is required' });
      }
      
      const parentDueDate = new Date(parentTask.due_date);
      const newDueDate = new Date(due_date);
      
      if (newDueDate > parentDueDate) {
        return res.status(400).json({ error: 'Subtask due date must be less than or equal to parent task due date' });
      }
      
      updates.push('due_date = ?');
      values.push(due_date);
    }
    
    if (finished !== undefined) {
      updates.push('finished = ?');
      values.push(finished ? 1 : 0);
    }
    
    if (updates.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }
    
    values.push(id);
    db.prepare(`UPDATE subtasks SET ${updates.join(', ')} WHERE id = ?`).run(...values);
    
    const updatedSubtask = db.prepare('SELECT * FROM subtasks WHERE id = ?').get(id);
    res.json({
      ...updatedSubtask,
      finished: Boolean(updatedSubtask.finished)
    });
  } catch (error) {
    console.error('Error updating subtask:', error);
    res.status(500).json({ error: 'Failed to update subtask' });
  }
});

// Delete a subtask
app.delete('/api/subtasks/:id', (req, res) => {
  try {
    const { id } = req.params;
    
    const subtask = db.prepare('SELECT * FROM subtasks WHERE id = ?').get(id);
    if (!subtask) {
      return res.status(404).json({ error: 'Subtask not found' });
    }
    
    db.prepare('DELETE FROM subtasks WHERE id = ?').run(id);
    
    res.json({ message: 'Subtask deleted successfully' });
  } catch (error) {
    console.error('Error deleting subtask:', error);
    res.status(500).json({ error: 'Failed to delete subtask' });
  }
});

module.exports = { app, db };