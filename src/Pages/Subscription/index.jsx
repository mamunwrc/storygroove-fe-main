import React, { useState, useEffect, useContext } from "react";
import { useLocation } from "react-router-dom";
import { Alert, Spinner } from "react-bootstrap";
import { FaChevronDown, FaLock } from "react-icons/fa";
import { SidebarContext } from "../../contexts/SidebarContext";

import "./subscription-new.scss";
import PaymentMethodSection from "./PaymentMethodSection";
import { isEllisGated, isOliviaPurchaseGated } from "../../constants/featureFlags";
import {
  getUserSubscriptionDetailsAPI,
  getPriceListFromStripeAPI,
  activeSubscriptionPlan,
  createSimoneOneTimeCheckoutAPI,
  upgradeSubscriptionPlanAPI,
  downgradeSubscriptionPlanAPI,
  cancelActiveSubscriptionPlanAPI,
  pauseSubscriptionPlanAPI,
  resumeSubscriptionPlanAPI,
} from "../../api/subscriptions";

const CheckIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="sg-check-icon"
    aria-hidden
  >
    <path d="M20 6 9 17l-5-5" />
  </svg>
);

const formatOptionPrice = (option) => {
  if (!option) return "N/A";
  const suffix = option.interval === "year" ? "annually" : "mo";
  return `$${option.amount}/${suffix}`;
};

const formatAccessEndDate = (isoDate) => {
  if (!isoDate) return null;
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
};

const formatFirstPaymentLabel = (option, membership) => {
  if (!option || !membership?.amount) return null;
  const total = Number(option.amount) + Number(membership.amount);
  const formattedTotal = Number.isInteger(total) ? total : total.toFixed(2);
  return `$${formattedTotal} due today, then ${formatOptionPrice(option)}`;
};

const normalizePriceOption = (price) => ({
  priceId: price.id,
  amount: Number((price.unit_amount || 0) / 100),
  interval: price.recurring?.interval || "month",
  nickname: price.nickname || "",
});

const mapPriceListToTierOptions = (priceList = []) => {
  const grouped = {
    builder: { monthly: null, yearly: null },
    studio: { monthly: null, yearly: null },
  };

  for (const price of priceList) {
    if (price?.type !== "recurring" || price?.active === false) continue;
    const tier = (price.tier || "").toLowerCase();
    if (tier !== "builder" && tier !== "studio") continue;
    const slot = price.recurring?.interval === "year" ? "yearly" : "monthly";
    grouped[tier][slot] = normalizePriceOption(price);
  }

  return grouped;
};

const getActiveSubscriptionDetails = (subscriptionResponse) => {
  const stripeSubscription = subscriptionResponse?.subscription;
  const firstItem = stripeSubscription?.items?.data?.[0];
  const price = firstItem?.price;

  return {
    subscriptionId: stripeSubscription?.id || null,
    priceId: price?.id || null,
    amount: Number((price?.unit_amount || 0) / 100),
    status: stripeSubscription?.status || null,
    cancelAtPeriodEnd: stripeSubscription?.cancel_at_period_end === true,
    accessEndsAt: subscriptionResponse?.accessEndsAt || null,
    canManageSubscription: subscriptionResponse?.canManageSubscription === true,
    isCanceledWithinPaidPeriod:
      subscriptionResponse?.isCanceledWithinPaidPeriod === true,
    isPausePlan: subscriptionResponse?.isPausePlan === true,
    resumePriceId: subscriptionResponse?.resumePriceId || null,
  };
};

const PLAN_TIER_RANK = { builder: 1, studio: 2 };

const STARTER_BENEFITS = [
  "Turn your idea into a clear, compelling concept",
  "Get your logline, synopsis, and opening scene concept",
  "Receive your market readiness score",
  "Download your Story Starter Kit Report and writing roadmap",
  "Walk away ready to build your story blueprint and outline",
];

const MEMBERSHIP_BENEFITS = [
  "Access to the StoryGroove interactive AI novel coaching system",
  "Private community access and member resources",
  "Access to future StoryGroove features and coaches as they are released",
  "Your coaches remember your work as your manuscript evolves",
  "Long-term story continuity and organization",
  "Own your work. Export anytime.",

];

