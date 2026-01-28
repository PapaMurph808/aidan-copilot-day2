import React, { act } from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { rest } from 'msw';
import { setupServer } from 'msw/node';
import App from '../App';

// Mock tasks data
const mockTasks = [
  {
    id: 1,
    title: 'Task 1',
    due_date: '2026-02-15',
    finished: false,
    subtasks: [
      {
        id: 1,
        parent_task_id: 1,
        title: 'Subtask 1-1',
        due_date: '2026-02-10',
        finished: false
      }
    ]
  },
  {
    id: 2,
    title: 'Task 2',
    due_date: '2026-02-20',
    finished: true,
    subtasks: []
  },
];

// Mock server to intercept API requests
const server = setupServer(
  // GET /api/tasks handler
  rest.get('/api/tasks', (req, res, ctx) => {
    const sort = req.url.searchParams.get('sort');
    let tasks = [...mockTasks];
    
    if (sort === 'due_date') {
      tasks.sort((a, b) => new Date(a.due_date) - new Date(b.due_date));
    }
    
    return res(ctx.status(200), ctx.json(tasks));
  }),
  
  // POST /api/tasks handler
  rest.post('/api/tasks', async (req, res, ctx) => {
    const { title, due_date } = await req.json();
    
    if (!title || title.trim() === '') {
      return res(
        ctx.status(400),
        ctx.json({ error: 'Task title is required' })
      );
    }
    
    if (!due_date) {
      return res(
        ctx.status(400),
        ctx.json({ error: 'Valid due date is required' })
      );
    }
    
    return res(
      ctx.status(201),
      ctx.json({
        id: 3,
        title,
        due_date,
        finished: false,
        subtasks: [],
      })
    );
  }),
  
  // PUT /api/tasks/:id handler
  rest.put('/api/tasks/:id', async (req, res, ctx) => {
    const { id } = req.params;
    const updates = await req.json();
    
    const task = mockTasks.find(t => t.id === parseInt(id));
    if (!task) {
      return res(ctx.status(404), ctx.json({ error: 'Task not found' }));
    }
    
    return res(
      ctx.status(200),
      ctx.json({
        ...task,
        ...updates,
        finished: updates.finished !== undefined ? updates.finished : task.finished
      })
    );
  }),
  
  // DELETE /api/tasks/:id handler
  rest.delete('/api/tasks/:id', (req, res, ctx) => {
    const { id } = req.params;
    const task = mockTasks.find(t => t.id === parseInt(id));
    
    if (!task) {
      return res(ctx.status(404), ctx.json({ error: 'Task not found' }));
    }
    
    return res(ctx.status(200), ctx.json({ message: 'Task deleted successfully' }));
  }),
  
  // POST /api/tasks/:id/subtasks handler
  rest.post('/api/tasks/:id/subtasks', async (req, res, ctx) => {
    const { id } = req.params;
    const { title, due_date } = await req.json();
    
    const task = mockTasks.find(t => t.id === parseInt(id));
    if (!task) {
      return res(ctx.status(404), ctx.json({ error: 'Parent task not found' }));
    }
    
    if (!title || !due_date) {
      return res(ctx.status(400), ctx.json({ error: 'Title and due date are required' }));
    }
    
    if (new Date(due_date) > new Date(task.due_date)) {
      return res(
        ctx.status(400),
        ctx.json({ error: 'Subtask due date must be less than or equal to parent task due date' })
      );
    }
    
    return res(
      ctx.status(201),
      ctx.json({
        id: 10,
        parent_task_id: parseInt(id),
        title,
        due_date,
        finished: false
      })
    );
  }),
  
  // PUT /api/subtasks/:id handler
  rest.put('/api/subtasks/:id', async (req, res, ctx) => {
    const { id } = req.params;
    const updates = await req.json();
    
    return res(
      ctx.status(200),
      ctx.json({
        id: parseInt(id),
        ...updates,
        parent_task_id: 1
      })
    );
  }),
  
  // DELETE /api/subtasks/:id handler
  rest.delete('/api/subtasks/:id', (req, res, ctx) => {
    return res(ctx.status(200), ctx.json({ message: 'Subtask deleted successfully' }));
  })
);

