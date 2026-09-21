import {
  Chip,
  Container as MaterialContainer,
  Grid,
  Stack,
} from "@mui/material";
import { useQueries, useMutation } from "@tanstack/react-query";
import React, { useState, useEffect } from "react";
import { Card, Button, Modal } from "react-bootstrap";
import { Toaster, toast } from "react-hot-toast";
import { AiOutlineCheckCircle } from "react-icons/ai";

import {
  getUserSubscriptionDetailsAPIV2,
  getSubscriptionPlansAPIV2,
  activeSubscriptionPlan,
  cancelActiveSubscriptionPlanAPI,
  managePaymentAPI,
} from "../../api/subscriptions";
import { buildFeaturesArray } from "../../Common/Subscriptions";
import { SubscriptionCard } from "../../component/Subscriptions/SubscriptionCard";
import Loader from "../Loader/Loader";

export const Subscription = () => {
  const [loading, setLoading] = useState(true);
  const [subscriptions, setSubscriptions] = useState([]);
  const [userSubscriptionDetails, setUserSubscriptionDetails] = useState(null);
  const [userActiveSubscriptionPlanResponse, subscriptionPlansResponse] =
    useQueries({
      queries: [
        {
          queryKey: ["userActiveSubscriptionPlanV2"],
          queryFn: "", // getUserSubscriptionDetailsAPIV2,
          staleTime: Infinity,
        },
        {
          queryKey: ["subscriptionPlansV2"],
          queryFn: "", //getSubscriptionPlansAPIV2,
          staleTime: Infinity,
        },
      ],
    });
  const [ManageBilling, setManageBilling] = useState("Manage Billing");

  useEffect(() => {
    if (
      !userActiveSubscriptionPlanResponse.isLoading &&
      !userActiveSubscriptionPlanResponse.isRefetching &&
      !subscriptionPlansResponse.isLoading &&
      !subscriptionPlansResponse.isRefetching
    ) {
      if (userActiveSubscriptionPlanResponse.data) {
        const userSubscription =
          userActiveSubscriptionPlanResponse.data.subscription;
        const userSubscriber =
          userActiveSubscriptionPlanResponse.data.subscriber;

        setUserSubscriptionDetails({
          subscription: {
            ...userSubscription,
            features: buildFeaturesArray(userSubscription),
          },
          subscriber: userSubscriber,
        });
      }

      // const subscriptions = subscriptionPlansResponse.data
      //   .map((subscription) => {
      //     return {
      //       ...subscription,
      //       features: buildFeaturesArray(subscription),
      //     };
      //   });
      // setSubscriptions(subscriptions);

      setLoading(false);
    }
  }, [
    userActiveSubscriptionPlanResponse.isLoading,
    userActiveSubscriptionPlanResponse.isRefetching,
    subscriptionPlansResponse.isLoading,
    subscriptionPlansResponse.isRefetching,
  ]);

  function refetchData() {
    setLoading(true);
    userActiveSubscriptionPlanResponse.refetch();
    subscriptionPlansResponse.refetch();
  }

  const cancelingOrChangingChip = () => {
    if (loading) return;

    const date = new Date(userSubscriptionDetails.subscriber.cycleEndingOn);

    if (userSubscriptionDetails.subscriber.isCanceling) {
      const text = `Plan ends on ${date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })}`;
      return <Chip label={text} />;
    }

    if (userSubscriptionDetails.subscriber.futurePriceId) {
      const newPlanName = subscriptions.find(
        (sub) =>
          sub.priceId === userSubscriptionDetails.subscriber.futurePriceId
      )?.name;
      const text = `Changing to '${newPlanName}' on ${date.toLocaleDateString(
        "en-US",
        { month: "short", day: "numeric" }
      )}`;
      return <Chip label={text} />;
    }
  };

  const handleManagePaymentMutation = useMutation(managePaymentAPI, {
    onSuccess: ({ url }) => (window.location.href = url),
    onError: (error) => console.log(error),
  });

  const handleCancelPlanMutation = useMutation(
    cancelActiveSubscriptionPlanAPI,
    {
      onSuccess: () => {
        refetchData();
        toast.success("Subscription plan canceled successfully");
      },
      onError: () => {
        refetchData();
        toast.error("Oops something went wrong");
      },
    }
  );

  const handleChoosePlaMutation = useMutation(activeSubscriptionPlan, {
    onSuccess: (data) => {
      if (data.object === "session") {
        window.location.href = data.session.url;
      } else {
        refetchData();
        toast.success("Subscription plan activated successfully");
      }
    },
    onError: (data) => {
      toast.error(data.response.data.message);
    },
  });

  const choosePlanHandler = (priceId) => {
    handleChoosePlaMutation.mutate({ priceId: priceId });
  };
  const [show, setShow] = useState(false);

  const handleClose = () => setShow(false);
  const handleShow = () => setShow(true);
  return (
    <>
      <Toaster position="top-right" reverseOrder={false} />
      <section className="px-4">
        {loading ? (
          <Loader />
        ) : (
          <>
            {userSubscriptionDetails && (
              <div className="current-plan-container">
                <p className="title">Your current plan</p>
                <Card className="current-plan-card">
                  <div className="active-plan-basic">
                    <h2>{userSubscriptionDetails.subscription.name}</h2>
                    <div className="d-flex gap-1 justify-content-center align-items-end">
                      <h3>{`$${userSubscriptionDetails.subscription.amount}`}</h3>
                      <p>/{userSubscriptionDetails.subscription.interval}</p>
                    </div>
                    <div className="current-plan-tag">Current Plan</div>
                  </div>
                  <div className="active-plan-features">
                    {userSubscriptionDetails.subscription.features.map(
                      (feature, index) => (
                        <p className="feature" key={index}>
                          <span>
                            <AiOutlineCheckCircle className="check-circle-icon" />
                          </span>
                          <span className="text-start">{feature.label}</span>
                        </p>
                      )
                    )}
                  </div>
                  <div className="active-plan-btn-group">
                    {cancelingOrChangingChip()}
                    {userSubscriptionDetails.subscriber.futurePriceId && (
                      <Button
                        className="primary-custom-btn h-44"
                        disabled={
                          userSubscriptionDetails.subscriber
                            .subscribe_from_shopify
                        }
                        onClick={() =>
                          choosePlanHandler(
                            userSubscriptionDetails.subscriber.priceId
                          )
                        }
                      >
                        Cancel Change
                      </Button>
                    )}
                    {userSubscriptionDetails.subscriber.isCanceling ? (
                      <Button
                        className="primary-custom-btn h-44"
                        disabled={
                          userSubscriptionDetails.subscriber
                            .subscribe_from_shopify
                        }
                        onClick={() =>
                          choosePlanHandler(
                            userSubscriptionDetails.subscriber.priceId
                          )
                        }
                      >
                        Resume
                      </Button>
                    ) : (
                      <Button
                        className="secondary-custom-btn cancel-btn h-44"
                        disabled={
                          userSubscriptionDetails.subscriber
                            .subscribe_from_shopify
                        }
                        onClick={() => {
                          handleCancelPlanMutation.mutate();
                        }}
                      >
                        Cancel
                      </Button>
                    )}
                    <Button
                      disabled={
                        ManageBilling === "Please Wait..." ||
                        userSubscriptionDetails.subscriber
                          .subscribe_from_shopify
                      }
                      className="primary-custom-btn h-44"
                      onClick={() => {
                        handleManagePaymentMutation.mutate();
                        setManageBilling("Please Wait...");
                      }}
                    >
                      {ManageBilling}
                    </Button>
                  </div>
                </Card>
              </div>
            )}
            <p className="container-title">Available plans</p>
            <MaterialContainer
              maxWidth="xl"
              sx={{
                pb: "60px",
              }}
            >
              <Grid
                className="subscription-plans-container"
                container
                spacing={5}
                alignItems="stretch"
              >
                {!subscriptionPlansResponse.isLoading &&
                  subscriptions.map((subscription) => (
                    <Grid
                      item
                      key={subscription.name}
                      sm={12}
                      md={6}
                      lg={4}
                      xl={3}
                    >
                      <SubscriptionCard
                        subscription={subscription}
                        userSubscriptionDetails={userSubscriptionDetails}
                        choosePlanHandler={choosePlanHandler}
                      />
                    </Grid>
                  ))}
              </Grid>
            </MaterialContainer>
          </>
        )}
      </section>
      {/* {userSubscriptionDetails.subscriber.priceId && (
          <div>
            <Modal centered show={true} onHide={handleClose}>
              <Modal.Header closeButton>
                <Modal.Title>Key Not Fount</Modal.Title>
              </Modal.Header>
              <Modal.Body>Please add an openAI key to continue.</Modal.Body>
            </Modal>{' '}
          </div>
        )} */}
    </>
  );
};

export default Subscription;