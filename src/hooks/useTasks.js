import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { addTask, deleteTask, getTasks, updateTask } from '../features/planner/taskService';

export const useTasks = (userId) => {
  return useQuery({
    queryKey: ['tasks', userId],
    queryFn: () => getTasks(userId),
    enabled: !!userId,
  });
};

export const useAddTask = (userId) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload) => addTask(userId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries(['tasks', userId]);
    },
  });
};

export const useUpdateTask = (userId) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, payload }) => updateTask(taskId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries(['tasks', userId]);
    },
  });
};

export const useDeleteTask = (userId) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (taskId) => deleteTask(taskId),
    onSuccess: () => {
      queryClient.invalidateQueries(['tasks', userId]);
    },
  });
};
