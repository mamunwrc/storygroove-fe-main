import { axiosSecureInstance } from "./axios";

export const createNewBook = async (requestBody) => {
  const response = await axiosSecureInstance.post(
    "/api/novel/create",
    requestBody
  );
  return response;
};

export const uploadManuscript = async (requestBody) => {
  const formData = new FormData();
  formData.append("name", requestBody.name);
  formData.append("bookIdea", requestBody.logline || "");
  formData.append("document", requestBody.manuscript);
  const response = await axiosSecureInstance.post(
    "/api/novel/uploadmanuscript",
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }
  );
  return response;
};

export const getAllBooks = async () => {
  const response = await axiosSecureInstance.get("/api/novel/list");
  return response;
};

export const getBooksPaginated = async (page = 1, limit = 20, agent) => {
  let url = `/api/novel/list?page=${page}&limit=${limit}`;
  if (agent && agent !== "all") url += `&agent=${agent}`;
  const response = await axiosSecureInstance.get(url);
  return response;
};

/**
 * Most recently opened project for the current user — drives the dashboard
 * "Your recent work" banner. Returns `{ work, novel }` where `work` may be a
 * novel, Simone thread, Olivia thread, or Ellis upload.
 */
export const getMostRecentNovel = async () => {
  const response = await axiosSecureInstance.get("/api/novel/recent");
  return response.data;
};

export const recordRecentWorkAccess = async (payload) => {
  const response = await axiosSecureInstance.post(
    "/api/novel/recent-access",
    payload
  );
  return response.data;
};

export const getABook = async (id) => {
  const response = await axiosSecureInstance.get(`/api/novel/${id}`);
  return response;
};

export const getBookReviews = async (id) => {
  const response = await axiosSecureInstance.get(`/api/novel/review/${id}`);
  return response;
};

export const reviewBook = async (body) => {
  const response = await axiosSecureInstance.post(`/api/novel/review`, body);
  return response.data.data;
};

export const updateBook = async (requestBody) => {
  const response = await axiosSecureInstance.post(
    `/api/novel/update`,
    requestBody
  );
  return response;
};

export const deleteBook = async (id, metadata = {}) => {
  const response = await axiosSecureInstance.delete(`/api/novel/${id}`, {
    data: metadata,
  });
  return response;
};

export const generateBook = async (payloadData) => {
  try {
    const response = await fetch(
      `${process.env.REACT_APP_BASE_URL}/api/novel/generate`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("userToken")}`,
        },
        body: JSON.stringify(payloadData),
      }
    );

    const contentType = response.headers.get("content-type");
    const isJson = contentType && contentType.includes("application/json");

    const data = isJson ? await response.json() : await response.text();

    if (!response.ok) {
      return {
        error: true,
        message:
          data?.message ||
          (typeof data === "string" ? data : "Something went wrong"),
        status: response.status,
        raw: data,
      };
    }

    return data;
  } catch (err) {
    console.error("Fetch Error:", err);
    return {
      error: true,
      message: err.message || "Network error",
    };
  }
};

// characters api
export const createCharacter = async (requestBody) => {
  const response = await axiosSecureInstance.post(
    `api/novel/character`,
    requestBody
  );
  return response;
};

export const createCharacterTest = async (payloadData) => {
  const response = await fetch("http://localhost:8086/api/novel/character", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${localStorage.getItem("userToken")}`,
    },
    body: JSON.stringify(payloadData),
  });
  return response;
};

export const renameScene = async (requestBody) => {
  const response = await axiosSecureInstance.post(
    `api/novel/scene/rename`,
    requestBody
  );
  return response;
};

export const deleteScene = async (sceneId) => {
  const response = await axiosSecureInstance.delete(`api/novel/scene/${sceneId}`);
  return response;
};

export const archiveScene = async (sceneId) => {
  const response = await axiosSecureInstance.post(
    `api/novel/scene/${sceneId}/archive`
  );
  return response;
};

export const unarchiveScene = async (sceneId) => {
  const response = await axiosSecureInstance.post(
    `api/novel/scene/${sceneId}/unarchive`
  );
  return response;
};

export const getAllCharactersOfaBook = async (id) => {
  const response = await axiosSecureInstance.get(
    `/api/novel/character/list/${id}`
  );
  return response;
};

/** Fetch a single character's latest DB state (bypasses stale frontend cache). */
export const getCharacterDetails = async (characterId) => {
  const response = await axiosSecureInstance.get(
    `/api/novel/character/${characterId}`
  );
  return response.data;
};
export const setOpenaiKeyFunction = async (requestBody) => {
  const response = await axiosSecureInstance.post(
    "api/user/openaikey",
    requestBody
  );
  return response;
};

export const updateUserContent = async (requestBody, config = {}) => {
  const response = await axiosSecureInstance.post(
    `api/novel/usercontent`,
    requestBody,
    config
  );
  return response;
};

export const getUserContentById = async (contentId, config = {}) => {
  const response = await axiosSecureInstance.get(
    `api/novel/usercontent/id/${contentId}`,
    config
  );
  return response;
};

