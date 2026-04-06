// src/features/mood/moodService.js

import { apiRequest } from "../../services/api";

export const addMoodEntry = async (userId, value, note = "") => {
  return apiRequest("/moods", {
    method: "POST",
    body: { userId, value, note },
  });
};

export const getMoods = async (userId) => {
  return apiRequest(`/moods?userId=${encodeURIComponent(userId)}`);
};
