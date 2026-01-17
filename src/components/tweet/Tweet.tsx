import {useEffect, useState} from "react";
import {StyledTweetContainer} from "./TweetContainer";
import AuthorData from "./user-post-data/AuthorData";
import type {ExtendedPostDTO, UserViewDTO} from "../../service";
import {StyledReactionsContainer} from "./ReactionsContainer";
import Reaction from "./reaction/Reaction";
import {useHttpRequestService} from "../../service/HttpRequestService";
import {IconType} from "../icon/Icon";
import {StyledContainer} from "../common/Container";
import ThreeDots from "../common/ThreeDots";
import DeletePostModal from "./delete-post-modal/DeletePostModal";
import ImageContainer from "./tweet-image/ImageContainer";
import CommentModal from "../comment/comment-modal/CommentModal";
import {useNavigate} from "react-router-dom";
import {usePostReaction} from "../../hooks/usePostReaction";

interface TweetProps {
  post: ExtendedPostDTO;
}

const Tweet = ({post}: TweetProps) => {
  const [actualPost, setActualPost] = useState<ExtendedPostDTO>(post);
  const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false);
  const [showCommentModal, setShowCommentModal] = useState<boolean>(false);
  const service = useHttpRequestService();
  const navigate = useNavigate();
  const [user, setUser] = useState<UserViewDTO>()
  const {hasReacted, toggle} = usePostReaction(post.id);

  useEffect(() => {
    handleGetUser().then(r => setUser(r))
  }, []);

  useEffect(() => {
    setActualPost(post);
  }, [post]);

  const handleGetUser = async () => {
    return await service.me()
  }

  const getCountByType = (type: string): number => {
    return type === "like" ? actualPost?.qtyLikes ?? 0 : actualPost?.qtyRetweets ?? 0;
  };

  const handleReaction = async (type: string) => {
    if (type !== "like" && type !== "retweet") return;

    const prevReacted = hasReacted(type);
    const nextReacted = !prevReacted;

    setActualPost((current) => {
      if (type === "like") {
        return {
          ...current,
          qtyLikes: Math.max(0, (current.qtyLikes ?? 0) + (nextReacted ? 1 : -1)),
        };
      }

      return {
        ...current,
        qtyRetweets: Math.max(
          0,
          (current.qtyRetweets ?? 0) + (nextReacted ? 1 : -1)
        ),
      };
    });

    try {
      await toggle(type);
      const newPost: ExtendedPostDTO = await service.getPostById(post.id);
      setActualPost(newPost);
    } catch (e) {
      setActualPost((current) => {
        if (type === "like") {
          return {
            ...current,
            qtyLikes: Math.max(
              0,
              (current.qtyLikes ?? 0) + (prevReacted ? 1 : -1)
            ),
          };
        }
        return {
          ...current,
          qtyRetweets: Math.max(
            0,
            (current.qtyRetweets ?? 0) + (prevReacted ? 1 : -1)
          ),
        };
      });
      throw e;
    }
  };

  return (
      <StyledTweetContainer>
        <StyledContainer
            style={{width: "100%"}}
            flexDirection={"row"}
            alignItems={"center"}
            justifyContent={"center"}
            maxHeight={"48px"}
        >
          <AuthorData
              id={post.author.id}
              name={post.author.name ?? "Unknown"}
              username={post.author.username}
              createdAt={post.createdAt}
              profilePicture={post.author.profileImageUrl ?? undefined}
          />
          {post.author.id === user?.id && (
              <>
                <DeletePostModal
                    show={showDeleteModal}
                    id={post.id}
                    onClose={() => {
                      setShowDeleteModal(false);
                    }}
                />
                <ThreeDots
                    onClick={() => {
                      setShowDeleteModal(!showDeleteModal);
                    }}
                />
              </>
          )}
        </StyledContainer>
        <StyledContainer onClick={() => navigate(`/post/${post.id}`)}>
          <p>{post.content}</p>
        </StyledContainer>
        {post.images && post.images!.length > 0 && (
            <StyledContainer padding={"0 0 0 10%"}>
              <ImageContainer images={post.images}/>
            </StyledContainer>
        )}
        <StyledReactionsContainer>
          <Reaction
              img={IconType.CHAT}
              count={actualPost.qtyComments ?? 0}
              reactionFunction={() =>
                  window.innerWidth > 600
                      ? setShowCommentModal(true)
                      : navigate(`/compose/comment/${post.id}`)
              }
              reacted={false}
          />
          <Reaction
              img={IconType.RETWEET}
              count={getCountByType("retweet")}
              reactionFunction={() => handleReaction("retweet")}
              reacted={hasReacted("retweet")}
          />
          <Reaction
              img={IconType.LIKE}
              count={getCountByType("like")}
              reactionFunction={() => handleReaction("like")}
              reacted={hasReacted("like")}
          />
        </StyledReactionsContainer>
        <CommentModal
            show={showCommentModal}
            post={post}
            onClose={() => setShowCommentModal(false)}
        />
      </StyledTweetContainer>
  );
};

export default Tweet;
