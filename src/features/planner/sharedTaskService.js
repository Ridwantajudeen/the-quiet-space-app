import { apiRequest } from '../../services/api';

export const getSharedTasks = async ({ spaceId, userId }) => {
  return apiRequest(
    `/shared-tasks?spaceId=${encodeURIComponent(spaceId)}&userId=${encodeURIComponent(userId)}`
  );
};

export const addSharedTask = async ({ spaceId, userId, payload }) => {
  return apiRequest('/shared-tasks', {
    method: 'POST',
    body: { spaceId, userId, ...payload },
  });
};

export const updateSharedTask = async ({ taskId, userId, payload }) => {
  return apiRequest(`/shared-tasks/${taskId}`, {
    method: 'PATCH',
    body: { userId, ...payload },
  });
};

export const deleteSharedTask = async ({ taskId, userId }) => {
  return apiRequest(`/shared-tasks/${taskId}`, {
    method: 'DELETE',
    body: { userId },
  });
};
