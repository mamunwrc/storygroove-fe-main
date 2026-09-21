import { useLocation, Navigate, Outlet, useNavigate } from "react-router-dom";
import { SidebarContext } from "../../contexts/SidebarContext";
import PromptTemplateContextProvider from "../../contexts/PromptTemplateContext";
import { getUserID, isLoggedIn } from "../../service";
import { useContext, useEffect, useState } from "react";
import { AiOutlineMenu } from "react-icons/ai";
import NavLinksContainer from "../../component/layout/NewSidebar/NavLinksContainer";
import clsx from "clsx";
import NewAuthContext from "../../contexts/NewAuthProvider";
import { ImageContext } from "../../contexts/imageContext";
import { getUser } from "../../api/user";
import SidebarProfile from "../../component/layout/SidebarProfile";
import CreateBookModal from "../../component/createBook/CreateBookModal";
import { getAllBooks } from "../../api/bookGeneration";
import { filterDashboardProjects } from "../../utils/oliviaDashboardThreads";
import { getAgentAccessAPI } from "../../api/subscriptions";
import { isSubscriptionCancelled, isSubscriptionPaused } from "../../utils";
import toast, { Toaster } from "react-hot-toast";

const LOCKED_SUBSCRIPTION_ALLOWED_PATTERNS = [
  /^\/?$/,
  /^\/dashboard\/?$/,
  /^\/dashboard\/userprofile(\/.*)?$/,
  /^\/dashboard\/admin\//,
];

