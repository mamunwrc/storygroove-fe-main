import { useState } from "react";
import { MdContentCopy, MdCheck } from "react-icons/md";
import { toast } from "react-toastify";
import { copyMarkdownForWord } from "../../utils/copyMarkdownForWord";
import "./ChatMessageCopyButton.scss";

/**
 * Copy-to-Word control used on agent chat bubbles (Simone/Olivia chat,
 * Olivia studio modal, Ellis chat).
 */
const ChatMessageCopyButton = ({ text, preprocess }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await copyMarkdownForWord(text, { preprocess });
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy message:", err);
      toast.error("Failed to copy message");
    }
  };

  return (
    <button
      type="button"
      className="copy-button"
      onClick={handleCopy}
      title="Copy"
      aria-label="Copy"
    >
      {copied ? (
        <MdCheck className="copy-icon copied" />
      ) : (
        <MdContentCopy className="copy-icon" />
      )}
    </button>
  );
};

export default ChatMessageCopyButton;
