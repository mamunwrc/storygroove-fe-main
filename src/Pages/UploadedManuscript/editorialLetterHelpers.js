export const ELLIS_LETTER_REFINE_KIND = "ellis_editorial_letter_refine";
export const ELLIS_LETTER_DRAFT_KIND = "ellis_editorial_letter_draft";

const GENERATE_TRIGGER_TEXT = "Generate my editorial letter";

/** Hide auto-sent consent trigger rows (mirrors Ellis chapter review triggers). */
export const isEditorialLetterHiddenUserMessage = (msg) => {
  if (!msg || msg.role !== "user") return false;
  if (msg.hiddenFromUi) return true;
  if (
    msg.metadata?.kind === ELLIS_LETTER_REFINE_KIND &&
    msg.metadata?.isRefine === false
  ) {
    return true;
  }
  if (String(msg.text || msg.content || "").trim() === GENERATE_TRIGGER_TEXT) {
    return true;
  }
  return false;
};

export const mapEditorialLetterApiMessageToRow = (msg) => {
  const row = {
    id: String(msg._id || msg.id || msg.timestamp || ""),
    role: msg.role,
    text: msg.content || msg.text || "",
    timestamp: msg.timestamp
      ? new Date(msg.timestamp).toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
        })
      : msg.created_at
        ? new Date(msg.created_at * 1000).toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
          })
        : null,
    sortTs: msg.timestamp
      ? new Date(msg.timestamp).getTime()
      : msg.created_at
        ? msg.created_at * 1000
        : 0,
    metadata: msg.metadata || null,
  };
  if (Array.isArray(msg.attachments) && msg.attachments.length > 0) {
    row.attachments = msg.attachments;
  }
  if (isEditorialLetterHiddenUserMessage(row)) {
    row.hiddenFromUi = true;
  }
  return row;
};

/** Latest assistant letter text in the thread (used for Save). */
export const resolveLatestEditorialLetterFromMessages = (messages) => {
  if (!Array.isArray(messages)) return "";
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m.role === "assistant" && String(m.text || "").trim()) {
      return m.text.trim();
    }
  }
  return "";
};