// Setup and teardown for the mock server
beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('App Component', () => {
  describe('Rendering', () => {
    test('renders the header', async () => {
      await act(async () => {
        render(<App />);
      });
      
      expect(screen.getByText('TODO List Application')).toBeInTheDocument();
      expect(screen.getByText('Manage your tasks and subtasks with due dates')).toBeInTheDocument();
    });

    test('loads and displays tasks', async () => {
      await act(async () => {
        render(<App />);
      });
      
      // Initially shows loading state
      expect(screen.getByText('Loading tasks...')).toBeInTheDocument();
      
      // Wait for tasks to load
      await waitFor(() => {
        expect(screen.getByText('Task 1')).toBeInTheDocument();
        expect(screen.getByText('Task 2')).toBeInTheDocument();
      });
    });

    test('displays subtasks for tasks', async () => {
      await act(async () => {
        render(<App />);
      });
      
      await waitFor(() => {
        expect(screen.getByText('Subtask 1-1')).toBeInTheDocument();
      });
    });

    test('shows empty state when no tasks', async () => {
      server.use(
        rest.get('/api/tasks', (req, res, ctx) => {
          return res(ctx.status(200), ctx.json([]));
        })
      );
      
      await act(async () => {
        render(<App />);
      });
      
      await waitFor(() => {
        expect(screen.getByText('No tasks found. Add some!')).toBeInTheDocument();
      });
    });
  });

  describe('Task Creation', () => {
    test('adds a new task', async () => {
      const user = userEvent.setup();
      
      await act(async () => {
        render(<App />);
      });
      
      await waitFor(() => {
        expect(screen.queryByText('Loading tasks...')).not.toBeInTheDocument();
      });
      
      // Fill in the form
      const titleInput = screen.getByPlaceholderText('Enter task title');
      const dateInputs = screen.getAllByLabelText('Task due date');
      const dateInput = dateInputs[0];
      
      await act(async () => {
        await user.type(titleInput, 'New Task');
        await user.type(dateInput, '2026-03-01');
      });
      
      const submitButton = screen.getByText('Add Task');
      await act(async () => {
        await user.click(submitButton);
      });
      
      // Form should be cleared after submission
      await waitFor(() => {
        expect(titleInput).toHaveValue('');
      });
    });

    test('handles task creation error', async () => {
      server.use(
        rest.post('/api/tasks', async (req, res, ctx) => {
          return res(ctx.status(400), ctx.json({ error: 'Invalid task data' }));
        })
      );
      
      const user = userEvent.setup();
      
      await act(async () => {
        render(<App />);
      });
      
      await waitFor(() => {
        expect(screen.queryByText('Loading tasks...')).not.toBeInTheDocument();
      });
      
      // Fill in the form to bypass HTML5 validation
      const titleInput = screen.getByPlaceholderText('Enter task title');
      const dateInput = screen.getByLabelText('Task due date');
      
      await act(async () => {
        await user.type(titleInput, 'Test Task');
        await user.type(dateInput, '2026-03-01');
      });
      
      const submitButton = screen.getByText('Add Task');
      await act(async () => {
        await user.click(submitButton);
      });
      
      // Wait for error message to appear
      await waitFor(() => {
        expect(screen.getByText(/Error adding task/i)).toBeInTheDocument();
      }, { timeout: 3000 });
    });
  });

  describe('Task Editing', () => {
    test('edits a task', async () => {
      const user = userEvent.setup();
      
      await act(async () => {
        render(<App />);
      });
      
      await waitFor(() => {
        expect(screen.getByText('Task 1')).toBeInTheDocument();
      });
      
      // Click edit button
      const editButtons = screen.getAllByText('Edit');
      await act(async () => {
        await user.click(editButtons[0]);
      });
      
      // Should show edit form
      const titleInput = screen.getAllByDisplayValue('Task 1')[0];
      expect(titleInput).toBeInTheDocument();
      
      // Modify title
      await act(async () => {
        await user.clear(titleInput);
        await user.type(titleInput, 'Updated Task 1');
      });
      
      // Click save
      const saveButton = screen.getByText('Save');
      await act(async () => {
        await user.click(saveButton);
      });
      
      // Should hide edit form
      await waitFor(() => {
        expect(screen.queryByText('Save')).not.toBeInTheDocument();
      });
    });

    test('cancels task editing', async () => {
      const user = userEvent.setup();
      
      await act(async () => {
        render(<App />);
      });
      
      await waitFor(() => {
        expect(screen.getByText('Task 1')).toBeInTheDocument();
      });
      
      // Click edit button
      const editButtons = screen.getAllByText('Edit');
      await act(async () => {
        await user.click(editButtons[0]);
      });
      
      // Click cancel
      const cancelButton = screen.getAllByText('Cancel')[0];
      await act(async () => {
        await user.click(cancelButton);
      });
      
      // Should hide edit form
      await waitFor(() => {
        expect(screen.queryByText('Save')).not.toBeInTheDocument();
      });
    });
  });

  describe('Task Completion', () => {
    test('marks a task as finished', async () => {
      const user = userEvent.setup();
      
      await act(async () => {
        render(<App />);
      });
      
      await waitFor(() => {
        expect(screen.getByText('Task 1')).toBeInTheDocument();
      });
      
      // Find and click the checkbox for Task 1
      const checkboxes = screen.getAllByRole('checkbox');
      const taskCheckbox = checkboxes.find(cb => !cb.checked);
      
      await act(async () => {
        await user.click(taskCheckbox);
      });
      
      // API should be called (verified by no error)
      await waitFor(() => {
        expect(screen.queryByText(/Error updating task/)).not.toBeInTheDocument();
      });
    });
  });

  describe('Task Deletion', () => {
    test('deletes a task after confirmation', async () => {
      const user = userEvent.setup();
      global.confirm = jest.fn(() => true);
      
      await act(async () => {
        render(<App />);
      });
      
      await waitFor(() => {
        expect(screen.getByText('Task 1')).toBeInTheDocument();
      });
      
      // Click delete button
      const deleteButtons = screen.getAllByText('Delete');
      await act(async () => {
        await user.click(deleteButtons[0]);
      });
      
      expect(global.confirm).toHaveBeenCalled();
    });

    test('cancels task deletion', async () => {
      const user = userEvent.setup();
      global.confirm = jest.fn(() => false);
      
      await act(async () => {
        render(<App />);
      });
      
      await waitFor(() => {
        expect(screen.getByText('Task 1')).toBeInTheDocument();
      });
      
      // Click delete button
      const deleteButtons = screen.getAllByText('Delete');
      await act(async () => {
        await user.click(deleteButtons[0]);
      });
      
      expect(global.confirm).toHaveBeenCalled();
      // Task should still be there
      expect(screen.getByText('Task 1')).toBeInTheDocument();
    });
  });

  describe('Subtask Management', () => {
    test('shows add subtask form', async () => {
      const user = userEvent.setup();
      
      await act(async () => {
        render(<App />);
      });
      
      await waitFor(() => {
        expect(screen.getByText('Task 1')).toBeInTheDocument();
      });
      
      // Click add subtask button
      const addSubtaskButton = screen.getAllByText('Add Subtask')[0];
      await act(async () => {
        await user.click(addSubtaskButton);
      });
      
      // Should show subtask form
      expect(screen.getByPlaceholderText('Subtask title')).toBeInTheDocument();
    });

    test('creates a subtask', async () => {
      const user = userEvent.setup();
      
      await act(async () => {
        render(<App />);
      });
      
      await waitFor(() => {
        expect(screen.getByText('Task 1')).toBeInTheDocument();
      });
      
      // Click add subtask button
      const addSubtaskButton = screen.getAllByText('Add Subtask')[0];
      await act(async () => {
        await user.click(addSubtaskButton);
      });
      
      // Fill in subtask form
      const titleInput = screen.getByPlaceholderText('Subtask title');
      const dateInputs = screen.getAllByLabelText(/due date/i);
      const subtaskDateInput = dateInputs[dateInputs.length - 1];
      
      await act(async () => {
        await user.type(titleInput, 'New Subtask');
        await user.type(subtaskDateInput, '2026-02-10');
      });
      
      // Click add button
      const addButton = screen.getByText('Add');
      await act(async () => {
        await user.click(addButton);
      });
      
      // Form should be hidden
      await waitFor(() => {
        expect(screen.queryByPlaceholderText('Subtask title')).not.toBeInTheDocument();
      });
    });

    test('deletes a subtask', async () => {
      const user = userEvent.setup();
      global.confirm = jest.fn(() => true);
      
      await act(async () => {
        render(<App />);
      });
      
      await waitFor(() => {
        expect(screen.getByText('Subtask 1-1')).toBeInTheDocument();
      });
      
      // Click delete on subtask
      const deleteButtons = screen.getAllByText('Delete');
      const subtaskDeleteButton = deleteButtons[deleteButtons.length - 1];
      
      await act(async () => {
        await user.click(subtaskDeleteButton);
      });
      
      expect(global.confirm).toHaveBeenCalled();
    });
  });

  describe('Task Sorting', () => {
    test('sorts tasks by due date', async () => {
      const user = userEvent.setup();
      
      await act(async () => {
        render(<App />);
      });
      
      await waitFor(() => {
        expect(screen.getByText('Task 1')).toBeInTheDocument();
      });
      
      // Find and click sort checkbox
      const sortCheckbox = screen.getByLabelText(/Sort by due date/i);
      await act(async () => {
        await user.click(sortCheckbox);
      });
      
      // Tasks should still be displayed (API was called)
      await waitFor(() => {
        expect(screen.getByText('Task 1')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    test('handles API error on initial load', async () => {
      server.use(
        rest.get('/api/tasks', (req, res, ctx) => {
          return res(ctx.status(500));
        })
      );
      
      await act(async () => {
        render(<App />);
      });
      
      await waitFor(() => {
        expect(screen.getByText(/Failed to fetch tasks/)).toBeInTheDocument();
      });
    });

    test('displays error messages in error state', async () => {
      server.use(
        rest.get('/api/tasks', (req, res, ctx) => {
          return res(ctx.status(500));
        })
      );
      
      await act(async () => {
        render(<App />);
      });
      
      await waitFor(() => {
        const errorElement = screen.getByText(/Failed to fetch tasks/);
        expect(errorElement).toHaveClass('error');
      });
    });
  });
});