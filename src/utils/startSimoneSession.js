import { createAssistantThread } from "../api/assistant";
import { toast } from "react-toastify";

const isSimoneThreadLimitError = (error) =>
  error.response?.status === 403 &&
  (String(error.response?.data?.code || "").toUpperCase() === "SIMONE_THREAD_LIMIT" ||
    String(error.response?.data?.error || "")
      .toLowerCase()
      .includes("limited to"));

const isSimonePaymentRequiredError = (error) =>
  error.response?.status === 403 &&
  (["SIMONE_PAYMENT_REQUIRED", "SIMONE_CREDIT_REQUIRED"].includes(
    String(error.response?.data?.code || "").toUpperCase()
  ) ||
    String(error.response?.data?.error || "")
    .toLowerCase()
    .includes("payment"));

/**
 * Create a Simone thread and navigate to chat.
 *
 * `title` is the working project name captured from the upfront name-of-project
 * modal. When provided, it is sent to the backend so the thread is created with
 * that title (instead of the default "New Chat") and forwarded via navigation
 * state so the chat header surfaces it immediately on first render.
 */
export async function startSimoneSession({
  navigate,
  title,
  onThreadLimit,
  onPaymentRequired,
}) {
  const trimmedTitle =
    typeof title === "string" && title.trim() ? title.trim() : null;

  try {
    const response = await createAssistantThread(trimmedTitle || undefined);
    if (!response.data) return;

    const newProject = response.data;
    const targetId = newProject.threadId || newProject.id || newProject._id;

    if (targetId) {
      const navOptions = trimmedTitle
        ? { state: { ideaName: trimmedTitle } }
        : undefined;
      navigate(`/dashboard/agent-chat/simone/novel/${targetId}`, navOptions);
    } else {
      console.error("Could not find project ID in response", response.data);
      toast.error("Created but could not navigate automatically.");
    }
  } catch (error) {
    console.error("Error creating Simone thread:", error);
    if (isSimonePaymentRequiredError(error)) {
      onPaymentRequired?.();
    } else if (isSimoneThreadLimitError(error)) {
      onThreadLimit?.();
    } else {
      toast.error("Failed to start session. Please try again.");
    }
  }
}
