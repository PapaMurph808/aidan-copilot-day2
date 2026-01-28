// API utility functions for task management
const API_BASE_URL = '/api';

/**
 * Generic fetch wrapper with error handling
 * @param {string} url - The URL to fetch
 * @param {object} options - Fetch options
 * @returns {Promise<any>} - Response data
 * @throws {Error} - Throws error with message from response or generic message
 */
const apiFetch = async (url, options = {}) => {
  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Request failed with status ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('An unexpected error occurred');
  }
};

/**
 * Fetch all tasks with optional sorting
 * @param {boolean} sortByDate - Whether to sort tasks by due date
 * @returns {Promise<Array>} - Array of tasks
 */
export const fetchTasks = async (sortByDate = false) => {
  const url = sortByDate 
    ? `${API_BASE_URL}/tasks?sort=due_date` 
    : `${API_BASE_URL}/tasks`;
  return apiFetch(url);
};

/**
 * Create a new task
 * @param {object} taskData - Task data with title and due_date
 * @returns {Promise<object>} - Created task
 */
export const createTask = async (taskData) => {
  return apiFetch(`${API_BASE_URL}/tasks`, {
    method: 'POST',
    body: JSON.stringify(taskData),
  });
};

/**
 * Update an existing task
 * @param {number} taskId - Task ID
 * @param {object} updates - Fields to update
 * @returns {Promise<object>} - Updated task
 */
export const updateTask = async (taskId, updates) => {
  return apiFetch(`${API_BASE_URL}/tasks/${taskId}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
};

/**
 * Delete a task
 * @param {number} taskId - Task ID
 * @returns {Promise<object>} - Deletion confirmation
 */
export const deleteTask = async (taskId) => {
  return apiFetch(`${API_BASE_URL}/tasks/${taskId}`, {
    method: 'DELETE',
  });
};

/**
 * Create a subtask for a task
 * @param {number} taskId - Parent task ID
 * @param {object} subtaskData - Subtask data with title and due_date
 * @returns {Promise<object>} - Created subtask
 */
export const createSubtask = async (taskId, subtaskData) => {
  return apiFetch(`${API_BASE_URL}/tasks/${taskId}/subtasks`, {
    method: 'POST',
    body: JSON.stringify(subtaskData),
  });
};

/**
 * Update an existing subtask
 * @param {number} subtaskId - Subtask ID
 * @param {object} updates - Fields to update
 * @returns {Promise<object>} - Updated subtask
 */
export const updateSubtask = async (subtaskId, updates) => {
  return apiFetch(`${API_BASE_URL}/subtasks/${subtaskId}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
};

/**
 * Delete a subtask
 * @param {number} subtaskId - Subtask ID
 * @returns {Promise<object>} - Deletion confirmation
 */
export const deleteSubtask = async (subtaskId) => {
  return apiFetch(`${API_BASE_URL}/subtasks/${subtaskId}`, {
    method: 'DELETE',
  });
};
