import React from "react";
import { useNavigate } from "react-router-dom";
import ResendVerificationPanel from "../../component/ResendVerification/ResendVerificationPanel";

const ResendVerificationPage = () => {
  const navigate = useNavigate();

  return (
    <div className="auth-page">
      <div className="auth-background">
        <div className="page-half">
          <div className="form-fields-container">
            <img
              className="logo-img"
              alt="storygrove ai"
              src="/assets/images/story-grove-ai-logo.png"
            />
            <h2 className="form-heading">Resend verification email</h2>
            <ResendVerificationPanel />
            <div className="d-flex justify-content-center text-white mt-4 signup-text">
              <a
                className="text-white"
                href="/login"
                onClick={(e) => {
                  e.preventDefault();
                  navigate("/login");
                }}
              >
                Back to login
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResendVerificationPage;