const BUILDER_BENEFITS = [
  "Work interactively with OliviaAI® to turn your novel idea, messy notes, partial draft, or discovery draft into a clear chapter-by-chapter plan built for a stronger first draft.",
  "Build a chapter-by-chapter novel roadmap with strong beat structure, scene purpose, character arc movement, subplot development, and genre-aware pacing.",
  "Start from a new idea, messy notes, or partial draft and turn it into a clear, draftable outline.",
  "Rebuild a discovery draft that feels flat, messy, or out of order, without starting your story from scratch.",
  "Strengthen the story before you keep drafting, so every chapter has a job, every scene moves the book forward, and your draft has real momentum.",
  "Get chapter-level coaching as you write, with guidance on structure, story logic, pacing, emotional stakes, character arcs, and revision choices.",
  "Strengthen your craft skills in real time as Olivia coaches you through scene structure, design & purpose.",
  "Keep your outline, chapters, characters, Story Bible, notes, and coaching history organized in one AI connected workspace.",
  "Use Olivia's project memory as your novel grows, so your structure, characters, and story decisions stay consistent from chapter to chapter.",
  "Capture ideas instantly with built-in voice typing and dictation.",
  "Access the private StoryGroove writer community; weekly group writing sessions, author education, and live support.",
  "Move from idea or messy draft to a structured, confidence-building writing plan that helps you write the strongest draft you can.",
  "Hit confidence-building milestones as you move from idea to structured draft.",
  "Keep human authorship at the center while Olivia interactively provides real-time coaching as you write the book only you can write."
];

const STUDIO_BENEFITS = [
  "Revise interactively with EllisAI® as your developmental editor and scene architect",
  "Get a chapter-by-chapter developmental editing roadmap to strengthen structure, character arcs, pacing, and scene purpose",
  "Learn story craft through interactive feedback applied directly to your manuscript",
  "Strengthen your manuscript and level up your craft with deeper developmental insight, greater clarity, and stronger narrative direction",
  "Move closer to an agent- and publisher-ready manuscript with a smarter revision process",
  
];

const StepDivider = () => (
  <div className="sg-step-divider" aria-hidden>
    <FaChevronDown />
  </div>
);

const StepHeader = ({ step, title, subtitle }) => (
  <div className="sg-step-header">
    {step != null && <span className="sg-step-badge">STEP {step}</span>}
    <h2 className="sg-step-title">{title}</h2>
    {subtitle && <p className="sg-step-subtitle">{subtitle}</p>}
  </div>
);

const BenefitList = ({ items, columns = 1, variant = "light" }) => (
  <ul className={`sg-benefits-list sg-benefits-list--cols-${columns} sg-benefits-list--${variant}`}>
    {items.map((item) => (
      <li key={item}>
        <CheckIcon />
        <span>{item}</span>
      </li>
    ))}
  </ul>
);

