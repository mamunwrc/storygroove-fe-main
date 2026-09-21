import React from "react";
import "./checkout-success.css";

const SUPPORT_EMAIL = "support@storygroove.ai";

const CheckoutSuccess = () => {
  return (
    <div className="checkout-success-outer">
      <div className="checkout-success-card">
        <img
          className="checkout-success-logo"
          src="/assets/images/story-grove-ai-logo.png"
          alt="Story Groove"
        />

        <h1 className="checkout-success-title">
          <span className="checkout-success-emoji" aria-hidden="true">
            🎉
          </span>{" "}
          Welcome — You&apos;re In!
        </h1>

        <ol className="checkout-success-steps">
          <li className="checkout-success-step">
            <span className="checkout-success-step-number">1</span>
            <div className="checkout-success-step-body">
              <strong className="checkout-success-step-title">
                Check your email
              </strong>
              <p className="checkout-success-step-text">
                Look for a verification email from{" "}
                <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
              </p>
            </div>
          </li>
          <li className="checkout-success-step">
            <span className="checkout-success-step-number">2</span>
            <div className="checkout-success-step-body">
              <strong className="checkout-success-step-title">
                Verify your email &amp; create your password
              </strong>
            </div>
          </li>
        </ol>

        <div className="checkout-success-help">
          <p className="checkout-success-help-heading">
            Didn&apos;t receive the email?
          </p>
          <p className="checkout-success-help-text">
            Check your <strong>Spam</strong> or <strong>Promotions</strong>{" "}
            folder, or send us an email at{" "}
            <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default CheckoutSuccess;
