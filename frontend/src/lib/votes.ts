import { useMutation, useQueryClient } from "@tanstack/react-query";
import { mutateApi } from "@/lib/fetch";

export type VoteType = "UP" | "DOWN";

export interface Reply {
  _id: string;
  userId: string;
  replyId?: string;
  replyUserId?: string;
  text: string;
}

export interface Like {
  _id: string;
  userId: string;
}

export interface Vote {
  _id: string;
  userId: string;
  type: VoteType;
  likes: Like[];
  replies: Reply[];
  text?: string;
}

export function useVote() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: ({ type, id }: { type: VoteType | null; id: string }) => {
      return mutateApi("PATCH", `/places/${id}/votes`, { type });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["places"] });
    },
  });

  return mutation;
}