export const getNotesInNovel = async (novelId, userContentId) => {
  const params = userContentId ? { userContentId } : {};
  const response = await axiosSecureInstance.get(`/api/novel/note/${novelId}`, {
    params,
  });
  return response;
};

export const updateNotesInNovel = async (body) => {
  const response = await axiosSecureInstance.post(`/api/novel/note`, body);
  return response;
};

export const addNewScene = async (body) => {
  const response = await axiosSecureInstance.post(`/api/novel/scene/add`, body);
  return response.data;
};

export const reorderScene = async (body) => {
  const response = await axiosSecureInstance.post(
    `/api/novel/scene/reorder`,
    body
  );
  return response;
};

/** Add a blank chapter on an uploaded manuscript (Ellis Manuscript Map). */
export const addUploadedChapter = async (body) => {
  const response = await axiosSecureInstance.post(
    `/api/novel/chapter/add`,
    body
  );
  return response.data;
};

/** Reorder a chapter on an uploaded manuscript (renumbers chapterNumber). */
export const reorderUploadedChapter = async (body) => {
  const response = await axiosSecureInstance.post(
    `/api/novel/chapter/reorder`,
    body
  );
  return response;
};

/** Soft-delete an uploaded-manuscript chapter (sets deletedAt, renumbers the rest). */
export const deleteUploadedChapter = async (chapterId) => {
  const response = await axiosSecureInstance.delete(
    `/api/novel/chapter/${chapterId}`
  );
  return response;
};

/** Park an uploaded-manuscript chapter to visit later (renumbers remaining 1..N). */
export const archiveUploadedChapter = async (chapterId) => {
  const response = await axiosSecureInstance.post(
    `/api/novel/chapter/${chapterId}/archive`
  );
  return response;
};

/** Restore an archived uploaded-manuscript chapter to its original Map slot. */
export const unarchiveUploadedChapter = async (chapterId) => {
  const response = await axiosSecureInstance.post(
    `/api/novel/chapter/${chapterId}/unarchive`
  );
  return response;
};

export const completeBook = async (id) => {
  const response = await axiosSecureInstance.patch(`/api/novel/complete/${id}`);
  return response;
};

/**
 * Match backend safe stem for fallback when Content-Disposition is unreadable (e.g. old proxies).
 */
