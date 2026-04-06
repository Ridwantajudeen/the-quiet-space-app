import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  addJournalEntry,
  getJournalEntries,
  deleteJournalEntry,
  updateJournalEntry,
} from '../features/journal/journalService';

export const useJournal = (userId) => {
  return useQuery({
    queryKey: ['journal', userId],
    queryFn: () => getJournalEntries(userId),
    enabled: !!userId,
  });
};

export const useAddJournalEntry = (userId) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ text, voiceUrls }) => addJournalEntry(userId, text, voiceUrls),
    onSuccess: () => {
      queryClient.invalidateQueries(['journal', userId]);
    },
  });
};

export const useDeleteJournalEntry = (userId) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (entryId) => deleteJournalEntry(entryId),
    onSuccess: () => {
      queryClient.invalidateQueries(['journal', userId]);
    },
  });
};

export const useUpdateJournalEntry = (userId) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ entryId, payload }) => updateJournalEntry(entryId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries(['journal', userId]);
    },
  });
};
