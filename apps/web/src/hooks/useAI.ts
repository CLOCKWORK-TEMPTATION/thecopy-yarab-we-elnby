import { useMutation } from "@tanstack/react-query";
import * as api from "@/lib/api";

export function useChatWithAI() {
  return useMutation({
    mutationFn: ({
      message,
      history,
    }: {
      message: string;
      history: Array<{ role: string; content: string }>;
    }) =>
      api
        .chatWithAI(message, undefined, { history })
        .then((response) => response.data),
  });
}

export function useGetShotSuggestion() {
  return useMutation({
    mutationFn: ({
      sceneDescription,
      shotType,
    }: {
      sceneDescription: string;
      shotType: string;
    }) =>
      api
        .getShotSuggestion(sceneDescription, shotType)
        .then((response) => response.data),
  });
}
