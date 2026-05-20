import { apiRequest } from '../../services/api';

export const getSharedJournalEntries = async ({ spaceId, userId }) => {
  return apiRequest(
    `/shared-journal?spaceId=${encodeURIComponent(spaceId)}&userId=${encodeURIComponent(userId)}`
  );
};

export const addSharedJournalEntry = async ({ spaceId, userId, text, voiceUrls = [] }) => {
  return apiRequest('/shared-journal', {
    method: 'POST',
    body: { spaceId, userId, text, voiceUrls },
  });
};

export const updateSharedJournalEntry = async ({ entryId, userId, text, voiceUrls = [] }) => {
  return apiRequest(`/shared-journal/${entryId}`, {
    method: 'PATCH',
    body: { userId, text, voiceUrls },
  });
};

export const deleteSharedJournalEntry = async ({ entryId, userId }) => {
  return apiRequest(`/shared-journal/${entryId}`, {
    method: 'DELETE',
    body: { userId },
  });
};
