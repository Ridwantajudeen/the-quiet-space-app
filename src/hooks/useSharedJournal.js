import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  addSharedJournalEntry,
  deleteSharedJournalEntry,
  getSharedJournalEntries,
  updateSharedJournalEntry,
} from '../features/planner/sharedJournalService';

export const useSharedJournal = ({ spaceId, userId }) => {
  return useQuery({
    queryKey: ['shared-journal', spaceId, userId],
    queryFn: () => getSharedJournalEntries({ spaceId, userId }),
    enabled: !!spaceId && !!userId,
  });
};

export const useAddSharedJournalEntry = ({ spaceId, userId }) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ text, voiceUrls = [] }) =>
      addSharedJournalEntry({ spaceId, userId, text, voiceUrls }),
    onSuccess: () => {
      queryClient.invalidateQueries(['shared-journal', spaceId, userId]);
    },
  });
};

export const useUpdateSharedJournalEntry = ({ spaceId, userId }) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ entryId, text, voiceUrls = [] }) =>
      updateSharedJournalEntry({ entryId, userId, text, voiceUrls }),
    onSuccess: () => {
      queryClient.invalidateQueries(['shared-journal', spaceId, userId]);
    },
  });
};

export const useDeleteSharedJournalEntry = ({ spaceId, userId }) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (entryId) => deleteSharedJournalEntry({ entryId, userId }),
    onSuccess: () => {
      queryClient.invalidateQueries(['shared-journal', spaceId, userId]);
    },
  });
};
