import { axiosSecureInstance } from "./axios";

// ---------------------------------------------------------------------------
// Rate-limit aware error class (used by fetch-based streaming calls)
// ---------------------------------------------------------------------------

export class RateLimitError extends Error {
  constructor({ status, dimension, current, limit, retryAfter, message }) {
    super(message);
    this.name = "RateLimitError";
    this.status = status;
    this.dimension = dimension;
    this.current = current;
    this.limit = limit;
    this.retryAfter = retryAfter;
  }
}

// Thrown when the BE rejects a chat/thread submission because the user's
// Stripe subscription is paused (pause_collection !== null).
// `message` carries the human-readable text the BE returned in `error`.
export class SubscriptionPausedError extends Error {
  constructor({ status, message }) {
    super(message);
    this.name = "SubscriptionPausedError";
    this.status = status;
    this.code = "SUBSCRIPTION_PAUSED";
  }
}

// ---------------------------------------------------------------------------
// NEW DEFAULT: Responses API endpoints (/api/v1/*)
// ---------------------------------------------------------------------------

// Create a new thread for Simone (title optional — backend defaults to "New Chat")
export const createAssistantThread = async (title) => {
  const body = { agentName: "simone" };
  if (title != null && String(title).trim() !== "") {
    body.title = String(title).trim();
  }
  return await axiosSecureInstance.post("/api/v1/thread", body);
};

// Create a new thread for Olivia.
// `forceNew`: start an additional versioned Olivia chat for the same Story
// Starter Kit. The prior chat stays active; the new chat is persisted with
// `proposedTitle` (falling back to `title`). Backend enforces title uniqueness
// across active siblings and returns 409 DUPLICATE_OUTLINE_TITLE on conflict.
export const createOliviaThread = async (
  title,
  starterKitContent = null,
  simoneThreadId = null,
  forceNew = false,
  proposedTitle = null
) => {
  const body = {
    agentName: "olivia",
    title: title || "New Chat",
  };
  if (starterKitContent) body.starterKitContent = starterKitContent;
  if (simoneThreadId) body.simoneThreadId = simoneThreadId;
  if (forceNew) body.forceNew = true;
  if (proposedTitle != null && String(proposedTitle).trim() !== "") {
    body.proposedTitle = String(proposedTitle).trim();
  }
  return await axiosSecureInstance.post("/api/v1/thread", body);
};

/**
 * List the user's active Olivia threads for a given Simone Story Starter Kit.
 * Used by the FE to auto-suggest a version-bumped working title (e.g.
 * "<Project> - Outline Version 2") when starting an additional Olivia chat.
 *
 * @param {string} simoneThreadId
 * @returns {Promise<{ data: { threads: { id: string, threadId: string, title: string }[] } }>}
 */
export const getOliviaSiblingsBySimoneThread = async (simoneThreadId) => {
  return await axiosSecureInstance.get(
    `/api/v1/thread/by-simone/${encodeURIComponent(simoneThreadId)}/olivia`
  );
};

// Send a chat message (works for both Simone and Olivia)
export const sendAssistantMessage = async (threadId, content, agentName = null) => {
  const body = {
    threadId,
    content,
  };
  
  if (agentName) {
    body.agentName = agentName;
  }
  
  return await axiosSecureInstance.post("/api/v1/chat", body);
};

/**
 * Upload one or more files for use as chat attachments.
 * Accepts a single File or an array of Files.
 * Returns { attachments: [{ fileUrl, fileType, fileName, fileSize }] }.
 */
export const uploadChatFile = async (files) => {
  const fileArray = Array.isArray(files) ? files : [files];
  const formData = new FormData();
  fileArray.forEach((f) => formData.append("files", f));
  const response = await axiosSecureInstance.post("/api/v1/chat/upload", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data;
};

/**
 * Send a chat message and receive an SSE stream of tokens.
 * Uses native fetch (axios does not support streaming responses).
 * Returns the raw Response so the caller can read the body stream.
 */
export const sendAssistantMessageStream = async (
  threadId,
  content,
  agentName = null,
  signal = null,
  attachments = null,
  webSearch = false
) => {
  const body = { threadId, content };
  if (agentName) body.agentName = agentName;
  if (Array.isArray(attachments) && attachments.length > 0) {
    body.attachments = attachments;
  }
  if (webSearch) body.webSearch = true;

  const response = await fetch(
    `${process.env.REACT_APP_BASE_URL}/api/v1/chat`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "text/event-stream",
        Authorization: `Bearer ${localStorage.getItem("userToken")}`,
      },
      body: JSON.stringify(body),
      signal,
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));

    if (response.status === 429 || (response.status === 403 && errorData.dimension)) {
      throw new RateLimitError({
        status: response.status,
        dimension: errorData.dimension,
        current: errorData.current,
        limit: errorData.limit,
        retryAfter: errorData.retryAfter,
        message: errorData.message || `Request failed with status ${response.status}`,
      });
    }

    if (response.status === 403 && errorData.code === "SUBSCRIPTION_PAUSED") {
      throw new SubscriptionPausedError({
        status: response.status,
        message:
          errorData.error ||
          errorData.message ||
          "Your subscription is paused. Please update billing to continue.",
      });
    }

    // BE handlers vary: some use `error`, some use `message`. Prefer the
    // human-readable text in either field before falling back to a generic string.
    throw new Error(
      errorData.error ||
        errorData.message ||
        `Request failed with status ${response.status}`
    );
  }

  return response;
};

// Get thread messages
export const getAssistantThreadMessages = async (threadId) => {
  return await axiosSecureInstance.get(`/api/v1/thread/${threadId}`);
};