function safeManuscriptFileStem(title) {
  const s = String(title || "")
    .replace(/\*{1,3}/g, "")
    .replace(/_{1,3}/g, "")
    .trim()
    .slice(0, 120);
  const stem =
    s.replace(/[/\\?%*:|"<>]/g, "-").replace(/\s+/g, " ").trim() || "Novel";
  return stem;
}

function parseFilenameFromContentDisposition(header) {
  if (!header || typeof header !== "string") return null;
  const star = header.match(/filename\*\s*=\s*[^']*''([^;\n]+)/i);
  if (star && star[1]) {
    try {
      return decodeURIComponent(star[1].trim());
    } catch {
      return star[1].trim();
    }
  }
  const quoted = header.match(/filename\s*=\s*"((?:\\.|[^"\\])*)"/i);
  if (quoted) return quoted[1].replace(/\\"/g, '"');
  const unquoted = header.match(/filename\s*=\s*([^;\n]+)/i);
  if (unquoted) {
    return unquoted[1].trim().replace(/^["']|["']$/g, "");
  }
  return null;
}

/**
 * @param {string} id - Novel id
 * @param {{ suggestedTitle?: string }} [options] - Fallback filename stem if header missing (novel title)
 */
export const downloadManuscript = async (id, options = {}) => {
  const { suggestedTitle } = options;
  try {
    const response = await axiosSecureInstance.get(
      `/api/novel/download/${id}`,
      {
        responseType: "blob",
      }
    );

    const contentDisposition = response.headers["content-disposition"];
    let filename =
      parseFilenameFromContentDisposition(contentDisposition) ||
      `${safeManuscriptFileStem(suggestedTitle)}_Manuscript.docx`;

    if (!filename.toLowerCase().endsWith(".docx")) {
      filename = `${filename.replace(/\.[^/.]+$/, "")}.docx`;
    }

    // Create and trigger download
    const blob = new Blob([response.data], {
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });

    const downloadUrl = window.URL.createObjectURL(blob);

    const downloadLink = document.createElement("a");
    downloadLink.href = downloadUrl;
    downloadLink.download = filename;
    downloadLink.style.display = "none";

    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);

    // Cleanup
    window.URL.revokeObjectURL(downloadUrl);

    return response;
  } catch (error) {
    console.error("Download manuscript error:", error);
    throw error;
  }
};

/**
 * @param {string} id - Novel id
 * @param {{ suggestedTitle?: string }} [options] - Fallback filename stem if header missing (novel title)
 */
export const downloadOutline = async (id, options = {}) => {
  const { suggestedTitle } = options;
  try {
    const response = await axiosSecureInstance.get(
      `/api/novel/download-outline/${id}`,
      {
        responseType: "blob",
      }
    );

    const contentDisposition = response.headers["content-disposition"];
    let filename =
      parseFilenameFromContentDisposition(contentDisposition) ||
      `${safeManuscriptFileStem(suggestedTitle)}_Outline.docx`;

    if (!filename.toLowerCase().endsWith(".docx")) {
      filename = `${filename.replace(/\.[^/.]+$/, "")}.docx`;
    }

    const blob = new Blob([response.data], {
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });

    const downloadUrl = window.URL.createObjectURL(blob);
    const downloadLink = document.createElement("a");
    downloadLink.href = downloadUrl;
    downloadLink.download = filename;
    downloadLink.style.display = "none";

    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
    window.URL.revokeObjectURL(downloadUrl);

    return response;
  } catch (error) {
    console.error("Download outline error:", error);
    throw error;
  }
};

/**
 * @param {string} id - Novel id
 * @param {{ suggestedTitle?: string }} [options] - Fallback filename stem if header missing (novel title)
 */
export const downloadCharacters = async (id, options = {}) => {
  const { suggestedTitle } = options;
  try {
    const response = await axiosSecureInstance.get(
      `/api/novel/download-characters/${id}`,
      {
        responseType: "blob",
      }
    );

    const contentDisposition = response.headers["content-disposition"];
    let filename =
      parseFilenameFromContentDisposition(contentDisposition) ||
      `${safeManuscriptFileStem(suggestedTitle)}_Characters.docx`;

    if (!filename.toLowerCase().endsWith(".docx")) {
      filename = `${filename.replace(/\.[^/.]+$/, "")}.docx`;
    }

    const blob = new Blob([response.data], {
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });

    const downloadUrl = window.URL.createObjectURL(blob);
    const downloadLink = document.createElement("a");
    downloadLink.href = downloadUrl;
    downloadLink.download = filename;
    downloadLink.style.display = "none";

    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
    window.URL.revokeObjectURL(downloadUrl);

    return response;
  } catch (error) {
    console.error("Download characters error:", error);
    throw error;
  }
};

/**
 * @param {string} id - Novel id
 * @param {{ suggestedTitle?: string }} [options] - Fallback filename stem if header missing (novel title)
 */
export const downloadStoryBible = async (id, options = {}) => {
  const { suggestedTitle } = options;
  try {
    const response = await axiosSecureInstance.get(
      `/api/novel/download-story-bible/${id}`,
      {
        responseType: "blob",
      }
    );

    const contentDisposition = response.headers["content-disposition"];
    let filename =
      parseFilenameFromContentDisposition(contentDisposition) ||
      `${safeManuscriptFileStem(suggestedTitle)}_Story_Bible.docx`;

    if (!filename.toLowerCase().endsWith(".docx")) {
      filename = `${filename.replace(/\.[^/.]+$/, "")}.docx`;
    }

    const blob = new Blob([response.data], {
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });

    const downloadUrl = window.URL.createObjectURL(blob);
    const downloadLink = document.createElement("a");
    downloadLink.href = downloadUrl;
    downloadLink.download = filename;
    downloadLink.style.display = "none";

    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
    window.URL.revokeObjectURL(downloadUrl);

    return response;
  } catch (error) {
    console.error("Download story bible error:", error);
    throw error;
  }
};

/**
 * Download the Manuscript Map (chapter / POV / summary) for an
 * uploaded manuscript as a .docx file.
 * @param {string} id - Novel id
 * @param {{ suggestedTitle?: string }} [options] - Fallback filename stem if header missing (novel title)
 */
export const downloadManuscriptMap = async (id, options = {}) => {
  const { suggestedTitle } = options;
  try {
    const response = await axiosSecureInstance.get(
      `/api/novel/download-manuscript-map/${id}`,
      {
        responseType: "blob",
      }
    );

    const contentDisposition = response.headers["content-disposition"];
    let filename =
      parseFilenameFromContentDisposition(contentDisposition) ||
      `${safeManuscriptFileStem(suggestedTitle)}_Manuscript_Map.docx`;

    if (!filename.toLowerCase().endsWith(".docx")) {
      filename = `${filename.replace(/\.[^/.]+$/, "")}.docx`;
    }

    const blob = new Blob([response.data], {
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });

    const downloadUrl = window.URL.createObjectURL(blob);
    const downloadLink = document.createElement("a");
    downloadLink.href = downloadUrl;
    downloadLink.download = filename;
    downloadLink.style.display = "none";

    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
    window.URL.revokeObjectURL(downloadUrl);

    return response;
  } catch (error) {
    console.error("Download manuscript map error:", error);
    throw error;
  }
};

/**
 * Download the saved Ellis editorial letter as a .docx file.
 * @param {string} id - Novel id
 * @param {{ suggestedTitle?: string }} [options] - Fallback filename stem if header missing (novel title)
 */
export const downloadEditorialLetter = async (id, options = {}) => {
  const { suggestedTitle } = options;
  try {
    const response = await axiosSecureInstance.get(
      `/api/novel/download-editorial-letter/${id}`,
      {
        responseType: "blob",
      }
    );

    const contentDisposition = response.headers["content-disposition"];
    let filename =
      parseFilenameFromContentDisposition(contentDisposition) ||
      `${safeManuscriptFileStem(suggestedTitle)}_Editorial_Letter.docx`;

    if (!filename.toLowerCase().endsWith(".docx")) {
      filename = `${filename.replace(/\.[^/.]+$/, "")}.docx`;
    }

    const blob = new Blob([response.data], {
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });

    const downloadUrl = window.URL.createObjectURL(blob);
    const downloadLink = document.createElement("a");
    downloadLink.href = downloadUrl;
    downloadLink.download = filename;
    downloadLink.style.display = "none";

    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
    window.URL.revokeObjectURL(downloadUrl);

    return response;
  } catch (error) {
    console.error("Download editorial letter error:", error);
    throw error;
  }
};

/**
 * Download all inserted Ellis chapter reviews + Chapter Notes as a .docx.
 * @param {string} id - Novel id
 * @param {{ suggestedTitle?: string }} [options] - Fallback filename stem if header missing (novel title)
 */
export const downloadChapterPlan = async (id, options = {}) => {
  const { suggestedTitle } = options;
  try {
    const response = await axiosSecureInstance.get(
      `/api/novel/download-chapter-plan/${id}`,
      {
        responseType: "blob",
      }
    );

    const contentDisposition = response.headers["content-disposition"];
    let filename =
      parseFilenameFromContentDisposition(contentDisposition) ||
      `${safeManuscriptFileStem(suggestedTitle)}_Chapter_Plan.docx`;

    if (!filename.toLowerCase().endsWith(".docx")) {
      filename = `${filename.replace(/\.[^/.]+$/, "")}.docx`;
    }

    const blob = new Blob([response.data], {
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });

    const downloadUrl = window.URL.createObjectURL(blob);
    const downloadLink = document.createElement("a");
    downloadLink.href = downloadUrl;
    downloadLink.download = filename;
    downloadLink.style.display = "none";

    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
    window.URL.revokeObjectURL(downloadUrl);

    return response;
  } catch (error) {
    console.error("Download Editing Plan error:", error);
    throw error;
  }
};

/**
 * @param {object} params
 * @param {string} params.oliviaResponse
 * @param {string} [params.sourceThreadId] Dashboard Olivia thread id (recommended for dashboard flow)
 * @param {boolean} [params.forceNew] Create an additional draft (must use a unique sibling title)
 * @param {string} [params.proposedNovelName] Working title override (validated when forceNew)
 */
export const createNovelFromOlivia = async ({
  oliviaResponse,
  sourceThreadId = null,
  forceNew = false,
  proposedNovelName = null,
}) => {
  const body = { oliviaResponse };
  if (sourceThreadId != null && String(sourceThreadId).trim() !== "") {
    body.sourceThreadId = String(sourceThreadId).trim();
  }
  if (forceNew) body.forceNew = true;
  if (proposedNovelName != null && String(proposedNovelName).trim() !== "") {
    body.proposedNovelName = String(proposedNovelName).trim();
  }
  const response = await axiosSecureInstance.post(
    "/api/novel/create-from-olivia",
    body
  );
  return response;
};

/**
 * Fetch sibling outline novels created from a given Olivia thread (current user only).
 * Used to auto-suggest a "[Project Title] - Outline Version N" working title when the
 * user opts to create another outline from the same Story Bible.
 *
 * @param {string} threadId Olivia thread id
 * @returns {Promise<{ data: { outlines: { id: string, name: string }[] } }>}
 */
export const getOutlineSiblingsByThread = async (threadId) => {
  return await axiosSecureInstance.get(
    `/api/novel/by-thread/${encodeURIComponent(threadId)}/outlines`
  );
};

// ---------------------------------------------------------------------------
// Olivia outline context (scene + editor chat)
// ---------------------------------------------------------------------------

/**
 * Attach authoritative outline layout snapshot fields to an Olivia POST body.
 * @param {object} body
 * @param {{ outlineLayout?: object[], outlineRevision?: number, outlineChange?: object } | null} outlineContext
 */
export const appendOutlineContextToBody = (body, outlineContext = null) => {
  if (!outlineContext) return body;
  if (outlineContext.outlineLayout?.length) {
    body.outlineLayout = outlineContext.outlineLayout;
  }
  if (outlineContext.outlineRevision != null) {
    body.outlineRevision = outlineContext.outlineRevision;
  }
  if (outlineContext.outlineChange) {
    body.outlineChange = outlineContext.outlineChange;
  }
  return body;
};

/**
 * Coach Scene / editor focus fields for POST olivia-chat and olivia-scene-chat.
 * `draftScene` labels the selected editor scene without replacing outline `targetScene`.
 * @param {object} body
 * @param {{ targetScene?: object, draftScene?: object, manuscriptDraft?: string } | null} editorContext
 */
export const appendEditorContextToBody = (body, editorContext = null) => {
  if (!editorContext) return body;
  if (editorContext.targetScene) {
    body.targetScene = editorContext.targetScene;
  }
  if (editorContext.draftScene) {
    body.draftScene = editorContext.draftScene;
  }
  const draft = String(editorContext.manuscriptDraft || "").trim();
  if (draft) {
    body.manuscriptDraft = draft;
  }
  return body;
};

/**
 * Office 3 coaching context for POST olivia-coaching-chat.
 * Repeat Coach on a revised scene may be routed server-side as revision_review
 * when a prior full pass exists and manuscriptDraft hash changed.
 * @param {object} body
 * @param {{ targetScene?: object, manuscriptDraft?: string, coachingIntent?: string } | null} coachingContext
 */
export const appendCoachingContextToBody = (body, coachingContext = null) => {
  if (!coachingContext) return body;
  appendEditorContextToBody(body, coachingContext);
  if (coachingContext.coachingIntent) {
    body.coachingIntent = coachingContext.coachingIntent;
  }
  // A coached scene with no resolvable draft prose — lets the backend ask the
  // writer to open/add the draft instead of guessing.
  if (coachingContext.manuscriptDraftMissing) {
    body.manuscriptDraftMissing = true;
  }
  return body;
};

// ---------------------------------------------------------------------------
// Olivia Editor (scene layering)
// ---------------------------------------------------------------------------

/**
 * Send a message to the Olivia Editor chat for a specific novel.
 * Returns the raw fetch Response so the caller can read the SSE stream.
 */
export const sendOliviaEditorMessage = async (
  novelId,
  message,
  attachments = [],
  signal = null,
  webSearch = false,
  outlineContext = null,
  editorContext = null
) => {
  const body = { message };
  if (Array.isArray(attachments) && attachments.length > 0) {
    body.attachments = attachments;
  }
  if (webSearch) body.webSearch = true;
  appendOutlineContextToBody(body, outlineContext);
  appendEditorContextToBody(body, editorContext);
  const response = await fetch(
    `${process.env.REACT_APP_BASE_URL}/api/novel/${novelId}/olivia-chat`,
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
    throw new Error(errorData.message || errorData.error || `Request failed with status ${response.status}`);
  }
  return response;
};

/**
 * Send a message to the Olivia Office 3 coaching chat for a specific novel.
 * Returns the raw fetch Response so the caller can read the SSE stream.
 */
export const sendOliviaCoachingMessage = async (
  novelId,
  message,
  attachments = [],
  signal = null,
  webSearch = false,
  outlineContext = null,
  coachingContext = null
) => {
  const body = { message };
  if (Array.isArray(attachments) && attachments.length > 0) {
    body.attachments = attachments;
  }
  if (webSearch) body.webSearch = true;
  appendOutlineContextToBody(body, outlineContext);
  appendCoachingContextToBody(body, coachingContext);
  const response = await fetch(
    `${process.env.REACT_APP_BASE_URL}/api/novel/${novelId}/olivia-coaching-chat`,
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
    throw new Error(errorData.message || errorData.error || `Request failed with status ${response.status}`);
  }
  return response;
};

/** Fetch Olivia Office 3 coaching chat history (paginated). */
export const getOliviaCoachingHistory = async (novelId, { limit, before } = {}) => {
  const params = new URLSearchParams();
  if (limit != null) params.set("limit", String(limit));
  if (before) params.set("before", String(before));
  const qs = params.toString();
  const response = await axiosSecureInstance.get(
    `/api/novel/${novelId}/olivia-coaching-chat/history${qs ? `?${qs}` : ""}`
  );
  return response.data;
};

/** Fetch Olivia Editor chat history for a novel (paginated tail or older pages). */
export const getOliviaEditorHistory = async (novelId, { limit, before } = {}) => {
  const params = new URLSearchParams();
  if (limit != null) params.set("limit", String(limit));
  if (before) params.set("before", String(before));
  const qs = params.toString();
  const response = await axiosSecureInstance.get(
    `/api/novel/${novelId}/olivia-chat/history${qs ? `?${qs}` : ""}`
  );
  return response.data;
};

/**
 * Fetch the authoritative layering state (rows + next unfilled target) used
 * by the Insert button to resolve targets deterministically after streamed
 * rich-scene deliveries.
 */
export const getOliviaLayeringState = async (novelId) => {
  const response = await axiosSecureInstance.get(
    `/api/novel/${novelId}/olivia-layering/next-target`
  );
  return response.data;
};

/** Insert a new layered scene into the novel outline */
export const insertLayeredScene = async (body) => {
  const response = await axiosSecureInstance.post("/api/novel/scene/insert", body);
  return response.data;
};

/** Generate a rich scene markdown via AI */
export const generateRichScene = async (body) => {
  const response = await axiosSecureInstance.post("/api/novel/scene/generate-rich", body);
  return response.data;
};

/** Generate a rich scene markdown via SSE stream. Returns the raw Response for the caller to read. */
export const generateRichSceneStream = async (body, signal = null) => {
  const response = await fetch(
    `${process.env.REACT_APP_BASE_URL}/api/novel/scene/generate-rich-stream`,
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
    throw new Error(errorData.message || errorData.error || `Request failed with status ${response.status}`);
  }
  return response;
};

// ---------------------------------------------------------------------------
// Olivia Scene-by-Scene Chat (build outline one scene at a time)
// ---------------------------------------------------------------------------

/**
 * Send a message to the Olivia scene-by-scene chat for a specific novel.
 * Returns the raw fetch Response so the caller can read the SSE stream.
 * @param {object|null} draftContext selected-scene `manuscriptDraft` / `draftScene` (does not replace outline targetScene)
 */
export const sendOliviaSceneChatMessage = async (
  novelId,
  message,
  targetScene = null,
  signal = null,
  webSearch = false,
  outlineContext = null,
  attachments = [],
  draftContext = null
) => {
  const body = { message };
  if (Array.isArray(attachments) && attachments.length > 0) {
    body.attachments = attachments;
  }
  if (targetScene) body.targetScene = targetScene;
  if (webSearch) body.webSearch = true;
  appendOutlineContextToBody(body, outlineContext);
  appendEditorContextToBody(body, draftContext);
  const response = await fetch(
    `${process.env.REACT_APP_BASE_URL}/api/novel/${novelId}/olivia-scene-chat`,
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
    throw new Error(errorData.message || errorData.error || `Request failed with status ${response.status}`);
  }
  return response;
};

/** Fetch Olivia scene-by-scene chat history for a novel (paginated tail or older pages). */
export const getOliviaSceneChatHistory = async (novelId, { limit, before } = {}) => {
  const params = new URLSearchParams();
  if (limit != null) params.set("limit", String(limit));
  if (before) params.set("before", String(before));
  const qs = params.toString();
  const response = await axiosSecureInstance.get(
    `/api/novel/${novelId}/olivia-scene-chat/history${qs ? `?${qs}` : ""}`
  );
  return response.data;
};

/** Explicitly save a scene from Olivia chat into the outline (user-initiated) */
export const saveOliviaScene = async (novelId, messageId, targetScene) => {
  const response = await axiosSecureInstance.post(
    `/api/novel/${novelId}/olivia-save-scene`,
    { messageId, targetScene }
  );
  return response.data;
};

/** Update an existing Scene Design entry */
export const updateSceneSuggestion = async (body) => {
  const response = await axiosSecureInstance.put("/api/novel/scene/suggestion", body);
  return response.data;
};

/** Update editable fields on a character dossier (name, role, responseText, etc.) */
export const updateCharacter = async (characterId, fields) => {
  const response = await axiosSecureInstance.put(
    `/api/novel/character/${characterId}`,
    fields
  );
  return response.data;
};

/** Persist Characters-tab accordion order. */
export const reorderCharacters = async (novelId, orderedIds) => {
  const response = await axiosSecureInstance.post(
    `/api/novel/character/reorder`,
    { novelId, orderedIds }
  );
  return response.data;
};

/** Create a character with a seeded 17-point dossier (manual add, not AI generate). */
export const createManualCharacter = async (novelId, body) => {
  const response = await axiosSecureInstance.post(
    `/api/novel/${novelId}/character/manual`,
    body
  );
  return response.data;
};

/** Delete a character dossier. */
export const deleteCharacter = async (characterId) => {
  const response = await axiosSecureInstance.delete(
    `/api/novel/character/${characterId}`
  );
  return response.data;
};

/** Update the Story Bible master prompt for a novel */
export const updateMasterPrompt = async (novelId, masterPrompt) => {
  const response = await axiosSecureInstance.put(
    `/api/novel/${novelId}/master-prompt`,
    { masterPrompt }
  );
  return response.data;
};

/**
 * Update the dossier-free Story Bible. The backend writes only to
 * `Novel.storyBible`; `masterPrompt` (the original generation snapshot) is
 * preserved. This is the endpoint the Story Bible tab uses on save.
 */
export const updateStoryBible = async (novelId, storyBible) => {
  const response = await axiosSecureInstance.put(
    `/api/novel/${novelId}/story-bible`,
    { storyBible }
  );
  return response.data;
};

export const deleteThread = async (id) => {
  const response = await axiosSecureInstance.delete(`/api/v1/thread/${id}`);
  return response;
};

export const renameThread = async (id, title) => {
  const response = await axiosSecureInstance.patch(`/api/v1/thread/${id}/rename`, { title });
  return response;
};

export const pinThread = async (id, pinned) => {
  const response = await axiosSecureInstance.patch(`/api/v1/thread/${id}/pin`, { pinned });
  return response;
};

export const generateBookCover = async (novelId, message = "") => {
  const body = message?.trim() ? { message: message.trim() } : {};
  const response = await axiosSecureInstance.post(
    `/api/novel/${novelId}/cover/render`,
    body
  );
  return response;
};

export const getBookCover = async (novelId) => {
  const response = await axiosSecureInstance.get(`/api/novel/${novelId}/cover`);
  return response;
};

export const getCoverSession = async (novelId) => {
  const response = await axiosSecureInstance.get(`/api/novel/${novelId}/cover/session`);
  return response;
};

export const getCoverMessages = async (novelId, { before, limit = 50 } = {}) => {
  const params = new URLSearchParams();
  if (before) params.set("before", before);
  if (limit) params.set("limit", String(limit));
  const query = params.toString();
  const response = await axiosSecureInstance.get(
    `/api/novel/${novelId}/cover/messages${query ? `?${query}` : ""}`
  );
  return response;
};

export const sendCoverChat = async (novelId, message, attachments = []) => {
  const body = { message };
  if (Array.isArray(attachments) && attachments.length > 0) {
    body.attachments = attachments;
  }
  const response = await axiosSecureInstance.post(
    `/api/novel/${novelId}/cover/chat`,
    body
  );
  return response;
};

export const renderBookCover = async (novelId, { message = "", sourceMessageId } = {}) => {
  const body = {};
  if (message?.trim()) body.message = message.trim();
  if (sourceMessageId) body.sourceMessageId = sourceMessageId;
  const response = await axiosSecureInstance.post(
    `/api/novel/${novelId}/cover/render`,
    body
  );
  return response;
};

export const renderBookCoverStream = async (
  novelId,
  { message = "", sourceMessageId, signal } = {}
) => {
  const body = {};
  if (message?.trim()) body.message = message.trim();
  if (sourceMessageId) body.sourceMessageId = sourceMessageId;
  const response = await fetch(
    `${process.env.REACT_APP_BASE_URL}/api/novel/${novelId}/cover/render`,
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
  return response;
};

export const readCoverRenderSSE = async (
  response,
  { onPartial, onDone, onError } = {}
) => {
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("text/event-stream")) {
    const data = await response.json();
    if (data?.error) {
      const err = new Error(data.message || data.error);
      err.response = { status: response.status, data };
      onError?.(err);
      throw err;
    }
    onDone?.(data);
    return data;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let finalPayload = null;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";
    for (const line of lines) {
      if (!line.trim().startsWith("data:")) continue;
      const payload = line.trim().slice(5).trim();
      if (!payload) continue;
      let data;
      try {
        data = JSON.parse(payload);
      } catch {
        continue;
      }
      if (data.error) {
        const err = new Error(data.message || data.error);
        err.response = { status: response.status, data };
        onError?.(err);
        throw err;
      }
      if (data.partial && data.b64) {
        onPartial?.(data.b64, data.index);
      }
      if (data.done) {
        finalPayload = data;
        onDone?.(data);
      }
    }
  }

  return finalPayload;
};

export const editBookCover = async (novelId, formData) => {
  const response = await axiosSecureInstance.post(
    `/api/novel/${novelId}/cover/edit`,
    formData,
    {
      headers: { "Content-Type": "multipart/form-data" },
    }
  );
  return response;
};

export const editBookCoverStream = async (novelId, formData, { signal } = {}) => {
  const response = await fetch(
    `${process.env.REACT_APP_BASE_URL}/api/novel/${novelId}/cover/edit`,
    {
      method: "POST",
      headers: {
        Accept: "text/event-stream",
        Authorization: `Bearer ${localStorage.getItem("userToken")}`,
      },
      body: formData,
      signal,
    }
  );
  return response;
};

export const getCoverVersions = async (novelId, { page = 1, limit = 12 } = {}) => {
  const response = await axiosSecureInstance.get(
    `/api/novel/${novelId}/cover/versions?page=${page}&limit=${limit}`
  );
  return response;
};

// ---------------------------------------------------------------------------
// Ellis manuscript editing (Phase 2): editorial letter, scene chat, revision plan
// ---------------------------------------------------------------------------

/** Poll the Ellis Phase 1 editorial letter generation status / content. */
export const getEditorialLetter = async (novelId) => {
  const response = await axiosSecureInstance.get(
    `/api/novel/${novelId}/editorial-letter`
  );
  return response.data;
};

/** Retry/regenerate the editorial letter (e.g. after a failure). */
export const regenerateEditorialLetter = async (novelId) => {
  const response = await axiosSecureInstance.post(
    `/api/novel/${novelId}/editorial-letter/regenerate`
  );
  return response.data;
};

/**
 * Generate or refine the editorial letter (Phase 1 consent/refine modal).
 * Omit `message` for the initial generation; pass the writer's feedback to
 * refine the draft. Returns the raw fetch Response so the caller reads the SSE
 * stream (same token/done frames as Ellis scene chat).
 */
export const sendEditorialLetterChat = async (
  novelId,
  message = "",
  signal = null,
  attachments = []
) => {
  const body = {};
  if (message && message.trim()) body.message = message.trim();
  if (Array.isArray(attachments) && attachments.length > 0) {
    body.attachments = attachments;
  }
  const response = await fetch(
    `${process.env.REACT_APP_BASE_URL}/api/novel/${novelId}/editorial-letter/chat`,
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
    throw new Error(
      errorData.message ||
        errorData.error ||
        `Request failed with status ${response.status}`
    );
  }
  return response;
};

/** Load persisted editorial letter refine thread messages. */
export const getEditorialLetterChatHistory = async (
  novelId,
  { limit, before } = {}
) => {
  const params = new URLSearchParams();
  if (limit != null) params.set("limit", String(limit));
  if (before) params.set("before", before);
  const qs = params.toString();
  const response = await axiosSecureInstance.get(
    `/api/novel/${novelId}/editorial-letter/chat/history${qs ? `?${qs}` : ""}`
  );
  return response.data;
};

/** Save/accept the current editorial letter draft (unlocks scene-by-scene work). */
export const saveEditorialLetter = async (novelId, letter = null) => {
  const response = await axiosSecureInstance.post(
    `/api/novel/${novelId}/editorial-letter/save`,
    letter ? { letter } : {}
  );
  return response.data;
};

/**
 * Send a message to Ellis' scene-by-scene chat for a novel.
 * Chapter targeting is owned by the writer's message and the thread —
 * the outline sidebar selection is not sent. Returns the raw fetch
 * Response so the caller can read the SSE stream.
 */
export const sendEllisChatMessage = async (
  novelId,
  message,
  signal = null,
  attachments = []
) => {
  const body = { message };
  if (Array.isArray(attachments) && attachments.length > 0) {
    body.attachments = attachments;
  }
  const response = await fetch(
    `${process.env.REACT_APP_BASE_URL}/api/novel/${novelId}/ellis-chat`,
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
    throw new Error(
      errorData.message ||
        errorData.error ||
        `Request failed with status ${response.status}`
    );
  }
  return response;
};

/** Fetch Ellis scene chat history for a novel (paginated tail or older pages). */
export const getEllisChatHistory = async (novelId, { limit, before } = {}) => {
  const params = new URLSearchParams();
  if (limit != null) params.set("limit", String(limit));
  if (before) params.set("before", String(before));
  const qs = params.toString();
  const response = await axiosSecureInstance.get(
    `/api/novel/${novelId}/ellis-chat/history${qs ? `?${qs}` : ""}`
  );
  return response.data;
};

// ---------------------------------------------------------------------------
// Ellis Scene Architect (Phase 2b): structured, per-chapter scene reviews
// ---------------------------------------------------------------------------

/** Poll a chapter's structured Scene Architect review status / content. */
export const getEllisChapterReview = async (
  novelId,
  chapterNumber,
  chapterSuffix = ""
) => {
  const key = `${chapterNumber}${
    chapterSuffix ? String(chapterSuffix).toUpperCase() : ""
  }`;
  const response = await axiosSecureInstance.get(
    `/api/novel/${novelId}/ellis-chapter-review/${key}`
  );
  return response.data;
};

/** Kick off (or retry) generation of a chapter's structured review. */
export const triggerEllisChapterReview = async (
  novelId,
  chapterNumber,
  chapterSuffix = ""
) => {
  const key = `${chapterNumber}${
    chapterSuffix ? String(chapterSuffix).toUpperCase() : ""
  }`;
  const response = await axiosSecureInstance.post(
    `/api/novel/${novelId}/ellis-chapter-review/${key}/generate`
  );
  return response.data;
};

/** Save a chapter review from Ellis' chat into Scene Edit (user-initiated insert). */
export const saveEllisChapterReview = async (
  novelId,
  messageId,
  chapterNumber,
  chapterSuffix = ""
) => {
  const response = await axiosSecureInstance.post(
    `/api/novel/${novelId}/ellis-save-chapter-review`,
    { messageId, chapterNumber, chapterSuffix: chapterSuffix || "" }
  );
  return response.data;
};

/** Map of chapterNumber -> review status (drives sidebar progress + advance). */
export const getEllisReviewProgress = async (novelId) => {
  const response = await axiosSecureInstance.get(
    `/api/novel/${novelId}/ellis-review-progress`
  );
  return response.data;
};

/** Save a piece of Ellis' feedback into the novel's Revision Plan. */
export const saveRevisionPlanItem = async (novelId, body) => {
  const response = await axiosSecureInstance.post(
    `/api/novel/${novelId}/revision-plan`,
    body
  );
  return response.data;
};

/** List the Revision Plan items for a novel. */
export const getRevisionPlanItems = async (novelId) => {
  const response = await axiosSecureInstance.get(
    `/api/novel/${novelId}/revision-plan`
  );
  return response.data;
};

/** Delete a Revision Plan item. */
export const deleteRevisionPlanItem = async (novelId, itemId) => {
  const response = await axiosSecureInstance.delete(
    `/api/novel/${novelId}/revision-plan/${itemId}`
  );
  return response.data;
};
