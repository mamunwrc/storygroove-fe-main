import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React, { useCallback, useContext, useEffect } from "react";
import ReactGA from "react-ga";
import {
  Route,
  Routes,
  useNavigate,
  useLocation,
  BrowserRouter,
} from "react-router-dom";

import { axiosSecureInstance } from "./api/axios";
import ModalArea from "./Common/Modal";
import ImageProvider from "./contexts/imageContext";
import NewAuthContext from "./contexts/NewAuthProvider";
import ProgressBarProvider from "./contexts/ProgressBarContext";
import SidebarContextProvider from "./contexts/SidebarContext";
import StockProvider from "./contexts/StockContext";
import VideoContextProvider from "./contexts/VideoContext";
import {
  Callback,
  Dashboard,
  Layout,
  LoginForm,
  PageNotFound,
  ResetPassword,
  SubscriptionFailed,
  CheckoutSuccess,
  Userprofile,
  Verifytoken,
  BookIdeaPage,
  BookDetails,
  FinalDriftPage,
} from "./Pages";
import SignUpForm from "./Pages/SignUpPage";
import ResendVerificationPage from "./Pages/ResendVerification/ResendVerificationPage";
import NovelContextProvider from "./contexts/NovelContext";
import BookEditorPage from "./Pages/BookEditor/BookEditorPage";
import UploadBookViewerPage from "./Pages/UploadedManuscript/UploadBookViewerPage";
import AIAgentChatPage from "./Pages/AIAgentChat/AIAgentChatPage";
import CaptureIdeaPage from "./Pages/CaptureIdea/CaptureIdeaPage";
import SuperAdminGuard from "./component/guards/SuperAdminGuard";
import ApiUsageDashboard from "./Pages/ApiUsageDashboard/ApiUsageDashboard";
import ActivityLogDashboard from "./Pages/ActivityLogDashboard/ActivityLogDashboard";
import OliviaChatErrorBoundary from "./component/ErrorBoundary/OliviaChatErrorBoundary";

function App() {
  const location = useLocation();
  const queryClient = new QueryClient();
  const { logout } = useContext(NewAuthContext);
  const navigate = useNavigate();

  return (
    <QueryClientProvider client={queryClient}>
      <StockProvider>
        <SidebarContextProvider>
          <ImageProvider>
            <ProgressBarProvider>
              <NovelContextProvider>
                <VideoContextProvider>
                  <OliviaChatErrorBoundary variant="page">
                  <Routes>
                    <Route path="login" element={<LoginForm />} />
                    <Route path="signup" element={<SignUpForm />} />
                    <Route
                      path="resend-verification"
                      element={<ResendVerificationPage />}
                    />
                    <Route path="token" element={<Callback />} />
                    <Route path="verify/:token" element={<Verifytoken />} />
                    <Route path="*" element={<PageNotFound />} />

                    {/* This subscriptionfailed is something the backend passes to the Stripe checkout portal for use when something goes wrong */}
                    <Route
                      path="subscriptionfailed"
                      element={<SubscriptionFailed />}
                    />
                    <Route
                      path="checkout-success"
                      element={<CheckoutSuccess />}
                    />
                    <Route
                      path="/callback/auth/"
                      element={
                        <>
                          <h1>hello</h1>
                        </>
                      }
                    />
                    <Route
                      path="passwordReset/:token/:id"
                      element={<ResetPassword />}
                    />

                    {/* routes for the dashboard */}
                    <Route path="/" element={<Layout />}>
                      <Route index element={<Dashboard />} />
                    </Route>
                    <Route path="/dashboard/" element={<Layout />}>
                      <Route index element={<Dashboard />} />
                      <Route path="book-idea" element={<BookIdeaPage />} />
                      <Route path="capture-idea" element={<CaptureIdeaPage />} />
                      <Route
                        path="capture-idea/:id"
                        element={<CaptureIdeaPage />}
                      />
                      <Route path="book/:id" element={<BookDetails />} />
                      <Route
                        path="bookeditor/:id"
                        element={<BookEditorPage />}
                      />
                      <Route
                        path="upload/bookeditor/:id"
                        element={<UploadBookViewerPage />}
                      />
                      <Route
                        path="finaldraft/:id"
                        element={<FinalDriftPage />}
                      />
                      <Route
                        path="agent-chat/:agentId"
                        element={<AIAgentChatPage />}
                      />
                      <Route
                        path="agent-chat/:agentId/novel/:novelId"
                        element={<AIAgentChatPage />}
                      />
                      <Route path="userprofile" element={<Userprofile />} />
                      <Route
                        path="admin/api-usage"
                        element={<SuperAdminGuard />}
                      >
                        <Route
                          index
                          element={<ApiUsageDashboard />}
                        />
                      </Route>
                      <Route
                        path="admin/activity-logs"
                        element={<SuperAdminGuard />}
                      >
                        <Route index element={<ActivityLogDashboard />} />
                      </Route>
                    </Route>
                  </Routes>
                  </OliviaChatErrorBoundary>
                  <ModalArea />
                </VideoContextProvider>
              </NovelContextProvider>
            </ProgressBarProvider>
          </ImageProvider>
        </SidebarContextProvider>
      </StockProvider>
    </QueryClientProvider>
  );
}

export default App;