// Get all user threads
export const getAssistantThreads = async () => {
  return await axiosSecureInstance.get("/api/v1/threads");
};

// ---------------------------------------------------------------------------
// Admin endpoints (unchanged -- still on /api/assistant)
// ---------------------------------------------------------------------------

// Get shared OpenAI API key (superadmin only)
export const getSharedOpenAIKey = async () => {
  const response = await axiosSecureInstance.get("/api/assistant/simone/key");
  return response.data;
};

// Set shared OpenAI API key (superadmin only; used by all users)
export const setSharedOpenAIKey = async (apiKey) => {
  const response = await axiosSecureInstance.post("/api/assistant/simone/key", { apiKey });
  return response.data;
};

// ---------------------------------------------------------------------------
// Admin endpoints (agent prompts)
// ---------------------------------------------------------------------------

// Get all agent prompts
export const getAgentPrompts = async () => {
  try {
    const response = await axiosSecureInstance.get("/api/assistant/agent/prompts");
    return { success: true, data: response.data };
  } catch (err) {
    return { success: false, message: err.response?.data?.message || "Failed to fetch agent prompts" };
  }
};

// Update agent prompt
export const updateAgentPrompt = async (prompt, agentName) => {
  try {
    const response = await axiosSecureInstance.post("/api/assistant/agent/prompt", {
      prompt,
      agentName,
    });
    return { success: true, data: response.data };
  } catch (err) {
    return { success: false, message: err.response?.data?.message || "Failed to update agent prompt" };
  }
};

export const exportAgentPromptsBundle = () =>
  wrap(
    () => axiosSecureInstance.get("/api/assistant/agent/prompts/export"),
    "Failed to export agent prompts"
  );

export const importAgentPromptsBundle = (bundle) =>
  wrap(
    () =>
      axiosSecureInstance.post("/api/assistant/agent/prompts/import", bundle),
    "Failed to import agent prompts"
  );

// ---------------------------------------------------------------------------
// Admin endpoints (Methodology — Phase 1.5C CRUD)
// ---------------------------------------------------------------------------
//
// Each helper returns `{ success, data, message }` to match the rest of
// the admin API surface in this file. The backend stamps every write
// with the current `METHODOLOGY_VERSION`, so callers should re-fetch
// after a mutation rather than caching client-side.

const wrap = async (fn, fallbackMessage) => {
  try {
    const response = await fn();
    return { success: true, data: response.data };
  } catch (err) {
    return {
      success: false,
      message: err.response?.data?.message || fallbackMessage,
    };
  }
};

export const getMethodologyRules = () =>
  wrap(
    () => axiosSecureInstance.get("/api/assistant/methodology/rules"),
    "Failed to fetch methodology rules"
  );

export const upsertMethodologyRule = (rule) =>
  wrap(
    () => axiosSecureInstance.post("/api/assistant/methodology/rule", rule),
    "Failed to save methodology rule"
  );

export const deleteMethodologyRule = (key) =>
  wrap(
    () =>
      axiosSecureInstance.delete(
        `/api/assistant/methodology/rule/${encodeURIComponent(key)}`
      ),
    "Failed to disable methodology rule"
  );

export const getPromptTemplates = () =>
  wrap(
    () => axiosSecureInstance.get("/api/assistant/methodology/templates"),
    "Failed to fetch prompt templates"
  );

export const upsertPromptTemplate = (template) =>
  wrap(
    () =>
      axiosSecureInstance.post("/api/assistant/methodology/template", template),
    "Failed to save prompt template"
  );

export const getGenreOverlays = () =>
  wrap(
    () => axiosSecureInstance.get("/api/assistant/methodology/overlays"),
    "Failed to fetch genre overlays"
  );

export const upsertGenreOverlay = (overlay) =>
  wrap(
    () =>
      axiosSecureInstance.post("/api/assistant/methodology/overlay", overlay),
    "Failed to save genre overlay"
  );

export const deleteGenreOverlay = (genreKey) =>
  wrap(
    () =>
      axiosSecureInstance.delete(
        `/api/assistant/methodology/overlay/${encodeURIComponent(genreKey)}`
      ),
    "Failed to disable genre overlay"
  );

export const runMethodologyAudit = () =>
  wrap(
    () => axiosSecureInstance.post("/api/assistant/methodology/audit"),
    "Failed to run methodology audit"
  );

export const exportMethodologyBundle = () =>
  wrap(
    () => axiosSecureInstance.get("/api/assistant/methodology/export"),
    "Failed to export methodology"
  );

export const importMethodologyBundle = (bundle) =>
  wrap(
    () =>
      axiosSecureInstance.post("/api/assistant/methodology/import", bundle),
    "Failed to import methodology"
  );

// ---------------------------------------------------------------------------
// LEGACY: Assistants API endpoints (explicit access via -old suffix)
// ---------------------------------------------------------------------------

export const createAssistantThread_old = async (title, assistantId) => {
  return await axiosSecureInstance.post("/api/v1/thread-old", {
    title,
    assistantId,
  });
};

export const createOliviaThread_old = async (title) => {
  return await axiosSecureInstance.post("/api/v1/thread-old", {
    agentName: "olivia",
    title: title || "New Chat",
  });
};

export const sendAssistantMessage_old = async (threadId, content, agentName = null) => {
  const body = {
    threadId,
    content,
  };
  
  if (agentName) {
    body.agentName = agentName;
  }
  
  return await axiosSecureInstance.post("/api/v1/chat-old", body);
};

export const getAssistantThreadMessages_old = async (threadId) => {
  return await axiosSecureInstance.get(`/api/v1/thread-old/${threadId}`);
};
