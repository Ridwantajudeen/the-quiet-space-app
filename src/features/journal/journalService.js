import { apiRequest } from '../../services/api';

export const addJournalEntry = async (userId, text, voiceUrls = []) => {
  return apiRequest('/journal', {
    method: 'POST',
    body: { userId, text, voiceUrls },
  });
};

export const getJournalEntries = async (userId) => {
  return apiRequest(`/journal?userId=${encodeURIComponent(userId)}`);
};

export const deleteJournalEntry = async (entryId) => {
  return apiRequest(`/journal/${entryId}`, {
    method: 'DELETE',
  });
};

export const updateJournalEntry = async (entryId, payload) => {
  return apiRequest(`/journal/${entryId}`, {
    method: 'PATCH',
    body: payload,
  });
};
