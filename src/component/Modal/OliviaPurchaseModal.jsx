import React, { useEffect, useState } from "react";
import { Modal } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import {
  getPriceListFromStripeAPI,
  activeSubscriptionPlan,
} from "../../api/subscriptions";
import {
  formatFirstPaymentLabel,
  formatOptionPrice,
  getBuilderCheckoutOptions,
} from "../../utils/subscriptionPricing";
import { toast } from "react-toastify";
import { isPrivilegedRole } from "../../utils";
import "./OliviaPurchaseModal.scss";

const OliviaPurchaseModal = ({
  show,
  onHide,
  successUrl,
}) => {
  const navigate = useNavigate();
  const [loadingPrices, setLoadingPrices] = useState(false);
  const [builderOptions, setBuilderOptions] = useState([]);
  const [membershipPricing, setMembershipPricing] = useState(null);
  const [requiresMembershipFee, setRequiresMembershipFee] = useState(false);
  const [checkingOutPriceId, setCheckingOutPriceId] = useState(null);

  useEffect(() => {
    if (!show) return;
    if (isPrivilegedRole()) {
      onHide();
      return;
    }

    let cancelled = false;
    (async () => {
      setLoadingPrices(true);
      try {
        const data = await getPriceListFromStripeAPI();
        if (cancelled) return;
        setBuilderOptions(getBuilderCheckoutOptions(data?.priceList || []));
        setMembershipPricing(data?.membership || null);
        setRequiresMembershipFee(Boolean(data?.requiresMembershipFee));
      } catch (err) {
        if (!cancelled) {
          console.error("Failed to load Olivia pricing:", err);
          toast.error("Could not load pricing. Please try again.");
        }
      } finally {
        if (!cancelled) setLoadingPrices(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [show]);

  const handleViewAllPlans = () => {
    onHide();
    navigate("/dashboard/userprofile?tab=subscription");
  };

  const handleCheckout = async (priceId) => {
    setCheckingOutPriceId(priceId);
    try {
      const response = await activeSubscriptionPlan({
        priceId,
        successUrl: successUrl || window.location.href,
      });

      if (response?.url) {
        window.location.href = response.url.trim();
        return;
      }
      if (response?.object === "session" && response?.session?.url) {
        window.location.href = response.session.url;
        return;
      }
      toast.error("Could not open checkout. Please try again.");
    } catch (err) {
      console.error("Olivia checkout error:", err);
      toast.error(
        err?.response?.data?.message || "Could not open checkout. Please try again."
      );
    } finally {
      setCheckingOutPriceId(null);
    }
  };

  return (
    <Modal
      show={show}
      onHide={onHide}
      aria-labelledby="olivia-purchase-title"
      centered
      dialogClassName="olivia-purchase-modal__dialog"
      className="storygroove-theme olivia-purchase-modal"
    >
      <Modal.Body className="text-center px-4 py-5">
        <div className="olivia-purchase-icon-wrapper mb-3">
          <img
            src="/assets/images/Olivia-Avatar.jpg"
            alt="OliviaAI"
            className="olivia-purchase-icon"
          />
        </div>

        <h4 id="olivia-purchase-title" className="fw-bold mb-3">
          Build with OliviaAI&reg;
        </h4>
        <div className="olivia-purchase-message mb-4">
          <p className="mb-3">
            OliviaAI&reg; helps you build your Story Bible, structured outline,
            and cast — then coaches you chapter by chapter as you draft your novel.
          </p>
          <p className="mb-0">
            Choose the Builder plan to unlock Olivia and the full novel-building
            studio. SimoneAI&reg; stays included with unlimited access.
          </p>
        </div>

        {loadingPrices ? (
          <p className="olivia-purchase-loading mb-0">Loading pricing…</p>
        ) : builderOptions.length === 0 ? (
          <div className="olivia-purchase-actions">
            <button
              type="button"
              className="olivia-purchase-btn olivia-purchase-btn--primary"
              onClick={handleViewAllPlans}
            >
              View plans
            </button>
          </div>
        ) : (
          <div className="olivia-purchase-actions">
            {builderOptions.map((option) => {
              const intervalLabel =
                option.interval === "year" ? "Yearly" : "Monthly";
              const firstPayment =
                requiresMembershipFee && membershipPricing
                  ? formatFirstPaymentLabel(option, membershipPricing)
                  : null;
              const isLoading = checkingOutPriceId === option.priceId;

              return (
                <button
                  key={option.priceId}
                  type="button"
                  className="olivia-purchase-btn olivia-purchase-btn--primary"
                  onClick={() => handleCheckout(option.priceId)}
                  disabled={Boolean(checkingOutPriceId)}
                >
                  {isLoading
                    ? "Redirecting…"
                    : firstPayment || `Builder ${intervalLabel} — ${formatOptionPrice(option)}`}
                  {!isLoading && (
                    <span className="olivia-purchase-btn__sparkle" aria-hidden="true">
                      ✨
                    </span>
                  )}
                </button>
              );
            })}
            <button
              type="button"
              className="olivia-purchase-btn olivia-purchase-btn--secondary"
              onClick={handleViewAllPlans}
              disabled={Boolean(checkingOutPriceId)}
            >
              Compare all plans
            </button>
          </div>
        )}
      </Modal.Body>
    </Modal>
  );
};

export default OliviaPurchaseModal;
