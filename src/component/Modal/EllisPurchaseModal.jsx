import React, { useEffect, useState, useContext } from "react";
import { Modal } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import { SidebarContext } from "../../contexts/SidebarContext";
import {
  getPriceListFromStripeAPI,
  getUserSubscriptionDetailsAPI,
  activeSubscriptionPlan,
  upgradeSubscriptionPlanAPI,
} from "../../api/subscriptions";
import {
  formatFirstPaymentLabel,
  formatOptionPrice,
  getStudioCheckoutOptions,
  resolveStudioPurchaseMode,
} from "../../utils/subscriptionPricing";
import { toast } from "react-toastify";
import { isPrivilegedRole } from "../../utils";
import "./OliviaPurchaseModal.scss";

const EllisPurchaseModal = ({
  show,
  onHide,
  successUrl,
  onUpgraded,
}) => {
  const navigate = useNavigate();
  const { setTriggerNavContent } = useContext(SidebarContext) || {};
  const [loadingPrices, setLoadingPrices] = useState(false);
  const [studioOptions, setStudioOptions] = useState([]);
  const [membershipPricing, setMembershipPricing] = useState(null);
  const [requiresMembershipFee, setRequiresMembershipFee] = useState(false);
  const [studioPurchaseMode, setStudioPurchaseMode] = useState({
    mode: "checkout",
    subscriptionId: null,
  });
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
        const [priceData, subscriptionData] = await Promise.all([
          getPriceListFromStripeAPI(),
          getUserSubscriptionDetailsAPI(),
        ]);
        if (cancelled) return;

        const list = priceData?.priceList || [];
        setStudioOptions(getStudioCheckoutOptions(list));
        setMembershipPricing(priceData?.membership || null);
        setRequiresMembershipFee(Boolean(priceData?.requiresMembershipFee));
        setStudioPurchaseMode(resolveStudioPurchaseMode(subscriptionData, list));
      } catch (err) {
        if (!cancelled) {
          console.error("Failed to load Ellis pricing:", err);
          toast.error("Could not load pricing. Please try again.");
        }
      } finally {
        if (!cancelled) setLoadingPrices(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [show, onHide]);

  const handleViewAllPlans = () => {
    onHide();
    navigate("/dashboard/userprofile?tab=subscription");
  };

  const handleStudioSelect = async (priceId) => {
    setCheckingOutPriceId(priceId);
    try {
      if (studioPurchaseMode.mode === "upgrade") {
        if (!studioPurchaseMode.subscriptionId) {
          toast.error("Missing active subscription id for upgrade");
          return;
        }
        await upgradeSubscriptionPlanAPI({
          subscriptionId: studioPurchaseMode.subscriptionId,
          newPriceId: priceId,
        });
        toast.success("Upgraded to Studio! EllisAI® is now available.");
        onUpgraded?.();
        setTriggerNavContent?.((count) => count + 1);
        onHide();
        return;
      }

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
      console.error("Ellis purchase error:", err);
      toast.error(
        err?.response?.data?.message || "Could not complete purchase. Please try again."
      );
    } finally {
      setCheckingOutPriceId(null);
    }
  };

  const isUpgradeFlow = studioPurchaseMode.mode === "upgrade";

  const getButtonLabel = (option) => {
    const intervalLabel = option.interval === "year" ? "Yearly" : "Monthly";
    const priceLabel = formatOptionPrice(option);
    if (isUpgradeFlow) {
      return `Upgrade to Studio ${intervalLabel} — ${priceLabel}`;
    }
    const firstPayment =
      requiresMembershipFee && membershipPricing
        ? formatFirstPaymentLabel(option, membershipPricing)
        : null;
    return firstPayment || `Studio ${intervalLabel} — ${priceLabel}`;
  };

  return (
    <Modal
      show={show}
      onHide={onHide}
      aria-labelledby="ellis-purchase-title"
      centered
      dialogClassName="olivia-purchase-modal__dialog"
      className="storygroove-theme olivia-purchase-modal"
    >
      <Modal.Body className="text-center px-4 py-5">
        <div className="olivia-purchase-icon-wrapper mb-3">
          <img
            src="/assets/images/Ellis-Avatar.jpg"
            alt="EllisAI"
            className="olivia-purchase-icon"
          />
        </div>

        <h4 id="ellis-purchase-title" className="fw-bold mb-3">
          Edit with EllisAI&reg;
        </h4>
        <div className="olivia-purchase-message mb-4">
          <p className="mb-3">
            EllisAI&reg; is your developmental editor and scene architect — get a
            global editorial letter, chapter-by-chapter revision plan, and
            interactive scene-level coaching on your manuscript.
          </p>
          <p className="mb-0">
            {isUpgradeFlow
              ? "Upgrade your Builder plan to Studio to unlock Ellis along with everything you already have in the novelist studio."
              : "Choose the Studio plan to unlock Ellis along with SimoneAI\u00AE and OliviaAI\u00AE in the complete novelist studio."}
          </p>
        </div>

        {loadingPrices ? (
          <p className="olivia-purchase-loading mb-0">Loading pricing…</p>
        ) : studioOptions.length === 0 ? (
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
            {studioOptions.map((option) => {
              const isLoading = checkingOutPriceId === option.priceId;

              return (
                <button
                  key={option.priceId}
                  type="button"
                  className="olivia-purchase-btn olivia-purchase-btn--primary"
                  onClick={() => handleStudioSelect(option.priceId)}
                  disabled={Boolean(checkingOutPriceId)}
                >
                  {isLoading ? "Processing…" : getButtonLabel(option)}
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

export default EllisPurchaseModal;
