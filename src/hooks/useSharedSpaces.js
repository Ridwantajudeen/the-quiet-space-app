import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createSharedSpace,
  deleteSharedSpace,
  getSharedSpaceMembers,
  getSharedSpaces,
  inviteSharedMember,
  leaveSharedSpace,
  removeSharedSpaceMember,
} from '../features/planner/sharedSpaceService';

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

export const useSharedSpaceMembers = ({ spaceId, userId }) => {
  return useQuery({
    queryKey: ['shared-space-members', spaceId, userId],
    queryFn: () => getSharedSpaceMembers({ spaceId, userId }),
    enabled: !!spaceId && !!userId,
  });
};

export const useRemoveSharedSpaceMember = (userId) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ spaceId, memberId }) => removeSharedSpaceMember({ spaceId, memberId }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries(['shared-spaces', userId]);
      queryClient.invalidateQueries(['shared-space-members', variables?.spaceId, userId]);
    },
  });
};

export const useLeaveSharedSpace = (userId) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ spaceId }) => leaveSharedSpace({ spaceId }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries(['shared-spaces', userId]);
      queryClient.invalidateQueries(['shared-space-members', variables?.spaceId, userId]);
    },
  });
};

export const useDeleteSharedSpace = (userId) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ spaceId }) => deleteSharedSpace({ spaceId }),
    onSuccess: () => {
      queryClient.invalidateQueries(['shared-spaces', userId]);
      queryClient.invalidateQueries(['shared-space-members']);
    },
  });
};
