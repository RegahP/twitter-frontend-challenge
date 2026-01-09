import React, {useEffect, useState} from "react";
import NavItem from "./navItem/NavItem";
import Button from "../button/Button";
import {useLocation, useNavigate} from "react-router-dom";
import {StyledTweetButton} from "../tweet-button/StyledTweetButton";
import TweetModal from "../tweet-modal/TweetModal";
import {IconType, LogoIcon} from "../icon/Icon";
import Avatar from "../common/avatar/Avatar";
import LogoutPrompt from "./logout-prompt/LogoutPrompt";
import ThreeDots from "../common/ThreeDots";
import {useTranslation} from "react-i18next";
import {ButtonType} from "../button/StyledButton";
import Icon from "../../assets/icon.jpg";
import {StyledNavBarContainer} from "./NavBarContainer";
import {StyledContainer} from "../common/Container";
import {StyledIconContainer} from "./IconContainer";
import {StyledNavItemsContainer} from "./navItem/NavItemsContainer";
import {StyledP} from "../common/text";
import {useHttpRequestService} from "../../service/HttpRequestService";
import {UserViewDTO} from "../../service";
import ProfileLogoutPrompt from "../profile-logout/ProfileLogoutPrompt";

const NavBar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [tweetModalOpen, setTweetModalOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const service = useHttpRequestService()
  const [user, setUser] = useState<UserViewDTO>()
  const {t} = useTranslation();

  useEffect(() => {
    handleGetUser().then(r => setUser(r))
  }, []);

  const handleGetUser = async () => {
    return await service.me()
  }

  const handleAvatarClick = () => {
    if (window.innerWidth < 1265) {
      handleLogout();
    } else {
      navigate(`/profile/${user?.id}`);
    }
  };

  const handleLogout = () => {
    setLogoutOpen(!logoutOpen);
  };

  return (
      <StyledNavBarContainer>
        <StyledContainer flex={1}>
          <StyledIconContainer>
            <LogoIcon/>
          </StyledIconContainer>
          <StyledNavItemsContainer>
            <NavItem
                title={t("navbar.home")}
                onClick={() => {
                  navigate("/");
                }}
                icon={IconType.HOME}
                selectedIcon={IconType.ACTIVE_HOME}
                active={location.pathname === "/"}
            />
            <NavItem
                title={t("navbar.profile")}
                onClick={() => {
                  navigate(`/profile/${user?.id}`);
                }}
                icon={IconType.PROFILE}
                selectedIcon={IconType.ACTIVE_PROFILE}
                active={location.pathname === `/profile/${user?.id}`}
            />
            <StyledTweetButton
                onClick={() => navigate("/compose/tweet")
                }
            >
              +
            </StyledTweetButton>
          </StyledNavItemsContainer>
          <StyledContainer width={"100%"}>
            <Button
                text={"Tweet"}
                size={"180px"}
                buttonType={ButtonType.DEFAULT}
                onClick={() => {
                  setTweetModalOpen(true);
                }}
            ></Button>
          </StyledContainer>
          <TweetModal
              open={tweetModalOpen}
              onClose={() => {
                setTweetModalOpen(false);
              }}
          />
        </StyledContainer>
          <ProfileLogoutPrompt margin={'50px 0'} direction={'column-reverse'}/>
      </StyledNavBarContainer>
  );
};

export default NavBar;
