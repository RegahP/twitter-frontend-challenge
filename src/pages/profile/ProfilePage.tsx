import {useEffect, useState} from "react";
import ProfileInfo from "./ProfileInfo";
import {useNavigate, useParams} from "react-router-dom";
import Modal from "../../components/modal/Modal";
import {useTranslation} from "react-i18next";
import {ExtendedUserDTO, User, UserDTO, UserViewDTO} from "../../service";
import {ButtonType} from "../../components/button/StyledButton";
import {useHttpRequestService} from "../../service/HttpRequestService";
import Button from "../../components/button/Button";
import ProfileFeed from "../../components/feed/ProfileFeed";
import {StyledContainer} from "../../components/common/Container";
import {StyledH5} from "../../components/common/text";

const ProfilePage = () => {
  const [profile, setProfile] = useState<ExtendedUserDTO | null>(null);
  const [followers, setFollowers] = useState<UserDTO[]>([]);
  const [following, setFollowing] = useState<boolean>(false);
  const [showModal, setShowModal] = useState<boolean>(false);
  const [modalValues, setModalValues] = useState({
    text: "",
    title: "",
    type: ButtonType.DEFAULT,
    buttonText: "",
  });
  const service = useHttpRequestService()
  const [user, setUser] = useState<UserViewDTO>()

  const id = useParams().id;
  const navigate = useNavigate();

  const {t} = useTranslation();


  useEffect(() => {
    handleGetUser().then(r => setUser(r))
  }, []);

  const handleGetUser = async () => {
    return await service.me()
  }

  const handleButtonType = (): { component: ButtonType; text: string } => {
    if (profile?.id === user?.id)
      return {component: ButtonType.DELETE, text: t("buttons.delete")};
    if (following)
      return {component: ButtonType.OUTLINED, text: t("buttons.unfollow")};
    else return {component: ButtonType.FOLLOW, text: t("buttons.follow")};
  };

  const handleSubmit = () => {
    if (profile?.id === user?.id) {
      service.deleteProfile().then(() => {
        localStorage.removeItem("token");
        navigate("/sign-in");
      });
    } else {
      service.unfollowUser(profile!.id).then(async () => {
        setFollowing(false);
        setShowModal(false);
        await getProfileData();
      });
    }
  };

  useEffect(() => {
    getProfileData().then();
  }, [id]);

  if (!id) return null;

  const handleButtonAction = async () => {
    if (profile?.id === user?.id) {
      setShowModal(true);
      setModalValues({
        title: t("modal-title.delete-account"),
        text: t("modal-content.delete-account"),
        type: ButtonType.DELETE,
        buttonText: t("buttons.delete"),
      });
    } else {
      if (following) {
        setShowModal(true);
        setModalValues({
          text: t("modal-content.unfollow"),
          title: `${t("modal-title.unfollow")} @${profile?.username}?`,
          type: ButtonType.FOLLOW,
          buttonText: t("buttons.unfollow"),
        });
      } else {
        await service.followUser(id);
        service.getProfile(id).then((res) => setProfile(res));
        service.getFollowers(id).then((res: UserDTO[] | undefined) => setFollowers(res ?? []));
      }
      return await getProfileData();
    }
  };

  const getProfileData = async () => {
    service
        .getProfile(id)
        .then((res) => {
          setProfile(res);
          setFollowing(
              res
                  ? res?.followers.some((follower: User) => follower.id === user?.id)
                  : false
          );
        })
        .catch(() => {
          service
              .getProfileView(id)
              .then((res) => {
                setProfile(res);
                setFollowing(false);
              })
              .catch((error2) => {
                console.log(error2);
              });
        });
  };

  return (
      <>
        <StyledContainer
            maxHeight={"100vh"}
            borderRight={"1px solid #ebeef0"}
            maxWidth={'600px'}
        >
          {profile && (
              <>
                <StyledContainer
                    borderBottom={"1px solid #ebeef0"}
                    maxHeight={"212px"}
                    padding={"16px"}
                >
                  <StyledContainer
                      alignItems={"center"}
                      padding={"24px 0 0 0"}
                      flexDirection={"row"}
                  >
                    <ProfileInfo
                        name={profile!.name!}
                        username={profile!.username}
                        profilePicture={profile!.profileImageUrl!}
                    />
                    <Button
                        buttonType={handleButtonType().component}
                        size={"100px"}
                        onClick={handleButtonAction}
                        text={handleButtonType().text}
                    />
                  </StyledContainer>
                </StyledContainer>
                <StyledContainer width={"100%"}>
                  {followers.length > 0 || profile.id === user?.id ? (
                      <ProfileFeed/>
                  ) : (
                      <StyledH5>Private account</StyledH5>
                  )}
                </StyledContainer>
                <Modal
                    show={showModal}
                    text={modalValues.text}
                    title={modalValues.title}
                    acceptButton={
                      <Button
                          buttonType={modalValues.type}
                          text={modalValues.buttonText}
                          size={"MEDIUM"}
                          onClick={handleSubmit}
                      />
                    }
                    onClose={() => {
                      setShowModal(false);
                    }}
                />
              </>
          )}
        </StyledContainer>
      </>
  );
};

export default ProfilePage;
