import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { acceptInvite, declineInvite, getSharedInvites } from '../features/notifications/notificationsService';

export const useSharedInvites = (userId) => {
  return useQuery({
    queryKey: ['shared-invites', userId],
    queryFn: () => getSharedInvites(userId),
    enabled: !!userId,
  });
};

export const useAcceptInvite = (userId) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ inviteId }) => acceptInvite({ inviteId, userId }),
    onSuccess: () => {
      queryClient.invalidateQueries(['shared-invites', userId]);
      queryClient.invalidateQueries(['shared-spaces', userId]);
    },
  });
};

export const useDeclineInvite = (userId) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ inviteId }) => declineInvite({ inviteId, userId }),
    onSuccess: () => {
      queryClient.invalidateQueries(['shared-invites', userId]);
    },
  });
};
