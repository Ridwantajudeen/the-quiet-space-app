// src/hooks/useMood.js
// Fetches mood entries for a user — used in MoodScreen + InsightsScreen

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getMoods, addMoodEntry } from "../features/mood/moodService";

export const useMood = (userId) => {
  return useQuery({
    queryKey: ["moods", userId],
    queryFn: () => getMoods(userId),
    enabled: !!userId,
  });
};

export const useAddMood = (userId) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ value, note }) => addMoodEntry(userId, value, note),
    onSuccess: () => {
      queryClient.invalidateQueries(["moods", userId]);
    },
  });
};
