import { useQuery } from "@tanstack/react-query";
import { getAvailableVideo } from "../features/video/videoService";

export const useDailyVideo = (userId) => {
  return useQuery({
    queryKey: ["daily-video", userId],
    queryFn: () => getAvailableVideo(userId),
    enabled: !!userId,
  });
};
