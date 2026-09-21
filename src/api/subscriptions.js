import { axiosSecureInstance } from "./axios";

export const getUserSubscriptionDetailsAPI = async () => {
  const { data } = await axiosSecureInstance.get("/api/stripe/get");
  return data;
};

export const getUserSubscriptionDetailsAPIV2 = async() => {
  const { data } = await axiosSecureInstance.get("/api/stripe/v2/get");
  return data;
};

export const getAgentAccessAPI = async () => {
  const { data } = await axiosSecureInstance.get("/api/stripe/v2/agent-access");
  return data;
};

export const getSubscriptionPlansAPI = async() => {
  const { data } = await axiosSecureInstance.get("/api/subscription/list");
  return data;
};

export const getSubscriptionPlansAPIV2 = async() => {
  const { data } = await axiosSecureInstance.get("/api/subscription/v2/list");
  return data;
};

export const getPriceListFromStripeAPI = async () => {
  const { data } = await axiosSecureInstance.get("/api/stripe/get-price-list");
  return data;
};

export const activeSubscriptionPlan = async(requestBody) => {
  const { data } = await axiosSecureInstance.post("/api/stripe/create", requestBody);
  return data;
};

export const createSimoneOneTimeCheckoutAPI = async (requestBody = {}) => {
  const { data } = await axiosSecureInstance.post(
    "/api/stripe/simone/one-time-checkout",
    requestBody
  );
  return data;
};

export const upgradeSubscriptionPlanAPI = async (requestBody) => {
  const { data } = await axiosSecureInstance.post("/api/stripe/upgrade", requestBody);
  return data;
};

export const downgradeSubscriptionPlanAPI = async (requestBody) => {
  const { data } = await axiosSecureInstance.post("/api/stripe/downgrade", requestBody);
  return data;
};

export const cancelActiveSubscriptionPlanAPI = async (requestBody) => {
  const { data } = await axiosSecureInstance.delete("/api/stripe/cancel", {
    data: requestBody,
  });
  return data;
};

export const pauseSubscriptionPlanAPI = async (requestBody) => {
  const { data } = await axiosSecureInstance.post("/api/stripe/pause", requestBody);
  return data;
};

export const resumeSubscriptionPlanAPI = async (requestBody) => {
  const { data } = await axiosSecureInstance.post("/api/stripe/resume", requestBody);
  return data;
};

export const managePaymentAPI = async () => {
  const { data } = await axiosSecureInstance.post(
    "/api/stripe/create-portal-session"
  );
  return data;
};

export const getPaymentMethodAPI = async () => {
  const { data } = await axiosSecureInstance.get("/api/stripe/payment-method");
  return data;
};

export const createPaymentMethodSetupIntentAPI = async () => {
  const { data } = await axiosSecureInstance.post(
    "/api/stripe/payment-method/setup-intent"
  );
  return data;
};

export const replacePaymentMethodAPI = async (paymentMethodId) => {
  const { data } = await axiosSecureInstance.post("/api/stripe/payment-method", {
    paymentMethodId,
  });
  return data;
};

// Superadmin-only: generate a Stripe Checkout link on behalf of a selected user.
export const createManualInviteCheckoutAPI = async (requestBody) => {
  const { data } = await axiosSecureInstance.post(
    "/api/stripe/admin/invite-checkout",
    requestBody
  );
  return data;
};

// Superadmin-only: email a previously-generated invite checkout link to the user.
export const sendManualInviteCheckoutEmailAPI = async (requestBody) => {
  const { data } = await axiosSecureInstance.post(
    "/api/stripe/admin/invite-checkout/email",
    requestBody
  );
  return data;
};
