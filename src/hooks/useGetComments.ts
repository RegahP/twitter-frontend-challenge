import { useEffect, useState } from "react";
import { useHttpRequestService } from "../service/HttpRequestService";
import { setLength, updateFeed } from "../redux/user";
import { useAppDispatch, useAppSelector } from "../redux/hooks";

interface UseGetCommentsProps {
  postId: string;
}

export const useGetComments = ({ postId }: UseGetCommentsProps) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const posts = useAppSelector((state) => state.user.feed);

  const dispatch = useAppDispatch();

  const service = useHttpRequestService();

  useEffect(() => {
    try {
      setLoading(true);
      setError(false);
      service.getCommentsByPostId(postId, 10, 0).then((res) => {
        const updatedPosts = res;
        dispatch(updateFeed(updatedPosts));
        dispatch(setLength(updatedPosts.length));
        setLoading(false);
      });
    } catch (e) {
      setError(true);
      console.log(e);
    }
  }, [postId]);

  return { posts, loading, error };
};
