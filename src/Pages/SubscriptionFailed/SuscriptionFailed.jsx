import React from "react";
import "./subscriptionfailed.css";

const SubscriptionFailed = () => {
  return (
    <div className="subscriptionfailedouter">
      <div className="subscriptionfailed">
        <img className="paymentfailedimg" src="/paymentfailed.webp" alt="" />
      </div>
      <div className="subscriptionfailed">
        <h3 className="text-danger">Payment Failed</h3>
      </div>
      <div className="subscriptionfailed">
        <a href="/dashboard" className="home-button">
          Go back home
        </a>
      </div>
    </div>
  );
};

export default SubscriptionFailed;
