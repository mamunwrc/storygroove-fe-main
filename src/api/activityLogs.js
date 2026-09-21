import { axiosSecureInstance } from "./axios";

export function getActivityLogs(params = {}) {
  return axiosSecureInstance.get("/api/admin/activity-logs", { params });
}
