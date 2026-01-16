import {useEffect, useState} from "react";
import ProfileInfo from "./ProfileInfo";
import {useNavigate, useParams} from "react-router-dom";
import Modal from "../../components/modal/Modal";
import {useTranslation} from "react-i18next";
import {ExtendedUserDTO, UserDTO, UserViewDTO} from "../../service";
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

  const service = useHttpRequestService();
  const [user, setUser] = useState<UserViewDTO>();

  const id = useParams().id;
  const navigate = useNavigate();

  const {t} = useTranslation();

  const loadProfileData = async (profileId: string) => {
    const me = await service.me();

    const profilePromise = service
      .getProfile(profileId)
      .catch(() => service.getProfileView(profileId));
    const followersPromise = service
      .getFollowers(profileId)
      .catch(() => [] as UserDTO[]);
    const isFollowingPromise = me?.id === profileId
      ? Promise.resolve({isFollowing: false})
      : service.isFollowing(profileId).catch(() => ({isFollowing: false}));

    const [profileRes, followersRes, isFollowingRes] = await Promise.all([
      profilePromise,
      followersPromise,
      isFollowingPromise,
    ]);

    const followerList: UserDTO[] = Array.isArray(followersRes)
      ? (followersRes as UserDTO[])
      : [];

    const followingViaEndpoint = Boolean(isFollowingRes?.isFollowing);
    const followingViaFollowers = Boolean(
      me?.id && followerList.some((f) => f?.id === me.id)
    );

    return {
      me,
      profile: (profileRes ?? null) as ExtendedUserDTO | null,
      followers: followerList,
      following: me?.id === profileId ? false : (followingViaEndpoint || followingViaFollowers),
    };
  };

  const refresh = async (profileId: string) => {
    const data = await loadProfileData(profileId);
    setUser(data.me);
    setProfile(data.profile);
    setFollowers(data.followers);
    setFollowing(data.following);
  };

  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    (async () => {
      try {
        const data = await loadProfileData(id);
        if (cancelled) return;
        setUser(data.me);
        setProfile(data.profile);
        setFollowers(data.followers);
        setFollowing(data.following);
      } catch (e) {
        if (cancelled) return;
        console.log(e);
        setProfile(null);
        setFollowers([]);
        setFollowing(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [id]);

  if (!id) return null;

  const handleButtonType = (): { component: ButtonType; text: string } => {
    if (profile?.id === user?.id)
      return {component: ButtonType.DELETE, text: t("buttons.delete")};
    if (following)
      return {component: ButtonType.OUTLINED, text: t("buttons.unfollow")};
    return {component: ButtonType.FOLLOW, text: t("buttons.follow")};
  };

  const handleSubmit = () => {
    if (profile?.id === user?.id) {
      service.deleteProfile().then(() => {
        localStorage.removeItem("token");
        navigate("/sign-in");
      });
      return;
    }

    service.unfollowUser(profile!.id).then(async () => {
      setShowModal(false);
      await refresh(profile!.id);
    });
  };

  const handleButtonAction = async () => {
    if (profile?.id === user?.id) {
      setShowModal(true);
      setModalValues({
        title: t("modal-title.delete-account"),
        text: t("modal-content.delete-account"),
        type: ButtonType.DELETE,
        buttonText: t("buttons.delete"),
      });
      return;
    }

    if (following) {
      setShowModal(true);
      setModalValues({
        text: t("modal-content.unfollow"),
        title: `${t("modal-title.unfollow")} @${profile?.username}?`,
        type: ButtonType.FOLLOW,
        buttonText: t("buttons.unfollow"),
      });
      return;
    }

    await service.followUser(id);
    await refresh(id);
  };

  return (
    <>
      <StyledContainer
        maxHeight={"100vh"}
        borderRight={"1px solid #ebeef0"}
        maxWidth={"600px"}
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
                  name={profile.name!}
                  username={profile.username}
                  profilePicture={profile.profileImageUrl!}
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
              {profile.id === user?.id || following || followers.some((f) => f?.id === user?.id) ? (
                <ProfileFeed />
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
