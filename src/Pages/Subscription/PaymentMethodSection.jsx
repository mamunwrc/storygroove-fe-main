import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Elements, CardElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { Spinner } from "react-bootstrap";
import { toast } from "react-toastify";
import {
  createPaymentMethodSetupIntentAPI,
  getPaymentMethodAPI,
  replacePaymentMethodAPI,
} from "../../api/subscriptions";
import "./PaymentMethodSection.scss";

const formatBrand = (brand) => {
  if (!brand) return "Card";
  return brand.charAt(0).toUpperCase() + brand.slice(1);
};

const formatExpiry = (month, year) => {
  if (!month || !year) return null;
  const mm = String(month).padStart(2, "0");
  const yy = String(year).slice(-2);
  return `${mm}/${yy}`;
};

const CARD_ELEMENT_OPTIONS = {
  style: {
    base: {
      color: "#1b1b1b",
      fontFamily: "Inter, sans-serif",
      fontSize: "16px",
      "::placeholder": { color: "#9ca3af" },
    },
    invalid: { color: "#b91c1c" },
  },
  hidePostalCode: true,
};

const UpdateCardForm = ({ clientSecret, onCancel, onSuccess }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const [cardComplete, setCardComplete] = useState(false);
  const [cardError, setCardError] = useState(null);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!stripe || !elements || submitting || !clientSecret) return;

    const cardElement = elements.getElement(CardElement);
    if (!cardElement) return;

    setSubmitting(true);
    setCardError(null);
    try {
      // Card data goes only to Stripe via Stripe.js — never to our backend.
      const { setupIntent, error } = await stripe.confirmCardSetup(clientSecret, {
        payment_method: { card: cardElement },
      });

      if (error) {
        setCardError(error.message || "Card could not be verified.");
        return;
      }

      const paymentMethodId =
        typeof setupIntent?.payment_method === "string"
          ? setupIntent.payment_method
          : setupIntent?.payment_method?.id;

      if (!paymentMethodId) {
        throw new Error("Stripe did not return a payment method.");
      }

      const result = await replacePaymentMethodAPI(paymentMethodId);
      toast.success(
        result?.message ||
          "Payment method updated. Future charges will use the new card."
      );
      onSuccess?.(result?.paymentMethod || null);
    } catch (err) {
      console.error("Update card error:", err);
      const message =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to update payment method.";
      setCardError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="sg-payment-method__form" onSubmit={handleSubmit}>
      <p className="sg-payment-method__secure-note">
        Card details are entered securely through Stripe and never stored on
        StoryGroove servers.
      </p>
      <div className="sg-payment-method__card-element">
        <CardElement
          options={CARD_ELEMENT_OPTIONS}
          onChange={(event) => {
            setCardComplete(Boolean(event.complete));
            setCardError(event.error?.message || null);
          }}
        />
      </div>
      {cardError && (
        <p className="sg-payment-method__error" role="alert">
          {cardError}
        </p>
      )}
      <div className="sg-payment-method__form-actions">
        <button
          type="button"
          className="sg-btn sg-btn--secondary"
          onClick={onCancel}
          disabled={submitting}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="sg-btn sg-btn--primary"
          disabled={!stripe || !cardComplete || submitting}
        >
          {submitting ? <Spinner size="sm" /> : "Save new card"}
        </button>
      </div>
    </form>
  );
};

const PaymentMethodSection = () => {
  const [loading, setLoading] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState(null);
  const [hasStripeCustomer, setHasStripeCustomer] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [stripePromise, setStripePromise] = useState(null);
  const [clientSecret, setClientSecret] = useState(null);
  const [startingUpdate, setStartingUpdate] = useState(false);

  const loadPaymentMethod = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getPaymentMethodAPI();
      setPaymentMethod(data?.paymentMethod || null);
      setHasStripeCustomer(Boolean(data?.hasStripeCustomer));
    } catch (err) {
      console.error("Failed to load payment method:", err);
      toast.error(
        err?.response?.data?.message || "Could not load payment method."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPaymentMethod();
  }, [loadPaymentMethod]);

  const closeUpdateForm = () => {
    setUpdating(false);
    setClientSecret(null);
    setStripePromise(null);
  };

  const startUpdate = async () => {
    setStartingUpdate(true);
    try {
      const setup = await createPaymentMethodSetupIntentAPI();
      const key =
        setup?.publishableKey || process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY;
      if (!key || !setup?.clientSecret) {
        toast.error(
          "Stripe is not configured for card updates. Contact support."
        );
        return;
      }
      setStripePromise(loadStripe(key));
      setClientSecret(setup.clientSecret);
      setUpdating(true);
    } catch (err) {
      console.error("Failed to start card update:", err);
      toast.error(
        err?.response?.data?.message ||
          "Could not start card update. Subscribe first, then try again."
      );
    } finally {
      setStartingUpdate(false);
    }
  };

  const cardLabel = useMemo(() => {
    if (!paymentMethod?.last4) return null;
    const brand = formatBrand(paymentMethod.brand);
    const expiry = formatExpiry(paymentMethod.expMonth, paymentMethod.expYear);
    return {
      brand,
      last4: paymentMethod.last4,
      expiry,
    };
  }, [paymentMethod]);

  if (loading) {
    return (
      <section className="sg-payment-method">
        <div className="sg-payment-method__loading">
          <Spinner animation="border" size="sm" />
          <span>Loading payment method…</span>
        </div>
      </section>
    );
  }

  if (!hasStripeCustomer && !paymentMethod) {
    return null;
  }

  return (
    <section className="sg-payment-method" aria-labelledby="sg-payment-method-title">
      <div className="sg-payment-method__header">
        <div>
          <h3 id="sg-payment-method-title" className="sg-payment-method__title">
            Payment method
          </h3>
          <p className="sg-payment-method__desc">
            Your subscription renews on this card. Update it anytime — changes
            apply to future charges only.
          </p>
        </div>
        {!updating && (
          <button
            type="button"
            className="sg-btn sg-btn--secondary sg-payment-method__cta"
            onClick={startUpdate}
            disabled={startingUpdate || !hasStripeCustomer}
          >
            {startingUpdate ? <Spinner size="sm" /> : "Update card"}
          </button>
        )}
      </div>

      {cardLabel ? (
        <div className="sg-payment-method__card-summary">
          <div className="sg-payment-method__card-icon" aria-hidden="true">
            <svg width="28" height="20" viewBox="0 0 28 20" fill="none">
              <rect width="28" height="20" rx="3" fill="#0C2D48" />
              <rect y="5" width="28" height="4" fill="#18A7E4" />
              <rect x="4" y="13" width="8" height="2" rx="1" fill="#ffffff" opacity="0.85" />
            </svg>
          </div>
          <div>
            <div className="sg-payment-method__card-main">
              {cardLabel.brand} ending in {cardLabel.last4}
            </div>
            {cardLabel.expiry && (
              <div className="sg-payment-method__card-meta">
                Expires {cardLabel.expiry}
              </div>
            )}
          </div>
        </div>
      ) : (
        <p className="sg-payment-method__empty">
          No card on file yet. After you subscribe, your payment card will appear
          here.
        </p>
      )}

      {updating && stripePromise && clientSecret && (
        <Elements stripe={stripePromise}>
          <UpdateCardForm
            clientSecret={clientSecret}
            onCancel={closeUpdateForm}
            onSuccess={(nextMethod) => {
              setPaymentMethod(nextMethod);
              closeUpdateForm();
            }}
          />
        </Elements>
      )}
    </section>
  );
};

export default PaymentMethodSection;
