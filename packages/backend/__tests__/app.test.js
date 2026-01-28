const request = require('supertest');
const { app, db } = require('../src/app');

// Close the database connection after all tests
afterAll(() => {
  if (db) {
    db.close();
  }
});

describe('Task API Endpoints', () => {
  describe('GET /api/tasks', () => {
    it('should return all tasks with subtasks', async () => {
      const response = await request(app).get('/api/tasks');
      
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      
      // Check if tasks have the expected structure
      if (response.body.length > 0) {
        const task = response.body[0];
        expect(task).toHaveProperty('id');
        expect(task).toHaveProperty('title');
        expect(task).toHaveProperty('due_date');
        expect(task).toHaveProperty('finished');
        expect(task).toHaveProperty('subtasks');
        expect(Array.isArray(task.subtasks)).toBe(true);
      }
    });

    it('should sort tasks by due date when requested', async () => {
      // Create tasks with different due dates
      await request(app)
        .post('/api/tasks')
        .send({ title: 'Task 1', due_date: '2026-02-01' });
      
      await request(app)
        .post('/api/tasks')
        .send({ title: 'Task 2', due_date: '2026-01-30' });
      
      const response = await request(app).get('/api/tasks?sort=due_date');
      
      expect(response.status).toBe(200);
      expect(response.body.length).toBeGreaterThanOrEqual(2);
      
      // Check that tasks are sorted by due date
      for (let i = 0; i < response.body.length - 1; i++) {
        const currentDate = new Date(response.body[i].due_date);
        const nextDate = new Date(response.body[i + 1].due_date);
        expect(currentDate.getTime()).toBeLessThanOrEqual(nextDate.getTime());
      }
    });
  });

  describe('POST /api/tasks', () => {
    it('should create a new task', async () => {
      const newTask = { 
        title: 'Test Task',
        due_date: '2026-02-01'
      };
      
      const response = await request(app)
        .post('/api/tasks')
        .send(newTask)
        .set('Accept', 'application/json');
      
      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.title).toBe(newTask.title);
      expect(response.body.due_date).toBe(newTask.due_date);
      expect(response.body.finished).toBe(false);
      expect(response.body.subtasks).toEqual([]);
    });

    it('should return 400 if title is missing', async () => {
      const response = await request(app)
        .post('/api/tasks')
        .send({ due_date: '2026-02-01' })
        .set('Accept', 'application/json');
      
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('Task title is required');
    });

    it('should return 400 if due_date is missing', async () => {
      const response = await request(app)
        .post('/api/tasks')
        .send({ title: 'Test Task' })
        .set('Accept', 'application/json');
      
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('Valid due date is required');
    });

    it('should return 400 if due_date is invalid', async () => {
      const response = await request(app)
        .post('/api/tasks')
        .send({ title: 'Test Task', due_date: 'invalid-date' })
        .set('Accept', 'application/json');
      
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('PUT /api/tasks/:id', () => {
    it('should update a task title', async () => {
      // Create a task first
      const createResponse = await request(app)
        .post('/api/tasks')
        .send({ title: 'Original Title', due_date: '2026-02-01' });
      
      const taskId = createResponse.body.id;
      
      // Update the task
      const updateResponse = await request(app)
        .put(`/api/tasks/${taskId}`)
        .send({ title: 'Updated Title' })
        .set('Accept', 'application/json');
      
      expect(updateResponse.status).toBe(200);
      expect(updateResponse.body.title).toBe('Updated Title');
    });

    it('should mark a task as finished', async () => {
      // Create a task
      const createResponse = await request(app)
        .post('/api/tasks')
        .send({ title: 'Task to Finish', due_date: '2026-02-01' });
      
      const taskId = createResponse.body.id;
      
      // Mark as finished
      const updateResponse = await request(app)
        .put(`/api/tasks/${taskId}`)
        .send({ finished: true })
        .set('Accept', 'application/json');
      
      expect(updateResponse.status).toBe(200);
      expect(updateResponse.body.finished).toBe(true);
    });

    it('should return 404 if task does not exist', async () => {
      const response = await request(app)
        .put('/api/tasks/99999')
        .send({ title: 'Updated Title' })
        .set('Accept', 'application/json');
      
      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Task not found');
    });

    it('should prevent updating due date if it violates subtask constraints', async () => {
      // Create a task
      const taskResponse = await request(app)
        .post('/api/tasks')
        .send({ title: 'Parent Task', due_date: '2026-03-01' });
      
      const taskId = taskResponse.body.id;
      
      // Add a subtask with later due date
      await request(app)
        .post(`/api/tasks/${taskId}/subtasks`)
        .send({ title: 'Subtask', due_date: '2026-02-25' });
      
      // Try to update parent task due date to before subtask
      const updateResponse = await request(app)
        .put(`/api/tasks/${taskId}`)
        .send({ due_date: '2026-02-20' })
        .set('Accept', 'application/json');
      
      expect(updateResponse.status).toBe(400);
      expect(updateResponse.body.error).toContain('subtask');
    });
  });

  describe('DELETE /api/tasks/:id', () => {
    it('should delete a task', async () => {
      // Create a task
      const createResponse = await request(app)
        .post('/api/tasks')
        .send({ title: 'Task to Delete', due_date: '2026-02-01' });
      
      const taskId = createResponse.body.id;
      
      // Delete the task
      const deleteResponse = await request(app)
        .delete(`/api/tasks/${taskId}`);
      
      expect(deleteResponse.status).toBe(200);
      expect(deleteResponse.body.message).toBe('Task deleted successfully');
      
      // Verify task is deleted
      const getResponse = await request(app).get('/api/tasks');
      const deletedTask = getResponse.body.find(t => t.id === taskId);
      expect(deletedTask).toBeUndefined();
    });

    it('should return 404 if task does not exist', async () => {
      const response = await request(app)
        .delete('/api/tasks/99999');
      
      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Task not found');
    });

    it('should delete subtasks when parent task is deleted', async () => {
      // Create a task
      const taskResponse = await request(app)
        .post('/api/tasks')
        .send({ title: 'Parent Task', due_date: '2026-03-01' });
      
      const taskId = taskResponse.body.id;
      
      // Add a subtask
      await request(app)
        .post(`/api/tasks/${taskId}/subtasks`)
        .send({ title: 'Subtask', due_date: '2026-02-25' });
      
      // Delete parent task
      await request(app).delete(`/api/tasks/${taskId}`);
      
      // Verify both are deleted
      const getResponse = await request(app).get('/api/tasks');
      const deletedTask = getResponse.body.find(t => t.id === taskId);
      expect(deletedTask).toBeUndefined();
    });
  });

  describe('POST /api/tasks/:id/subtasks', () => {
    it('should create a subtask', async () => {
      // Create a parent task
      const taskResponse = await request(app)
        .post('/api/tasks')
        .send({ title: 'Parent Task', due_date: '2026-03-01' });
      
      const taskId = taskResponse.body.id;
      
      // Create a subtask
      const subtaskResponse = await request(app)
        .post(`/api/tasks/${taskId}/subtasks`)
        .send({ title: 'Subtask', due_date: '2026-02-25' })
        .set('Accept', 'application/json');
      
      expect(subtaskResponse.status).toBe(201);
      expect(subtaskResponse.body).toHaveProperty('id');
      expect(subtaskResponse.body.title).toBe('Subtask');
      expect(subtaskResponse.body.due_date).toBe('2026-02-25');
      expect(subtaskResponse.body.parent_task_id).toBe(taskId);
    });

    it('should return 404 if parent task does not exist', async () => {
      const response = await request(app)
        .post('/api/tasks/99999/subtasks')
        .send({ title: 'Subtask', due_date: '2026-02-25' })
        .set('Accept', 'application/json');
      
      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Parent task not found');
    });

    it('should return 400 if subtask due date is after parent due date', async () => {
      // Create a parent task
      const taskResponse = await request(app)
        .post('/api/tasks')
        .send({ title: 'Parent Task', due_date: '2026-02-20' });
      
      const taskId = taskResponse.body.id;
      
      // Try to create subtask with later due date
      const subtaskResponse = await request(app)
        .post(`/api/tasks/${taskId}/subtasks`)
        .send({ title: 'Subtask', due_date: '2026-02-25' })
        .set('Accept', 'application/json');
      
      expect(subtaskResponse.status).toBe(400);
      expect(subtaskResponse.body.error).toContain('less than or equal to parent task due date');
    });

    it('should allow subtask with same due date as parent', async () => {
      // Create a parent task
      const taskResponse = await request(app)
        .post('/api/tasks')
        .send({ title: 'Parent Task', due_date: '2026-02-20' });
      
      const taskId = taskResponse.body.id;
      
      // Create subtask with same due date
      const subtaskResponse = await request(app)
        .post(`/api/tasks/${taskId}/subtasks`)
        .send({ title: 'Subtask', due_date: '2026-02-20' })
        .set('Accept', 'application/json');
      
      expect(subtaskResponse.status).toBe(201);
    });
  });

  describe('PUT /api/subtasks/:id', () => {
    it('should update a subtask', async () => {
      // Create parent and subtask
      const taskResponse = await request(app)
        .post('/api/tasks')
        .send({ title: 'Parent Task', due_date: '2026-03-01' });
      
      const taskId = taskResponse.body.id;
      
      const subtaskResponse = await request(app)
        .post(`/api/tasks/${taskId}/subtasks`)
        .send({ title: 'Original Subtask', due_date: '2026-02-25' });
      
      const subtaskId = subtaskResponse.body.id;
      
      // Update subtask
      const updateResponse = await request(app)
        .put(`/api/subtasks/${subtaskId}`)
        .send({ title: 'Updated Subtask' })
        .set('Accept', 'application/json');
      
      expect(updateResponse.status).toBe(200);
      expect(updateResponse.body.title).toBe('Updated Subtask');
    });

    it('should mark a subtask as finished', async () => {
      // Create parent and subtask
      const taskResponse = await request(app)
        .post('/api/tasks')
        .send({ title: 'Parent Task', due_date: '2026-03-01' });
      
      const taskId = taskResponse.body.id;
      
      const subtaskResponse = await request(app)
        .post(`/api/tasks/${taskId}/subtasks`)
        .send({ title: 'Subtask', due_date: '2026-02-25' });
      
      const subtaskId = subtaskResponse.body.id;
      
      // Mark as finished
      const updateResponse = await request(app)
        .put(`/api/subtasks/${subtaskId}`)
        .send({ finished: true })
        .set('Accept', 'application/json');
      
      expect(updateResponse.status).toBe(200);
      expect(updateResponse.body.finished).toBe(true);
    });

    it('should return 404 if subtask does not exist', async () => {
      const response = await request(app)
        .put('/api/subtasks/99999')
        .send({ title: 'Updated' })
        .set('Accept', 'application/json');
      
      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Subtask not found');
    });

    it('should prevent updating due date to after parent due date', async () => {
      // Create parent and subtask
      const taskResponse = await request(app)
        .post('/api/tasks')
        .send({ title: 'Parent Task', due_date: '2026-02-20' });
      
      const taskId = taskResponse.body.id;
      
      const subtaskResponse = await request(app)
        .post(`/api/tasks/${taskId}/subtasks`)
        .send({ title: 'Subtask', due_date: '2026-02-15' });
      
      const subtaskId = subtaskResponse.body.id;
      
      // Try to update to invalid date
      const updateResponse = await request(app)
        .put(`/api/subtasks/${subtaskId}`)
        .send({ due_date: '2026-02-25' })
        .set('Accept', 'application/json');
      
      expect(updateResponse.status).toBe(400);
      expect(updateResponse.body.error).toContain('less than or equal to parent task due date');
    });
  });

  describe('DELETE /api/subtasks/:id', () => {
    it('should delete a subtask', async () => {
      // Create parent and subtask
      const taskResponse = await request(app)
        .post('/api/tasks')
        .send({ title: 'Parent Task', due_date: '2026-03-01' });
      
      const taskId = taskResponse.body.id;
      
      const subtaskResponse = await request(app)
        .post(`/api/tasks/${taskId}/subtasks`)
        .send({ title: 'Subtask to Delete', due_date: '2026-02-25' });
      
      const subtaskId = subtaskResponse.body.id;
      
      // Delete subtask
      const deleteResponse = await request(app)
        .delete(`/api/subtasks/${subtaskId}`);
      
      expect(deleteResponse.status).toBe(200);
      expect(deleteResponse.body.message).toBe('Subtask deleted successfully');
      
      // Verify subtask is deleted
      const taskCheckResponse = await request(app).get('/api/tasks');
      const parentTask = taskCheckResponse.body.find(t => t.id === taskId);
      expect(parentTask.subtasks).toHaveLength(0);
    });

    it('should return 404 if subtask does not exist', async () => {
      const response = await request(app)
        .delete('/api/subtasks/99999');
      
      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Subtask not found');
    });
  });
});