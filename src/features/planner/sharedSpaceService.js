import { apiRequest } from '../../services/api';

export const getSharedSpaces = async (userId) => {
  return apiRequest(`/shared-spaces?userId=${encodeURIComponent(userId)}`);
};

export const createSharedSpace = async ({ userId, name }) => {
  return apiRequest('/shared-spaces', {
    method: 'POST',
    body: { userId, name },
  });
};

export const inviteSharedMember = async ({ spaceId, email, userId }) => {
  return apiRequest(`/shared-spaces/${spaceId}/invite`, {
    method: 'POST',
    body: { email, userId },
  });
};
