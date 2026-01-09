import { Icon, IconType } from "../../icon/Icon";
import { StyledReactionContainer } from "./ReactionContainer";

interface ReactionProps {
  img: IconType;
  count: number;
  reacted: boolean;
  reactionFunction: () => void | Promise<void>;
}
const Reaction = ({
  img,
  count,
  reacted,
  reactionFunction,
}: ReactionProps) => {
  const handleReaction = async () => {
    try {
      await reactionFunction();
    } catch (error) {
      console.log(error);
    }
  };

  return (
    <StyledReactionContainer>
      {
        Icon({
          width: "16px",
          height: "16px",
          onClick: handleReaction,
          active: reacted,
        })[img]
      }
      <p>{count}</p>
    </StyledReactionContainer>
  );
};

export default Reaction;