const Layout = () => {
  const { logout, showModel, setShowModel } = useContext(NewAuthContext);
  const [booksList, setBooksList] = useState([]);
  const {
    setCurImage,
    setImageNoBg,
    setOriginalImage,
    setBackgroundImg,
    setSavedImage,
    setProject,
    userImages,
    setUserImages,
    setUserTrack,
  } = useContext(ImageContext);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { setShowMenu, triggerNavContent, showMenu } =
    useContext(SidebarContext);
  const [initiateLogout, setInitiateLogout] = useState(false);
  const [user, setUser] = useState();
  const [tempUser, setTempUser] = useState();
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [subscriptionCancelled, setSubscriptionCancelled] = useState(false);
  const [subscriptionPaused, setSubscriptionPaused] = useState(false);

  const getUserDetails = async () => {
    const res = await getUser();
    if (!res.success || !res.user) {
      return;
    }
    const u = res.user;
    u.name = `${u.fname || ""} ${u.lname || ""}`.trim();
    if (u.image && typeof u.image != "object") {
      setUserImages(`${process.env.REACT_APP_BASE_URL}/${u.image}`);
    }
    setUser(u);
    setTempUser(u);
  };

  useEffect(() => {
    getUserDetails();
  }, []);

  // Detect cancelled-subscription state once per Layout mount. We refresh on
  // pathname change so that a user who just re-subscribed (returning from
  // Stripe checkout) gets unlocked without a full page reload.
  useEffect(() => {
    let cancelled = false;
    const fetchAccess = async () => {
      try {
        const data = await getAgentAccessAPI();
        if (!cancelled) {
          setSubscriptionCancelled(isSubscriptionCancelled(data));
          setSubscriptionPaused(isSubscriptionPaused(data));
        }
      } catch (err) {
        // Failing open is acceptable here: the BE still gates submissions.
      }
    };
    fetchAccess();
    return () => {
      cancelled = true;
    };
  }, [location.pathname, triggerNavContent]);

  useEffect(() => {
    if (!subscriptionCancelled && !subscriptionPaused) return;
    const path = location.pathname || "/";
    const allowed = LOCKED_SUBSCRIPTION_ALLOWED_PATTERNS.some((re) => re.test(path));
    if (allowed) return;
    toast.error(
      subscriptionPaused && !subscriptionCancelled
        ? "Your subscription is paused. Resume billing to access this page."
        : "Your subscription has been cancelled. Please re-subscribe to access this page.",
      { duration: 4500 }
    );
    navigate("/dashboard/userprofile?tab=subscription", { replace: true });
  }, [subscriptionCancelled, subscriptionPaused, location.pathname, navigate]);

  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleLogout = () => {
    // Set all related logout states
    setUserTrack((prevState) => ({}));

    setTimeout(() => {
      if (getUserID()) {
        setInitiateLogout(true);
      }
    }, [1000]);
  };

  const fetchAllBooks = async () => {
    setLoading(true);
    const books = await getAllBooks();
    if (books.status === 200) {
      setBooksList(filterDashboardProjects(books.data));
      setLoading(false);
    } else {
      toast.error("Error fetching books list");
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initiateLogout) {
      const performLogout = () => {
        // Clear React states
        setCurImage(null);
        setImageNoBg(null);
        setOriginalImage(null);
        setBackgroundImg(null);
        setSavedImage(null);
        setProject(null);

        localStorage.clear();

        logout();
        setInitiateLogout(false);
        navigate("/login");
      };
      performLogout();
    }
  }, [initiateLogout]);

  const handleClose = () => {
    setShowModel(false);
  };
  const openModal = () => {
    setShowModel(true);
  };

  const isSmallScreen = windowWidth < 768;

  return isLoggedIn() ? (
    <div className="">
      <PromptTemplateContextProvider>
        <div></div>
        <main className="d-flex" style={{ height: "100vh" }}>
          {/* Mobile menu button - show when sidebar is closed on small screens */}
          {isSmallScreen && !showMenu && (
            <button
              className="btn position-fixed"
              style={{
                top: '10px',
                left: '10px',
                zIndex: 1060,
                background: 'rgba(0,0,0,0.7)',
                border: 'none',
                color: 'white'
              }}
              onClick={() => setShowMenu(true)}
            >
              <AiOutlineMenu />
            </button>
          )}

          {/* Sidebar */}
          <aside
            className={clsx("new-sidebar", {
              "new-sidebar-expanded": showMenu,
              "new-sidebar-collapsed": !showMenu,
              "position-fixed": isSmallScreen,
              "d-none": isSmallScreen && !showMenu
            })}
            style={isSmallScreen ? { zIndex: 1050 } : {}}
          >
            <div className="sidebar-content">
              <div
                className="sidebar-toggle"
                onClick={() => setShowMenu((state) => !state)}
              >
                {showMenu ? (
                  <>
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M15 5L5 15M5 5L15 15" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <span className="toggle-text">Close</span>
                  </>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M3 5H17M3 10H17M3 15H17" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>

              <div className="sidebar-logo">
                <img
                  src="/assets/images/story-grove-ai-logo1.png"
                  alt="StoryGrove AI"
                  className={clsx({
                    "d-block": showMenu,
                    "d-none": !showMenu,
                  })}
                />
                {!showMenu && (
                  <img
                    src="/assets/images/logo-collapsed.png"
                    alt="StoryGrove AI"
                  />
                )}
              </div>

              {showMenu && (
                <div className="sidebar-divider"></div>
              )}

              <NavLinksContainer
                showMenu={showMenu}
                triggerUpdate={triggerNavContent}
              />
            </div>

            <SidebarProfile
              showMenu={showMenu}
              userImages={userImages}
              user={user}
              handleLogout={handleLogout}
            />
          </aside>

          {/* Mobile overlay */}
          {isSmallScreen && showMenu && (
            <div
              className="position-fixed w-100 h-100"
              style={{
                top: 0,
                left: 0,
                backgroundColor: 'rgba(0,0,0,0.5)',
                zIndex: 1040
              }}
              onClick={() => setShowMenu(false)}
            />
          )}

          {/* Main content */}
          <div
            className="flex-grow-1 position-relative main-wrapper storygroove-theme d-flex flex-column"
            style={{
              background: "#FAFAFA",
              height: "100vh",
              minWidth: 0,
              flex: 1
            }}
          >
            <section className="w-100 flex-grow-1 overflow-auto">
              <Outlet />
            </section>
          </div>
        </main>
      </PromptTemplateContextProvider>

      {showModel ? (
        <>
          <CreateBookModal
            fetchAllBooks={fetchAllBooks}
            show={showModel}
            handleClose={handleClose}
          />
        </>
      ) : (
        <></>
      )}
    </div>
  ) : (
    <Navigate to="/login" state={{ from: location }} replace />
  );
};

export default Layout;