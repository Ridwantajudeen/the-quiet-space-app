import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getProfile, updateProfile } from '../features/profile/profileService';

export const useProfile = (userId) => {
  return useQuery({
    queryKey: ['profile', userId],
    queryFn: () => getProfile(userId),
    enabled: !!userId,
  });
};

export const useUpdateProfile = (userId) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload) => updateProfile({ userId, ...payload }),
    onSuccess: (data) => {
      queryClient.setQueryData(['profile', userId], data);
    },
  });
};
