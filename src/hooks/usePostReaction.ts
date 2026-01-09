import { useCallback, useEffect, useRef, useState } from "react";
import { useHttpRequestService } from "../service/HttpRequestService";

export type ReactionType = "like" | "retweet";

export interface ReactionState {
  like: boolean;
  retweet: boolean;
}

export const usePostReaction = (postId: string) => {
  const service = useHttpRequestService();
  const [reaction, setReaction] = useState<ReactionState>({
    like: false,
    retweet: false,
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [updatingType, setUpdatingType] = useState<ReactionType | null>(null);

  const isMountedRef = useRef(true);
  const reactionRef = useRef<ReactionState>(reaction);

  useEffect(() => {
    reactionRef.current = reaction;
  }, [reaction]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const refresh = useCallback(async () => {
    if (!postId) return;

    setIsLoading(true);
    try {
      const [like, retweet] = await Promise.all([
        service.getReaction(postId, "like"),
        service.getReaction(postId, "retweet"),
      ]);

      if (!isMountedRef.current) return;
      setReaction({ like: Boolean(like), retweet: Boolean(retweet) });
    } finally {
      if (isMountedRef.current) setIsLoading(false);
    }
  }, [postId, service]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const hasReacted = useCallback(
    (type: ReactionType) => {
      return reaction[type];
    },
    [reaction]
  );

  const toggle = useCallback(
    async (type: ReactionType) => {
      if (!postId) return;

      setUpdatingType(type);
      const prev = reactionRef.current[type];
      const next = !prev;

      setReaction((current) => ({ ...current, [type]: next }));

      try {
        if (next) {
          await service.createReaction(postId, type);
        } else {
          await service.deleteReaction(postId, type);
        }

        await refresh();
      } catch (e) {
        if (isMountedRef.current) {
          setReaction((current) => ({ ...current, [type]: prev }));
        }
        throw e;
      } finally {
        if (isMountedRef.current) setUpdatingType(null);
      }
    },
    [postId, refresh, service]
  );

  return {
    reaction,
    isLoading,
    updatingType,
    refresh,
    hasReacted,
    toggle,
  };
};
