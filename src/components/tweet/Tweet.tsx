import {useEffect, useState} from "react";
import {StyledTweetContainer} from "./TweetContainer";
import AuthorData from "./user-post-data/AuthorData";
import type {ExtendedPostDTO, PostReaction, User} from "../../service";
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

interface TweetProps {
  post: ExtendedPostDTO;
}

const Tweet = ({post}: TweetProps) => {
  const [actualPost, setActualPost] = useState<ExtendedPostDTO>(post);
  const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false);
  const [showCommentModal, setShowCommentModal] = useState<boolean>(false);
  const service = useHttpRequestService();
  const navigate = useNavigate();
  const [user, setUser] = useState<User>()
  const [postReaction, setPostReaction] = useState<PostReaction>()

  useEffect(() => {
    handleGetUser().then(r => setUser(r))
    handleGetPostReaction().then(r => setPostReaction(r))
  }, []);

  useEffect(() => {
    handleGetPostReaction().then(r => setPostReaction(r))
  }, [actualPost]);

  const handleGetUser = async () => {
    return await service.me()
  }
  const handleGetPostReaction = async () => {
    const like: boolean = await service.getReaction(post.id, 'like')
    const retweet: boolean = await service.getReaction(post.id, 'retweet')
    return {
      userId: user?.id ?? '',
      postId: post.id,
      like,
      retweet,
    } as PostReaction;
  }

  const getCountByType = (type: string): number => {
    return type === "like" ? actualPost?.qtyLikes ?? 0 : actualPost?.qtyRetweets ?? 0;
  };

  const handleReaction = async (type: string) => {
    const reaction = postReaction ? (type === "like" ? postReaction.like : postReaction.retweet) : false;
    if (reaction) {
      await service.deleteReaction(actualPost.id, type);
      handleUpdateReaction(type, false);
    } else {
      await service.createReaction(actualPost.id, type);
      handleUpdateReaction(type, true);
    }
    const newPost: ExtendedPostDTO = await service.getPostById(post.id);
    setActualPost(newPost);
  };

  const handleUpdateReaction = (type: string, reacted: boolean) => {
    if (postReaction) {
      if (type === "like") {
        setPostReaction({
          ...postReaction,
          like: reacted,
        });
      } else {
        setPostReaction({
          ...postReaction,
          retweet: reacted,
        });
      }
    }
  };

  const hasReactedByType = (type: string): boolean => {
    return postReaction ? (type === "like" ? postReaction.like : postReaction.retweet) : false;
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
          {post.authorId === user?.id && (
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
              increment={0}
              reacted={false}
          />
          <Reaction
              img={IconType.RETWEET}
              count={getCountByType("retweet")}
              reactionFunction={() => handleReaction("retweet")}
              increment={1}
              reacted={hasReactedByType("retweet")}
          />
          <Reaction
              img={IconType.LIKE}
              count={getCountByType("like")}
              reactionFunction={() => handleReaction("like")}
              increment={1}
              reacted={hasReactedByType("like")}
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
