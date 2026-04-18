import { apiRequest } from "../../services/api";

export const getAvailableVideo = async (userId) => {
  if (!userId) return null;
  return apiRequest(`/videos/available?userId=${encodeURIComponent(userId)}`);
};
