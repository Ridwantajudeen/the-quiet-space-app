import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  addSharedTask,
  deleteSharedTask,
  getSharedTasks,
  updateSharedTask,
} from '../features/planner/sharedTaskService';

export const useSharedTasks = ({ spaceId, userId }) => {
  return useQuery({
    queryKey: ['shared-tasks', spaceId],
    queryFn: () => getSharedTasks({ spaceId, userId }),
    enabled: !!spaceId && !!userId,
  });
};

export const useAddSharedTask = ({ spaceId, userId }) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload) => addSharedTask({ spaceId, userId, payload }),
    onSuccess: () => {
      queryClient.invalidateQueries(['shared-tasks', spaceId]);
    },
  });
};

export const useUpdateSharedTask = ({ spaceId, userId }) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, payload }) => updateSharedTask({ taskId, userId, payload }),
    onSuccess: () => {
      queryClient.invalidateQueries(['shared-tasks', spaceId]);
    },
  });
};

export const useDeleteSharedTask = ({ spaceId, userId }) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId }) => deleteSharedTask({ taskId, userId }),
    onSuccess: () => {
      queryClient.invalidateQueries(['shared-tasks', spaceId]);
    },
  });
};
