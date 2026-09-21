import { axiosSecureInstance } from "./axios";

export async function getSummaryStats() {
  return axiosSecureInstance.get("/api/admin/usage/summary");
}

export async function getUserUsageList(params = {}) {
  return axiosSecureInstance.get("/api/admin/usage/users", { params });
}

export async function getUserCostHistory(userId, params = {}) {
  return axiosSecureInstance.get(`/api/admin/usage/users/${userId}/history`, {
    params,
  });
}

export async function getRateLimitEvents(params = {}) {
  return axiosSecureInstance.get("/api/admin/usage/rate-limit-events", {
    params,
  });
}

export async function blockUser(userId) {
  return axiosSecureInstance.post(`/api/admin/usage/users/${userId}/block`);
}

export async function unblockUser(userId) {
  return axiosSecureInstance.post(`/api/admin/usage/users/${userId}/unblock`);
}

export async function updateUserLimit(userId, limits) {
  return axiosSecureInstance.patch(
    `/api/admin/usage/users/${userId}/limit`,
    limits
  );
}

export async function getGlobalSettings() {
  return axiosSecureInstance.get("/api/admin/usage/settings");
}

export async function updateGlobalSettings(settings) {
  return axiosSecureInstance.patch("/api/admin/usage/settings", settings);
}

export async function unlockUserLoginAPI(userId) {
  return axiosSecureInstance.post(`/api/user/unlock/${userId}`);
}

export async function recomputeCosts() {
  return axiosSecureInstance.post("/api/admin/usage/recompute-costs");
}

export async function getRecomputeJob(jobId) {
  return axiosSecureInstance.get(`/api/admin/usage/recompute-costs/${jobId}`);
}