const Subscription = () => {
  const location = useLocation();
  const { setTriggerNavContent } = useContext(SidebarContext) || {};
  const [subscriptionPlans, setSubscriptionPlans] = useState([]);
  const [membershipPricing, setMembershipPricing] = useState(null);
  const [requiresMembershipFee, setRequiresMembershipFee] = useState(false);
  const [currentSubscription, setCurrentSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingActions, setLoadingActions] = useState({
    cancel: false,
    pause: false,
    resume: false,
    subscribe: {},
    simone: false,
  });
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [showPauseConfirm, setShowPauseConfirm] = useState(false);

  const refreshSubscription = async () => {
    const updated = await getUserSubscriptionDetailsAPI();
    setCurrentSubscription(updated || null);
    setTriggerNavContent?.((count) => count + 1);
    return updated;
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [plansResult, subscriptionResult] = await Promise.allSettled([
          getPriceListFromStripeAPI(),
          getUserSubscriptionDetailsAPI(),
        ]);

        if (plansResult.status === "fulfilled") {
          const plans = plansResult.value?.priceList || [];
          setSubscriptionPlans(plans);
          setMembershipPricing(plansResult.value?.membership || null);
          setRequiresMembershipFee(Boolean(plansResult.value?.requiresMembershipFee));
        } else {
          setError("Failed to load pricing data. Please refresh the page.");
          console.error("Error fetching price list:", plansResult.reason);
        }

        if (subscriptionResult.status === "fulfilled") {
          setCurrentSubscription(subscriptionResult.value || null);
        }
      } catch (err) {
        setError("Failed to load subscription data");
        console.error("Error fetching subscription data:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleSubscribe = async (priceId) => {
    try {
      setLoadingActions((prev) => ({
        ...prev,
        subscribe: { ...prev.subscribe, [priceId]: true },
      }));
      setError(null);
      setSuccess(null);

      const params = new URLSearchParams(location.search);
      const successUrl = params.get("successUrl") || undefined;
      const response = await activeSubscriptionPlan({
        priceId,
        ...(successUrl && { successUrl }),
      });

      if (response.url) {
        window.location.href = response.url.trim();
      } else if (response.object === "session") {
        window.location.href = response.session.url;
      } else if (response.object === "subscriber") {
        setSuccess("Subscription updated successfully!");
        const updatedSubscription = await getUserSubscriptionDetailsAPI();
        setCurrentSubscription(updatedSubscription);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to subscribe to plan");
    } finally {
      setLoadingActions((prev) => ({
        ...prev,
        subscribe: { ...prev.subscribe, [priceId]: false },
      }));
    }
  };

  const handleSimoneCheckout = async () => {
    if (getActiveSubscriptionDetails(currentSubscription).priceId) return;
    setLoadingActions((prev) => ({ ...prev, simone: true }));
    setError(null);
    try {
      const params = new URLSearchParams(location.search);
      const successUrl = params.get("successUrl") || window.location.href;
      const res = await createSimoneOneTimeCheckoutAPI({ successUrl });
      if (res?.url) {
        window.location.href = res.url;
        return;
      }
      setError("Could not open checkout. Please try again.");
    } catch (err) {
      setError(err?.response?.data?.message || "Could not open checkout. Please try again.");
    } finally {
      setLoadingActions((prev) => ({ ...prev, simone: false }));
    }
  };

  const handleUpgrade = async (newPriceId) => {
    if (!activeSubscription.subscriptionId) {
      setError("Missing active subscription id for upgrade");
      return;
    }
    try {
      setLoadingActions((prev) => ({
        ...prev,
        subscribe: { ...prev.subscribe, [newPriceId]: true },
      }));
      setError(null);
      setSuccess(null);
      await upgradeSubscriptionPlanAPI({
        subscriptionId: activeSubscription.subscriptionId,
        newPriceId,
      });
      setSuccess("Subscription upgraded successfully!");
      setCurrentSubscription(await getUserSubscriptionDetailsAPI());
    } catch (err) {
      setError(err.response?.data?.message || "Failed to upgrade subscription");
    } finally {
      setLoadingActions((prev) => ({
        ...prev,
        subscribe: { ...prev.subscribe, [newPriceId]: false },
      }));
    }
  };

  const handleDowngrade = async (newPriceId) => {
    if (!activeSubscription.subscriptionId) {
      setError("Missing active subscription id for downgrade");
      return;
    }
    try {
      setLoadingActions((prev) => ({
        ...prev,
        subscribe: { ...prev.subscribe, [newPriceId]: true },
      }));
      setError(null);
      setSuccess(null);
      await downgradeSubscriptionPlanAPI({
        subscriptionId: activeSubscription.subscriptionId,
        newPriceId,
      });
      setSuccess("Subscription downgraded successfully!");
      setCurrentSubscription(await getUserSubscriptionDetailsAPI());
    } catch (err) {
      setError(err.response?.data?.message || "Failed to downgrade subscription");
    } finally {
      setLoadingActions((prev) => ({
        ...prev,
        subscribe: { ...prev.subscribe, [newPriceId]: false },
      }));
    }
  };

  const handleCancel = async () => {
    if (!activeSubscription.subscriptionId) {
      setError("Missing active subscription id for cancel");
      return;
    }
    try {
      setLoadingActions((prev) => ({ ...prev, cancel: true }));
      setError(null);
      setSuccess(null);
      await cancelActiveSubscriptionPlanAPI({
        subscriptionId: activeSubscription.subscriptionId,
      });
      setSuccess(
        "Your subscription is set to cancel at the end of your billing period. You'll keep full access until then."
      );
      await refreshSubscription();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to cancel subscription");
    } finally {
      setLoadingActions((prev) => ({ ...prev, cancel: false }));
    }
  };

  const handlePause = async () => {
    if (!activeSubscription.subscriptionId) {
      setError("Missing active subscription id for pause");
      return;
    }
    try {
      setLoadingActions((prev) => ({ ...prev, pause: true }));
      setError(null);
      setSuccess(null);
      await pauseSubscriptionPlanAPI({
        subscriptionId: activeSubscription.subscriptionId,
      });
      setSuccess(
        "Subscription paused. You can still view your work, but agent sessions are on hold until you resume."
      );
      setShowPauseConfirm(false);
      await refreshSubscription();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to pause subscription");
    } finally {
      setLoadingActions((prev) => ({ ...prev, pause: false }));
    }
  };

  const handleResume = async () => {
    if (!activeSubscription.subscriptionId) {
      setError("Missing active subscription id for resume");
      return;
    }
    try {
      setLoadingActions((prev) => ({ ...prev, resume: true }));
      setError(null);
      setSuccess(null);
      await resumeSubscriptionPlanAPI({
        subscriptionId: activeSubscription.subscriptionId,
      });
      setSuccess("Subscription resumed. Your Builder or Studio plan is active again.");
      await refreshSubscription();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to resume subscription");
    } finally {
      setLoadingActions((prev) => ({ ...prev, resume: false }));
    }
  };

  const activeSubscription = getActiveSubscriptionDetails(currentSubscription);
  const isSubscribedToPlan = (priceId) => activeSubscription.priceId === priceId;
  const tierOptions = mapPriceListToTierOptions(subscriptionPlans);
  const showMembershipSection = Boolean(membershipPricing?.amount);
  const showMembershipPricing =
    requiresMembershipFee && showMembershipSection;
  const membershipIncludedInPackage =
    showMembershipSection && !requiresMembershipFee;
  const isOnPausePlan = activeSubscription.isPausePlan;
  const isCanceledWithinPaidPeriod = activeSubscription.isCanceledWithinPaidPeriod;
  const accessEndsLabel = formatAccessEndDate(activeSubscription.accessEndsAt);
  const hasBuilderOrStudioPlan =
    Boolean(activeSubscription.priceId) && !isOnPausePlan;
  const hasActiveManageablePlan =
    hasBuilderOrStudioPlan && activeSubscription.canManageSubscription;
  const canModifySubscription = activeSubscription.canManageSubscription;
  const showOnboardingSteps = !hasBuilderOrStudioPlan && !isOnPausePlan;

  const builderOptions = [];
  if (tierOptions.builder.monthly) {
    builderOptions.push({ ...tierOptions.builder.monthly, tierKey: "builder" });
  }
  if (tierOptions.builder.yearly) {
    builderOptions.push({ ...tierOptions.builder.yearly, tierKey: "builder" });
  }

  const studioOptions = [];
  if (tierOptions.studio.monthly) {
    studioOptions.push({ ...tierOptions.studio.monthly, tierKey: "studio" });
  }
  if (tierOptions.studio.yearly) {
    studioOptions.push({ ...tierOptions.studio.yearly, tierKey: "studio" });
  }

  const activeOption = [...builderOptions, ...studioOptions].find(
    (option) => option.priceId === activeSubscription.priceId
  );
  const activeTierRank = activeOption ? PLAN_TIER_RANK[activeOption.tierKey] : null;
  const starterIncludedInActivePlan = hasBuilderOrStudioPlan;

  const getActionLabel = (option) => {
    if (isSubscribedToPlan(option.priceId)) {
      if (isCanceledWithinPaidPeriod && accessEndsLabel) {
        return `Active until ${accessEndsLabel}`;
      }
      return "Active";
    }
    const intervalLabel = option.interval === "year" ? "Yearly" : "Monthly";
    if (!hasActiveManageablePlan && !isOnPausePlan) return `Choose ${intervalLabel}`;
    const optionTierRank = PLAN_TIER_RANK[option.tierKey];
    let action = "Upgrade";
    if (activeTierRank != null && optionTierRank !== activeTierRank) {
      action = optionTierRank > activeTierRank ? "Upgrade" : "Downgrade";
    } else {
      action = option.amount >= activeSubscription.amount ? "Upgrade" : "Downgrade";
    }
    return `${action} ${intervalLabel}`;
  };

  const getActionType = (option) => {
    if (!hasActiveManageablePlan && !isOnPausePlan) return "create";
    const optionTierRank = PLAN_TIER_RANK[option.tierKey];
    if (activeTierRank != null && optionTierRank !== activeTierRank) {
      return optionTierRank > activeTierRank ? "upgrade" : "downgrade";
    }
    return option.amount >= activeSubscription.amount ? "upgrade" : "downgrade";
  };

  const handleOptionClick = (option) => {
    const actionType = getActionType(option);
    if (actionType === "create") {
      handleSubscribe(option.priceId);
      return;
    }
    if (actionType === "upgrade") {
      handleUpgrade(option.priceId);
      return;
    }
    handleDowngrade(option.priceId);
  };

  const renderCoachingButtons = (options, planKey) => {
    if (isOnPausePlan) {
      return (
        <div className="sg-coaching-card__cta">
          <p className="sg-coming-soon">
            Resume your subscription to start or change your coaching plan.
          </p>
          <div className="sg-coaching-card__footer-note" aria-hidden="true" />
        </div>
      );
    }

    if (options.length === 0) {
      return (
        <div className="sg-coaching-card__cta">
          <button type="button" className="sg-btn sg-btn--muted" disabled>
            Not available
          </button>
          <div className="sg-coaching-card__footer-note" aria-hidden="true" />
        </div>
      );
    }

    const isDisabledByFlag =
      planKey === "studio" ? isEllisGated() : isOliviaPurchaseGated();

    const footerMessage =
      isDisabledByFlag && planKey === "builder"
        ? "OliviaAI\u00AE is being fine-tuned\u2014Builder & Studio plans open soon."
        : isDisabledByFlag && planKey === "studio"
          ? "EllisAI\u00AE is being fine-tuned\u2014Studio plan opens soon."
          : null;

    return (
      <div className="sg-coaching-card__cta">
        <div className="sg-coaching-actions">
          {options.map((option) => {
            const isCurrent = isSubscribedToPlan(option.priceId);
            const isLoading = loadingActions.subscribe[option.priceId];
            const label = getActionLabel(option);
            const firstPayment =
              showMembershipPricing && !hasActiveManageablePlan && !isOnPausePlan
                ? formatFirstPaymentLabel(option, membershipPricing)
                : null;

            return (
              <div key={option.priceId} className="sg-coaching-action-item">
                <button
                  type="button"
                  className={`sg-btn ${isCurrent ? "sg-btn--muted" : "sg-btn--primary"}`}
                  onClick={() => {
                    if (isLoading || isCurrent || isDisabledByFlag) return;
                    handleOptionClick(option);
                  }}
                  disabled={isLoading || isCurrent || isDisabledByFlag}
                >
                  {isLoading ? <Spinner size="sm" /> : label}
                </button>
                {firstPayment && !isCurrent && (
                  <p className="sg-payment-note">{firstPayment}</p>
                )}
              </div>
            );
          })}
        </div>
        <div
          className="sg-coaching-card__footer-note"
          aria-hidden={!footerMessage}
        >
          {footerMessage && (
            <p className="sg-coming-soon">{footerMessage}</p>
          )}
        </div>
      </div>
    );
  };

  const formatTierPriceDisplay = (options) => {
    if (options.length === 0) return "Pricing unavailable";
    return options.map((o) => formatOptionPrice(o)).join(" or ");
  };

  if (loading) {
    return (
      <div className="sg-pricing-page sg-pricing-page--loading">
        <Spinner animation="border" role="status" />
      </div>
    );
  }

  const membershipAmount = membershipPricing?.amount ?? 297;

  return (
    <div className="sg-pricing-page">
      {error && (
        <Alert variant="danger" onClose={() => setError(null)} dismissible className="sg-alert">
          {error}
        </Alert>
      )}
      {success && (
        <Alert variant="success" onClose={() => setSuccess(null)} dismissible className="sg-alert">
          {success}
        </Alert>
      )}

      <PaymentMethodSection />

      <div className="sg-pricing-flow">
        {showOnboardingSteps && (
          <>
            {/* STEP 1 — Starter */}
            <section className="sg-step-section">
              <StepHeader
                step={1}
                title="Starter Edition"
                subtitle="Answer SimoneAI® 20 Socratic Questions About Your Novel Concept & Get Your Story Starter Kit"
              />

              <div className="sg-starter-card">
                <div className="sg-starter-card__persona">
                  <img
                    src="/assets/images/simone.png"
                    alt="SimoneAI"
                    className="sg-avatar sg-avatar--lg"
                    onError={(e) => {
                      e.target.src = "/assets/images/Simone-Avatar.jpg";
                    }}
                  />
                  <div className="sg-persona-name">SimoneAI®</div>
                  <div className="sg-persona-role">
                    Story Starter &amp; Market Positioning Coach
                  </div>
                </div>

                <hr className="sg-card-divider" />

                <div className="sg-starter-card__designed">
                  <span className="sg-label">Designed For</span>
                  <p>Writers shaping an idea and testing market fit</p>
                </div>

                <hr className="sg-card-divider" />

                <BenefitList items={STARTER_BENEFITS} />

                <div className="sg-starter-card__footer">
                  <div className="sg-price-highlight">Only $7</div>
                  <button
                    type="button"
                    className={`sg-btn sg-btn--wide ${
                      starterIncludedInActivePlan ? "sg-btn--muted" : "sg-btn--primary"
                    }`}
                    onClick={handleSimoneCheckout}
                    disabled={loadingActions.simone || starterIncludedInActivePlan}
                  >
                    {loadingActions.simone ? (
                      <Spinner size="sm" />
                    ) : starterIncludedInActivePlan ? (
                      "Included in your plan"
                    ) : (
                      "Get Your Story Starter Kit With SimoneAI®"
                    )}
                  </button>
                  <p className="sg-no-membership">
                    {starterIncludedInActivePlan
                      ? "SimoneAI® is included with your Builder or Studio plan"
                      : "No membership required"}
                  </p>
                </div>
              </div>
            </section>

            {showMembershipSection && (
              <>
                <StepDivider />

                {/* STEP 2 — Membership */}
                <section className="sg-step-section">
                  <StepHeader
                    step={2}
                    title="StoryGroove Coaching System Membership"
                    subtitle="Your one-time entry into the StoryGroove novelist studio"
                  />

                  <div
                    className={`sg-membership-card ${
                      membershipIncludedInPackage ? "sg-membership-card--included" : ""
                    }`}
                  >
                    <div className="sg-membership-card__body">
                      <div className="sg-membership-card__icon" aria-hidden>
                        <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                          <circle cx="24" cy="24" r="24" fill="#0C2D48" />
                          <circle cx="24" cy="18" r="7" fill="white" />
                          <path
                            d="M10 40c0-7.732 6.268-14 14-14s14 6.268 14 14"
                            fill="white"
                          />
                          <path
                            d="M34 10l2 4 4 1-3 3 1 4-4-2-4 2 1-4-3-3 4-1z"
                            fill="#18A7E4"
                          />
                        </svg>
                      </div>

                      <div className="sg-membership-card__pricing">
                        <div className="sg-membership-price">
                          ${membershipAmount}{" "}
                          <span className="sg-membership-price__tag">ONE-TIME</span>
                        </div>
                        {membershipIncludedInPackage ? (
                          <p className="sg-membership-included-note">
                            {hasBuilderOrStudioPlan
                              ? "Included with your active Builder or Studio plan"
                              : "Already included on your account — no additional fee required"}
                          </p>
                        ) : (
                          <p className="sg-membership-price__desc">
                            One-time membership fee. Required to join the studio.
                          </p>
                        )}
                      </div>

                      <div className="sg-membership-card__benefits">
                        <BenefitList items={MEMBERSHIP_BENEFITS} columns={2} />
                      </div>
                    </div>

                    <div className="sg-membership-banner">
                      <FaLock className="sg-membership-banner__icon" aria-hidden />
                      <span>
                        {membershipIncludedInPackage
                          ? hasBuilderOrStudioPlan
                            ? "Your Builder or Studio plan includes full StoryGroove membership access."
                            : "Membership access is already on your account. Choose a coaching team below when you're ready."
                          : "You pay the membership fee once. Your monthly coaching plan is separate and can be upgraded later."}
                      </span>
                    </div>
                  </div>
                </section>
              </>
            )}

            <StepDivider />
          </>
        )}

        {/* Coaching team — Step 3 in funnel, or sole view after purchase */}
        <section className="sg-step-section">
          <StepHeader
            step={showOnboardingSteps ? (showMembershipSection ? 3 : 2) : null}
            title="Choose Your Coaching Team"
            subtitle="Select the monthly coaching team that fits your writing journey"
          />

          {isCanceledWithinPaidPeriod && (
            <Alert variant="info" className="sg-alert sg-canceled-access-banner">
              Your subscription has been canceled
              {accessEndsLabel ? ` — you still have full access until ${accessEndsLabel}` : ""}.
              Choose a plan below to re-subscribe when you&apos;re ready.
            </Alert>
          )}

          <div className="sg-coaching-grid">
            {/* Builder */}
            <div className="sg-coaching-card sg-coaching-card--builder">
              <div className="sg-coaching-card__avatars">
                <img
                  src="/assets/images/simone.png"
                  alt="SimoneAI"
                  className="sg-avatar"
                  onError={(e) => {
                    e.target.src = "/assets/images/Simone-Avatar.jpg";
                  }}
                />
                <img
                  src="/assets/images/olivia.png"
                  alt="OliviaAI"
                  className="sg-avatar"
                  onError={(e) => {
                    e.target.src = "/assets/images/Olivia-Avatar.jpg";
                  }}
                />
              </div>

              <h3 className="sg-coaching-card__title">Builder Edition</h3>
              <p className="sg-coaching-card__team">
                SimoneAI® Story Starter &amp; Market Positioning Coach
                <br />
                OliviaAI® Story Bible &amp; Plot Coach
              </p>

              <div className="sg-coaching-card__price">
                {formatTierPriceDisplay(builderOptions)}
              </div>
              {showMembershipPricing && (
                <p className="sg-coaching-card__membership-note">
                  + ${membershipAmount} one-time membership at checkout (new members)
                </p>
              )}

              <p className="sg-coaching-card__includes">
                Includes SimoneAI® + OliviaAI®
              </p>

              <hr className="sg-card-divider" />

              <div className="sg-coaching-card__designed">
                <span className="sg-label">Designed For</span>
                <p>
                  Writers developing and drafting their novel with structure,
                  coaching, and an integrated writing workspace.
                </p>
              </div>

              <hr className="sg-card-divider" />

              <div className="sg-coaching-card__benefits">
                <span className="sg-label">Everything in Starter, plus:</span>
                <BenefitList items={BUILDER_BENEFITS} columns={2} />
              </div>

              {renderCoachingButtons(builderOptions, "builder")}
            </div>

            {/* Studio */}
            <div className="sg-coaching-card sg-coaching-card--studio">
              <div className="sg-studio-badge">The Complete Studio Experience</div>

              <div className="sg-coaching-card__avatars">
                <img
                  src="/assets/images/simone.png"
                  alt="SimoneAI"
                  className="sg-avatar"
                  onError={(e) => {
                    e.target.src = "/assets/images/Simone-Avatar.jpg";
                  }}
                />
                <img
                  src="/assets/images/olivia.png"
                  alt="OliviaAI"
                  className="sg-avatar"
                  onError={(e) => {
                    e.target.src = "/assets/images/Olivia-Avatar.jpg";
                  }}
                />
                <img
                  src="/assets/images/ellis.png"
                  alt="EllisAI"
                  className="sg-avatar"
                  onError={(e) => {
                    e.target.src = "/assets/images/Ellis-Avatar.jpg";
                  }}
                />
              </div>

              <h3 className="sg-coaching-card__title">Studio Edition</h3>
              <p className="sg-coaching-card__team">
                SimoneAI® + OliviaAI® + EllisAI®
                <br />
                Developmental Editor &amp; Scene Architect
              </p>

              <div className="sg-coaching-card__price">
                {formatTierPriceDisplay(studioOptions)}
              </div>
              {showMembershipPricing && (
                <p className="sg-coaching-card__membership-note">
                  + ${membershipAmount} one-time membership at checkout (new members)
                </p>
              )}

              <p className="sg-coaching-card__includes">
                Includes SimoneAI® + OliviaAI® + EllisAI®
              </p>

              <hr className="sg-card-divider" />

              <div className="sg-coaching-card__designed">
                <span className="sg-label">Designed For</span>
                <p>
                  Writers revising, refining, and preparing a polished manuscript
                  with developmental editing support.
                </p>
              </div>

              <hr className="sg-card-divider" />

              <div className="sg-coaching-card__benefits">
                <span className="sg-label">Everything in Builder, plus:</span>
                <BenefitList items={STUDIO_BENEFITS} columns={2} variant="dark" />
              </div>

              {renderCoachingButtons(studioOptions, "studio")}
            </div>
          </div>
        </section>
      </div>

      {canModifySubscription && (
        <div className="sg-cancel-footer">
          {isOnPausePlan && (
            <Alert variant="warning" className="sg-pause-status-banner">
              Your subscription is paused. Your workspace and past work are locked
              until you resume. Simone, Olivia, and Ellis are on hold.
            </Alert>
          )}

          {!showCancelConfirm && !showPauseConfirm && (
            <div className="sg-manage-subscription">
              <div className="sg-manage-subscription__col">
                <h3 className="sg-manage-subscription__title">
                  {isOnPausePlan ? "Resume Subscription" : "Pause Subscription"}
                </h3>
                <p className="sg-manage-subscription__desc">
                  {isOnPausePlan ? (
                    <>
                      Your subscription is on pause. Resume to restore Simone,
                      Olivia, and Ellis&apos; coaching access.
                    </>
                  ) : (
                    <>
                      Need to take a break? Life happens. Pause for $19/month to
                      preserve your workspace and novel progress for up to three months per
                      calendar year. Access to your AI editorial team, project library,
                      and private community will be placed on hold until you reactivate
                      your membership.
                    </>
                  )}
                </p>
                {isOnPausePlan ? (
                  <button
                    type="button"
                    className="sg-btn sg-btn--primary sg-manage-subscription__cta"
                    onClick={handleResume}
                    disabled={loadingActions.resume}
                  >
                    {loadingActions.resume ? <Spinner size="sm" /> : "Resume Subscription"}
                  </button>
                ) : (
                  <button
                    type="button"
                    className="sg-btn sg-btn--secondary sg-manage-subscription__cta"
                    onClick={() => setShowPauseConfirm(true)}
                    disabled={loadingActions.pause}
                  >
                    Pause Subscription
                  </button>
                )}
              </div>

              <div className="sg-manage-subscription__divider" aria-hidden="true" />

              <div className="sg-manage-subscription__col sg-manage-subscription__col--cancel">
                <h3 className="sg-manage-subscription__title">Cancel Subscription</h3>
                <p className="sg-manage-subscription__desc">
                  You&apos;ll keep access through the end of your current billing period.
                  After your subscription ends, your workspace, project materials, and novel
                  progress will be deleted.
                  {!isOnPausePlan && (
                    <> Want to keep your workspace for later? Use Pause Mode instead.</>
                  )}
                </p>
                <button
                  type="button"
                  className="sg-btn sg-btn--danger sg-manage-subscription__cta"
                  onClick={() => setShowCancelConfirm(true)}
                >
                  Cancel Subscription
                </button>
              </div>
            </div>
          )}

          {showPauseConfirm && !showCancelConfirm && (
            <div className="sg-cancel-confirm">
              <p>
                Need to take a break? Life happens. Pause for $19/month to preserve
                your workspace and novel progress for up to three months per calendar year.
                Access to your AI editorial team, project library, and private community
                will be placed on hold until you reactivate your membership.
              </p>
              <div className="sg-cancel-confirm__actions">
                <button
                  type="button"
                  className="sg-btn sg-btn--primary"
                  onClick={() => setShowPauseConfirm(false)}
                  disabled={loadingActions.pause}
                >
                  Keep Plan
                </button>
                <button
                  type="button"
                  className="sg-btn sg-btn--secondary"
                  onClick={handlePause}
                  disabled={loadingActions.pause}
                >
                  {loadingActions.pause ? <Spinner size="sm" /> : "Pause Subscription"}
                </button>
              </div>
            </div>
          )}

          {showCancelConfirm && !showPauseConfirm && (
            <div className="sg-cancel-confirm">
              <p>
                You&apos;ll keep access through the end of your current billing period.
                After your subscription ends, your workspace, project materials, and novel
                progress will be deleted.
                {!isOnPausePlan && (
                  <> Want to keep your workspace for later? Use Pause Mode instead.</>
                )}
              </p>
              <div className="sg-cancel-confirm__actions">
                <button
                  type="button"
                  className="sg-btn sg-btn--primary"
                  onClick={() => setShowCancelConfirm(false)}
                  disabled={loadingActions.cancel}
                >
                  Keep Plan
                </button>
                <button
                  type="button"
                  className="sg-btn sg-btn--danger"
                  onClick={handleCancel}
                  disabled={loadingActions.cancel}
                >
                  {loadingActions.cancel ? <Spinner size="sm" /> : "Cancel Subscription"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Subscription;
