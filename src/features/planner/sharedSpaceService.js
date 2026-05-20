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

export const getSharedSpaceMembers = async ({ spaceId, userId }) => {
  return apiRequest(`/shared-spaces/${spaceId}/members?userId=${encodeURIComponent(userId)}`);
};

export const removeSharedSpaceMember = async ({ spaceId, memberId }) => {
  return apiRequest(`/shared-spaces/${spaceId}/members/${memberId}`, {
    method: 'DELETE',
  });
};

export const leaveSharedSpace = async ({ spaceId }) => {
  return apiRequest(`/shared-spaces/${spaceId}/leave`, {
    method: 'POST',
  });
};

export const deleteSharedSpace = async ({ spaceId }) => {
  return apiRequest(`/shared-spaces/${spaceId}`, {
    method: 'DELETE',
  });
};
