import { apiRequest } from '../../services/api';

export const getTasks = async (userId) => {
  return apiRequest(`/tasks?userId=${encodeURIComponent(userId)}`);
};

export const addTask = async (userId, payload) => {
  return apiRequest('/tasks', {
    method: 'POST',
    body: { userId, ...payload },
  });
};

export const updateTask = async (taskId, payload) => {
  return apiRequest(`/tasks/${taskId}`, {
    method: 'PATCH',
    body: payload,
  });
};

export const deleteTask = async (taskId) => {
  return apiRequest(`/tasks/${taskId}`, {
    method: 'DELETE',
  });
};
