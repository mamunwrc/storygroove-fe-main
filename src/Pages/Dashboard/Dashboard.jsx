import React, { useEffect, useState, useContext, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { NewAuthContext } from "../../contexts/NewAuthProvider";
import { getUser } from "../../api/user";
import { getUserSubscriptionDetailsAPI } from "../../api/subscriptions";
import {
  ImageContext,
} from "../../contexts/imageContext";
import { ProgressBarContext } from "../../contexts/ProgressBarContext";
import { getBooksPaginated } from "../../api/bookGeneration";
import { listIdeas } from "../../api/ideas";
import { filterDashboardProjects } from "../../utils/oliviaDashboardThreads";
import CreateBookModal from "../../component/createBook/CreateBookModal";
import toast, { Toaster } from "react-hot-toast";
import "./dashboard.scss";
import UploadManusciptModal from "../../component/createBook/UploadManuscriptModal";
import PersonaCardsView from "../../component/Dashboard/PersonaCardsView/PersonaCardsView";
import ProjectsListView from "../../component/Dashboard/ProjectsListView/ProjectsListView";

const VALID_AGENT_TAB = ["simone", "olivia", "ellis", "novels", "all", "ideas"];

function readInitialDashboardSearch() {
  if (typeof window === "undefined") {
    return { showProjects: false, agentFilter: "all" };
  }
  const sp = new URLSearchParams(window.location.search);
  const showProjects = sp.get("view") === "projects";
  const agent = sp.get("agent");
  const agentFilter =
    showProjects && agent && VALID_AGENT_TAB.includes(agent) ? agent : "all";
  return { showProjects, agentFilter };
}

const Dashboard = () => {
  const { user, setUser, showModel, setShowModel, showUploadModal, setShowUploadModal } = useContext(NewAuthContext);
  const [booksList, setBooksList] = useState([]);
  const {
    setCurImage,
    setImageNoBg,
    setOriginalImage,
    setCurrentSkeleton,
    setShopUrl,
    setCurrentSkeletonList,
    setCurrentEditAiImage,
    setUpdatedSdkImage,
    setResponseError,
    setBackward,
    setEditorB64Image,
  } = useContext(ImageContext);
  const { setCurrentStep } = useContext(ProgressBarContext);
  const [loading, setLoading] = useState(false);
  const initialSearch = readInitialDashboardSearch();
  const [showProjects, setShowProjects] = useState(initialSearch.showProjects);
  const [novelPinned, setNovelPinned] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalBooks, setTotalBooks] = useState(0);
  const [agentFilter, setAgentFilter] = useState(initialSearch.agentFilter);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const BOOKS_PER_PAGE = 20;

  const fetchAllBooks = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      if (agentFilter === "ideas") {
        const ideasRes = await listIdeas(page, BOOKS_PER_PAGE);
        if (ideasRes.status === 200) {
          const responseData = ideasRes.data;
          const items = Array.isArray(responseData?.data)
            ? responseData.data.map((idea) => ({
                ...idea,
                name: idea.title,
                isIdea: true,
              }))
            : [];
          setBooksList(items);
          setTotalPages(responseData?.pagination?.totalPages || 1);
          setTotalBooks(responseData?.pagination?.total || 0);
          setCurrentPage(responseData?.pagination?.page || page);
        } else {
          toast.error("Error fetching ideas");
        }
        return;
      }

      const books = await getBooksPaginated(page, BOOKS_PER_PAGE, agentFilter);
      if (books.status === 200) {
        const responseData = books.data;
        if (responseData.data && responseData.pagination) {
          setBooksList(filterDashboardProjects(responseData.data));
          setTotalPages(responseData.pagination.totalPages || 1);
          setTotalBooks(responseData.pagination.total || 0);
          setCurrentPage(responseData.pagination.page || page);
        } else {
          const items = filterDashboardProjects(
            Array.isArray(responseData) ? responseData : []
          );
          setBooksList(items);
          setTotalPages(1);
          setTotalBooks(items.length);
          setCurrentPage(1);
        }
      } else {
        toast.error("Error fetching books list");
      }
    } catch (error) {
      console.error("Error fetching books:", error);
      toast.error(
        agentFilter === "ideas"
          ? "Error fetching ideas"
          : "Error fetching books list"
      );
    } finally {
      setLoading(false);
    }
  }, [agentFilter]);

  const handleAgentFilterChange = useCallback((newFilter) => {
    setAgentFilter(newFilter);
    setCurrentPage(1);
    const params = new URLSearchParams();
    params.set("view", "projects");
    if (newFilter && newFilter !== "all") {
      params.set("agent", newFilter);
    }
    navigate(`/dashboard?${params.toString()}`, { replace: true });
  }, [navigate]);

  useEffect(() => {
    const view = searchParams.get("view");
    if (view === "projects") {
      setShowProjects(true);
      const agent = searchParams.get("agent");
      if (agent && VALID_AGENT_TAB.includes(agent)) {
        setAgentFilter(agent);
      } else {
        setAgentFilter("all");
      }
      setCurrentPage(1);
    } else {
      setShowProjects(false);
    }
  }, [searchParams]);

  const handleClose = () => {
    setShowModel(false);
  };
  const openUploadModal = () => {
    setShowUploadModal(true);
  };
  const closeUploadModal = () => {
    setShowUploadModal(false);
  };

  useEffect(() => {
    if (!showModel) {
      fetchAllBooks(currentPage);
    }
  }, [novelPinned, showModel, fetchAllBooks, currentPage]);

  useEffect(() => {
    setCurImage(null);
    setImageNoBg(null);
    setOriginalImage(null);
    setCurrentSkeleton(null);
    setShopUrl(null);
    setCurrentSkeletonList(null);
    setCurrentEditAiImage(null);
    setUpdatedSdkImage(null);
    setResponseError(false);
    setCurrentStep(0);
    setBackward(null);
    setEditorB64Image(null);

    if (!user) {
      (async () => {
        const user = await getUser();
        if (user.success) {
          setUser(user.user);
        }
      })();
    }
  }, [setCurImage, setImageNoBg, setOriginalImage, setCurrentSkeleton, setShopUrl, setCurrentSkeletonList, setCurrentEditAiImage, setUpdatedSdkImage, setResponseError, setCurrentStep, setBackward, setEditorB64Image, user, setUser]);

  useEffect(() => {
    getUserSubscriptionDetailsAPI()
      .then((resp) => {
        if (resp?.nextDueDate) {
          const expDate = new Date(resp?.nextDueDate).getTime();
          const curDate = new Date().getTime();

          if (expDate >= curDate) {
            // Subscription is active
          }
        }
      })
      .catch((e) => {
        console.log(e);
      });
  }, []);

  const handleMyProjectsClick = () => {
    navigate("/dashboard?view=projects", { replace: true });
  };

  const handleBackToPersonas = () => {
    navigate("/dashboard", { replace: true });
  };

  return (
    <div className="overflow-auto">
      <section className="home content-container storygroove-theme">
        <div className="dashboard-content-wrapper">
          {!showProjects ? (
            <PersonaCardsView onMyProjectsClick={handleMyProjectsClick} />
          ) : (
            <ProjectsListView
              booksList={booksList}
              loading={loading}
              novelPinned={novelPinned}
              setNovelPinned={setNovelPinned}
              fetchAllBooks={fetchAllBooks}
              openUploadModal={openUploadModal}
              onBack={handleBackToPersonas}
              currentPage={currentPage}
              totalPages={totalPages}
              totalBooks={totalBooks}
              onPageChange={setCurrentPage}
              agentFilter={agentFilter}
              onAgentFilterChange={handleAgentFilterChange}
            />
          )}
        </div>
        {showModel && (
          <CreateBookModal
            fetchAllBooks={fetchAllBooks}
            show={showModel}
            handleClose={handleClose}
          />
        )}
        {showUploadModal && (
          <UploadManusciptModal
            fetchAllBooks={fetchAllBooks}
            show={showUploadModal}
            handleClose={closeUploadModal}
          />
        )}
      </section>
      <Toaster position="top-right" reverseOrder={false} />
    </div>
  );
};

export default Dashboard;
