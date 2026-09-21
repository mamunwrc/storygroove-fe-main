import React from "react";
import { Image } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import "./sidebarProfile.css";
import { FaBarsStaggered } from "react-icons/fa6";
import { FaPowerOff } from "react-icons/fa6";
import { FiMessageSquare, FiUser } from "react-icons/fi";
import clsx from "clsx";

const FEEDBACK_EMAIL = "support@storygroove.ai";

const buildFeedbackMailto = (userName) => {
  const subject = encodeURIComponent(
    `StoryGroove Feedback By ${userName || "User"}`
  );
  return `mailto:${FEEDBACK_EMAIL}?subject=${subject}`;
};

const SidebarProfile = ({ userImages, user, handleLogout, showMenu }) => {
  const navigate = useNavigate();
  const userName = user?.name || localStorage.getItem("userName") || "User";

  const openFeedbackEmail = (event) => {
    event?.preventDefault?.();
    event?.stopPropagation?.();

    const link = document.createElement("a");
    link.href = buildFeedbackMailto(userName);
    link.rel = "noopener noreferrer";
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className={clsx("new-sidebar-profile", {
      "new-sidebar-profile-expanded": showMenu,
      "new-sidebar-profile-collapsed": !showMenu,
    })}>
      <div
        className="sidebar-profile-dropdown"
        data-bs-toggle="dropdown"
        aria-expanded="false"
      >
        <div className={clsx("sidebar-profile-content", {
          "d-flex align-items-center": showMenu,
          "d-flex justify-content-center align-items-center": !showMenu
        })}>
          <Image
            width={40}
            height={40}
            className="sidebar-profile-avatar"
            src={userImages || "/assets/images/avatar.jpg"}
            roundedCircle
          />
          {showMenu && (
            <div className="sidebar-profile-name ms-2">
              {user?.name || localStorage.getItem("userName") || "User Name"}
            </div>
          )}
        </div>
        {showMenu && (
          <FaBarsStaggered size={15} className="sidebar-profile-menu-icon" />
        )}
        <ul className="dropdown-menu w-100 mr-2">
          <li onClick={() => navigate("/dashboard/userprofile")}>
            <a
              className="dropdown-item d-flex justify-content-between align-items-center"
              href="/dashboard/userprofile"
            >
              My Account
              <FiUser />
            </a>
          </li>
          <li>
            <button
              type="button"
              className="dropdown-item d-flex justify-content-between align-items-center"
              onClick={openFeedbackEmail}
            >
              Give Feedback
              <FiMessageSquare />
            </button>
          </li>
          <li onClick={handleLogout}>
            <button className="dropdown-item d-flex justify-content-between align-items-center" type="button">
              Log out
              <FaPowerOff />
            </button>
          </li>
        </ul>
      </div>
    </div>
  );
};

export default SidebarProfile;
