import { areQuillHtmlEquivalent } from "../../utils/quillHtmlNormalize.js";

export const STALE_CONTENT_CODE = "STALE_CONTENT";

export const toUpdatedAtIso = (value) => {
  if (value == null || value === "") return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value.toISOString();
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

export const isNewerUpdatedAt = (serverUpdatedAt, lastKnownUpdatedAt) => {
  const serverIso = toUpdatedAtIso(serverUpdatedAt);
  if (!serverIso) return false;
  const knownIso = toUpdatedAtIso(lastKnownUpdatedAt);
  if (!knownIso) return true;
  return new Date(serverIso).getTime() > new Date(knownIso).getTime();
};

export const getStaleContentPayload = (error) => {
  const data = error?.response?.data;
  if (error?.response?.status !== 409 || data?.code !== STALE_CONTENT_CODE) {
    return null;
  }
  return {
    userContent: data.userContent ?? "",
    updatedAt: data.updatedAt,
  };
};

/**
 * @returns {"ignore" | "adopt-token" | "apply" | "conflict"}
 */
export const decideRemoteDraftAction = ({
  serverUpdatedAt,
  lastKnownUpdatedAt,
  isDirty = false,
  serverHtml = "",
  localHtml = "",
} = {}) => {
  if (!isNewerUpdatedAt(serverUpdatedAt, lastKnownUpdatedAt)) {
    return "ignore";
  }
  if (areQuillHtmlEquivalent(serverHtml ?? "", localHtml ?? "")) {
    return "adopt-token";
  }
  if (!isDirty) return "apply";
  return "conflict";
};
