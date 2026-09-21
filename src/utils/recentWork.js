import { recordRecentWorkAccess } from "../api/bookGeneration";

/**
 * Fire-and-forget: tell the server which project the user just opened so
 * "Your recent work" can resume the right Simone / Olivia / novel / Ellis item.
 */
export function recordRecentWork({
  kind,
  resourceId,
  threadId,
  name,
  uploaded = false,
  status = null,
}) {
  if (!kind || !resourceId || !name || !String(name).trim()) return;
  recordRecentWorkAccess({
    kind,
    resourceId,
    threadId: threadId || null,
    name: String(name).trim(),
    uploaded: !!uploaded,
    status: status || null,
  }).catch((err) => {
    console.error("Failed to record recent work access:", err);
  });
}

export function inferRecentWorkFromKanbanCard(card, title) {
  const displayName = title || card?.name || card?.title || "Untitled";
  if (
    card?.assistantName === "SimoneAI" ||
    card?.assistantName === "Simone AI" ||
    card?.agentName === "simone"
  ) {
    return {
      kind: "simone",
      resourceId: card._id,
      threadId: card.threadId || card._id,
      name: displayName,
    };
  }
  if (card?.assistantName === "Olivia" || card?.agentName === "olivia") {
    return {
      kind: "olivia",
      resourceId: card._id,
      threadId: card.threadId || card._id,
      name: displayName,
    };
  }
  if (card?.uploaded) {
    return {
      kind: "ellis",
      resourceId: card._id,
      name: displayName,
      uploaded: true,
      status: card.status || null,
    };
  }
  return {
    kind: "novel",
    resourceId: card._id,
    name: displayName,
    uploaded: false,
    status: card.status || null,
  };
}

export function getRecentWorkContinuePath(work) {
  if (!work?._id && !work?.threadId) return null;
  if (work.kind === "simone") {
    const targetId = work.threadId || work._id;
    return {
      pathname: `/dashboard/agent-chat/simone/novel/${targetId}`,
      state: { ideaName: work.name },
    };
  }
  if (work.kind === "olivia") {
    const targetId = work.threadId || work._id;
    return {
      pathname: `/dashboard/agent-chat/olivia/novel/${targetId}`,
      state: { ideaName: work.name },
    };
  }
  if (work.kind === "ellis" || work.uploaded) {
    return { pathname: `/dashboard/upload/bookeditor/${work._id}` };
  }
  if (work.status === "completed") {
    return { pathname: `/dashboard/bookeditor/${work._id}`, search: "?view=true" };
  }
  return { pathname: `/dashboard/bookeditor/${work._id}` };
}

export function getRecentWorkContinueLabel(work) {
  if (!work?.kind) return "Continue";
  if (work.kind === "simone" || work.kind === "olivia") return "Continue this chat";
  if (work.kind === "ellis") return "Continue this edit";
  return "Continue this novel";
}
