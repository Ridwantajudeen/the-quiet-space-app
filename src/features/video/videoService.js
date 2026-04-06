import { apiRequest } from "../../services/api";

export const getDailyVideo = async (date) => {
  if (!date) return null;
  return apiRequest(`/videos?date=${encodeURIComponent(date)}`);
};
