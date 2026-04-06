import { useQuery } from "@tanstack/react-query";
import { getDailyVideo } from "../features/video/videoService";

export const useDailyVideo = (date) => {
  return useQuery({
    queryKey: ["daily-video", date],
    queryFn: () => getDailyVideo(date),
    enabled: !!date,
  });
};
