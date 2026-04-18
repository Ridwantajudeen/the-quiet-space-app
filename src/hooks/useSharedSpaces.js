import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createSharedSpace, getSharedSpaces, inviteSharedMember } from '../features/planner/sharedSpaceService';

export const useSharedSpaces = (userId) => {
  return useQuery({
    queryKey: ['shared-spaces', userId],
    queryFn: () => getSharedSpaces(userId),
    enabled: !!userId,
  });
};

export const useCreateSharedSpace = (userId) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ name }) => createSharedSpace({ userId, name }),
    onSuccess: () => {
      queryClient.invalidateQueries(['shared-spaces', userId]);
    },
  });
};

export const useInviteSharedMember = (userId) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ spaceId, email }) => inviteSharedMember({ spaceId, email, userId }),
    onSuccess: () => {
      queryClient.invalidateQueries(['shared-spaces', userId]);
    },
  });
};
