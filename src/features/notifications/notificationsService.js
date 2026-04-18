import { apiRequest } from '../../services/api';

export const getSharedInvites = async (userId) => {
  return apiRequest(`/shared-invites?userId=${encodeURIComponent(userId)}`);
};

export const acceptInvite = async ({ inviteId, userId }) => {
  return apiRequest(`/shared-invites/${inviteId}/accept`, {
    method: 'POST',
    body: { userId },
  });
};

export const declineInvite = async ({ inviteId, userId }) => {
  return apiRequest(`/shared-invites/${inviteId}/decline`, {
    method: 'POST',
    body: { userId },
  });
};
