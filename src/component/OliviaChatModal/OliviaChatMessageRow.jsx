import {
  useEffect,
  useState,
  useMemo,
  memo,
} from "react";
import ChatFileMessage from "../Chat/ChatFileMessage";
import {
  computeActOffsets,
  getGlobalSceneNumber,
} from "../../Pages/BookEditor/utils";
import {
  hasDetectedNewScenes,
  inferLayeringInsertHints,
  inferAutoLayeringInsert,
  findLatestLayeringTableTextFromMessages,
  inferAutoInsertFromLayeringTable,
  inferAutoInsertFromLayeringState,
} from "../../Pages/BookEditor/oliviaLayeringParse";
import {
  isRichScene,
  isPartialRichScene,
  sceneTitleFromRichText,
  MarkdownView,
  RichSceneView,
} from "./oliviaChatHelpers";
import { isOliviaStudioWordLimitMessage } from "../../constants/oliviaStudioInput";
import OliviaWordLimitNotice from "./OliviaWordLimitNotice";
import ChatMessageCopyButton from "../Chat/ChatMessageCopyButton";
import { normalizeOliviaMarkdown } from "./oliviaMarkdownNormalize";

/** Inline form shown below a rich scene message to insert it into the outline. */
const InsertSceneForm = ({
  text,
  onInsert,
  onCancel,
  userContents = [],
  initialActNumber,
  initialAfterSceneIndex,
  layeringStableKeyHint,
  isInserting = false,
}) => {
  const sceneTitle = sceneTitleFromRichText(text);
  const formOffsets = useMemo(() => computeActOffsets(userContents), [userContents]);

  const sceneOptionsByAct = useMemo(() => {
    const grouped = { 1: [], 2: [], 3: [] };
    (userContents || []).forEach((scene) => {
      const act = Number(scene.actNumber);
      if (![1, 2, 3].includes(act)) return;
      grouped[act].push(Number(scene.sceneIndex));
    });
    Object.keys(grouped).forEach((act) => {
      grouped[act] = Array.from(new Set(grouped[act])).sort((a, b) => a - b);
    });
    return grouped;
  }, [userContents]);

  const [actNumber, setActNumber] = useState("1");
  const [afterSceneIndex, setAfterSceneIndex] = useState("0");

  const afterOptions = useMemo(
    () => [0, ...(sceneOptionsByAct[Number(actNumber)] || [])],
    [sceneOptionsByAct, actNumber]
  );

  useEffect(() => {
    const act =
      initialActNumber != null && [1, 2, 3].includes(Number(initialActNumber))
        ? String(initialActNumber)
        : "1";
    setActNumber(act);
    const opts = [0, ...(sceneOptionsByAct[Number(act)] || [])];
    let afterStr = "0";
    if (initialAfterSceneIndex != null && opts.includes(Number(initialAfterSceneIndex))) {
      afterStr = String(initialAfterSceneIndex);
    } else {
      afterStr = String(opts[opts.length - 1] ?? 0);
    }
    setAfterSceneIndex(afterStr);
  }, [text, initialActNumber, initialAfterSceneIndex, sceneOptionsByAct]);

  useEffect(() => {
    const options = [0, ...(sceneOptionsByAct[Number(actNumber)] || [])];
    const current = Number(afterSceneIndex);
    if (!options.includes(current)) {
      setAfterSceneIndex(String(options[options.length - 1] ?? 0));
    }
  }, [actNumber, afterSceneIndex, sceneOptionsByAct]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isInserting) return;
    onInsert(
      text,
      Number(actNumber),
      Number(afterSceneIndex),
      sceneTitle,
      layeringStableKeyHint
    );
  };

  return (
    <form
      className="ocm-insert-form"
      onSubmit={handleSubmit}
      aria-busy={isInserting}
    >
      <p className="ocm-insert-title">
        Insert "<strong>{sceneTitle}</strong>" into outline
      </p>
      <div className="ocm-insert-row">
        <label>
          Act
          <select
            value={actNumber}
            onChange={(e) => setActNumber(e.target.value)}
            disabled={isInserting}
          >
            <option value="1">Act 1</option>
            <option value="2">Act 2</option>
            <option value="3">Act 3</option>
          </select>
        </label>
        <label>
          Insert after
          <select
            value={afterSceneIndex}
            onChange={(e) => setAfterSceneIndex(e.target.value)}
            disabled={isInserting}
          >
            {afterOptions.map((idx) => (
              <option key={`after-${actNumber}-${idx}`} value={idx}>
                {idx === 0
                  ? "Beginning of act"
                  : `Chapter ${getGlobalSceneNumber(Number(actNumber), idx, formOffsets)}`}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="ocm-insert-actions">
        <button
          type="submit"
          className="ocm-insert-confirm-btn"
          disabled={isInserting}
        >
          {isInserting ? (
            <>
              <span className="ocm-insert-spinner" aria-hidden={true} />
              Inserting…
            </>
          ) : (
            "Insert into outline"
          )}
        </button>
        <button
          type="button"
          className="ocm-insert-cancel-btn"
          onClick={onCancel}
          disabled={isInserting}
        >
          Cancel
        </button>
      </div>
    </form>
  );
};

const computeLayeringInsert = (
  message,
  msgIndex,
  messages,
  userContents,
  layeringState,
  targetScene
) => {
  let layeringHints = inferLayeringInsertHints(message.text);
  let autoInsertTarget = null;

  if (
    !targetScene &&
    message.role === "assistant" &&
    isRichScene(message.text)
  ) {
    autoInsertTarget = inferAutoInsertFromLayeringState(
      layeringState,
      message.text
    );
  }

  if (!autoInsertTarget) {
    autoInsertTarget = inferAutoLayeringInsert(message.text, userContents);
  }

  if (
    !autoInsertTarget &&
    !targetScene &&
    message.role === "assistant" &&
    isRichScene(message.text)
  ) {
    for (let j = msgIndex - 1; j >= Math.max(0, msgIndex - 12); j--) {
      const prev = messages[j];
      if (prev.role !== "assistant") continue;
      const prevTarget = inferAutoLayeringInsert(prev.text, userContents);
      if (prevTarget) {
        autoInsertTarget = prevTarget;
        if (!layeringHints.actNumber) {
          layeringHints = inferLayeringInsertHints(prev.text);
        }
        break;
      }
    }

    if (!autoInsertTarget) {
      const tableText = findLatestLayeringTableTextFromMessages(
        messages,
        msgIndex
      );
      if (tableText) {
        const tableTarget = inferAutoInsertFromLayeringTable(
          tableText,
          message.text,
          userContents
        );
        if (tableTarget) autoInsertTarget = tableTarget;
      }
    }
  }

  return { layeringHints, autoInsertTarget };
};

const OliviaChatMessageRow = ({
  message,
  msgIndex,
  messages,
  userContents,
  layeringState,
  targetScene,
  actOffsets,
  streamingMessageId,
  lastRichSceneId,
  lastQuickReplyMsgId,
  showQuickReplies,
  savedSceneIdSet,
  isBusy,
  insertingMessageId,
  insertOutlineLoadingMessageId,
  savingSceneId,
  onQuickReply,
  onInsertScene,
  onSceneDelivered,
  onDirectLayeringInsert,
  onInsertConfirm,
  onStartInsertForm,
  onCancelInsertForm,
  onSaveSceneToOutline,
  registerMessageRef,
}) => {
  const { layeringHints, autoInsertTarget } = useMemo(
    () =>
      computeLayeringInsert(
        message,
        msgIndex,
        messages,
        userContents,
        layeringState,
        targetScene
      ),
    [
      message,
      msgIndex,
      messages,
      userContents,
      layeringState,
      targetScene,
    ]
  );

  const showRichSceneContent =
    isRichScene(message.text) ||
    (message.id === streamingMessageId && isPartialRichScene(message.text));

  return (
    <div
      ref={(el) => registerMessageRef?.(message.id, el)}
      data-message-id={message.id}
      className={`ocm-message ${
        message.role === "user" ? "ocm-user-message" : "ocm-agent-message"
      }`}
    >
      {message.role === "assistant" && (
        <div className="ocm-message-avatar">
          {/* Rendered as a CSS background (not <img>) so casual right-click
              "Save image" / drag-to-save is not offered. This is friction, not
              true prevention. Fallback handled via layered backgrounds in SCSS. */}
          <div
            className="ocm-message-avatar__img"
            role="img"
            aria-label="Olivia"
            draggable={false}
            onContextMenu={(e) => e.preventDefault()}
            onDragStart={(e) => e.preventDefault()}
            style={{
              backgroundImage:
                'url(/assets/images/olivia.png), url(/assets/images/avatar.jpg)',
              backgroundSize: "cover",
              backgroundPosition: "center",
              backgroundRepeat: "no-repeat",
            }}
          />
        </div>
      )}
      <div className="ocm-message-bubble-wrapper">
        <div className="ocm-message-bubble">
          <div className="ocm-message-text">
            {message.role === "assistant" ? (
              showRichSceneContent ? (
                <RichSceneView text={message.text} />
              ) : isOliviaStudioWordLimitMessage(message.text) ? (
                <OliviaWordLimitNotice className="ocm-word-limit-warning ocm-word-limit-warning--bubble" />
              ) : (
                <MarkdownView text={message.text} />
              )
            ) : (
              message.text
            )}
            {message.attachments?.length > 0 && (
              <div className="ocm-message-attachments">
                {message.attachments.map((att, idx) => (
                  <ChatFileMessage
                    key={`${message.id}-att-${idx}`}
                    fileUrl={att.fileUrl}
                    fileType={att.fileType}
                    fileName={att.fileName}
                  />
                ))}
              </div>
            )}
          </div>
          {(message.timestamp || message.role === "assistant") && (
            <div className="ocm-message-footer">
              {message.timestamp && (
                <span className="ocm-message-timestamp">{message.timestamp}</span>
              )}
              {message.role === "assistant" && (
                <ChatMessageCopyButton
                  text={message.text}
                  preprocess={normalizeOliviaMarkdown}
                />
              )}
            </div>
          )}
        </div>

        {message.role === "assistant" &&
          message.quickReplies?.length > 0 &&
          message.id === lastQuickReplyMsgId &&
          showQuickReplies && (
            <div className="ocm-quick-replies">
              {message.quickReplies.map((qr, i) => {
                const normalized =
                  typeof qr === "string"
                    ? { id: `qr-${i}`, label: qr }
                    : {
                        id: qr.id || `qr-${i}`,
                        label: qr.label || String(qr),
                      };
                return (
                  <button
                    key={normalized.id}
                    type="button"
                    className="ocm-quick-reply-btn"
                    onClick={() => onQuickReply?.(normalized)}
                  >
                    {normalized.label}
                  </button>
                );
              })}
            </div>
          )}

        {message.role === "assistant" &&
          message.id === streamingMessageId &&
          hasDetectedNewScenes(message.text) && (
            <div className="ocm-table-streaming-notice">
              <span className="ocm-streaming-pulse" />
              Olivia is building the scene layering table…
            </div>
          )}

        {message.role === "assistant" &&
          isRichScene(message.text) &&
          targetScene &&
          onSceneDelivered &&
          message.id !== streamingMessageId &&
          message.id === lastRichSceneId &&
          !savedSceneIdSet.has(message.id) && (
            <div className="ocm-insert-scene-area">
              <button
                type="button"
                className="ocm-insert-scene-btn"
                onClick={() => onSaveSceneToOutline(message)}
                disabled={
                  isBusy ||
                  savingSceneId === message.id ||
                  insertOutlineLoadingMessageId != null
                }
              >
                {savingSceneId === message.id ? (
                  <>
                    <span className="ocm-insert-spinner" />
                    Saving chapter to outline…
                  </>
                ) : (
                  `✦ Save Chapter to Outline`
                )}
              </button>
            </div>
          )}

        {message.role === "assistant" &&
          isRichScene(message.text) &&
          !targetScene &&
          !savedSceneIdSet.has(message.id) &&
          onInsertScene && (
            <div className="ocm-insert-scene-area">
              {insertingMessageId === message.id ? (
                <InsertSceneForm
                  text={message.text}
                  onInsert={onInsertConfirm}
                  onCancel={onCancelInsertForm}
                  userContents={userContents}
                  initialActNumber={
                    autoInsertTarget?.actNumber ?? layeringHints.actNumber
                  }
                  initialAfterSceneIndex={
                    autoInsertTarget?.afterSceneIndex ??
                    layeringHints.afterSceneIndex
                  }
                  layeringStableKeyHint={
                    autoInsertTarget?.layeringStableKey ??
                    layeringHints.layeringStableKey
                  }
                  isInserting={insertOutlineLoadingMessageId === message.id}
                />
              ) : (
                <>
                  <button
                    type="button"
                    className="ocm-insert-scene-btn"
                    onClick={() => {
                      if (
                        insertOutlineLoadingMessageId ||
                        isBusy ||
                        savingSceneId != null
                      ) {
                        return;
                      }
                      if (autoInsertTarget) {
                        void onDirectLayeringInsert(message, autoInsertTarget);
                      } else {
                        onStartInsertForm(message.id);
                      }
                    }}
                    disabled={
                      isBusy ||
                      insertOutlineLoadingMessageId != null ||
                      savingSceneId != null
                    }
                  >
                    {insertOutlineLoadingMessageId === message.id ? (
                      <>
                        <span className="ocm-insert-spinner" />
                        Inserting…
                      </>
                    ) : autoInsertTarget ? (
                      "✦ Insert into outline"
                    ) : (
                      "✦ Choose where to insert"
                    )}
                  </button>
                  {autoInsertTarget &&
                    insertOutlineLoadingMessageId !== message.id && (
                      <p className="ocm-insert-auto-caption">
                        {autoInsertTarget.afterSceneIndex === 0
                          ? `Will add at the start of Act ${autoInsertTarget.actNumber}.`
                          : `Will add after Act ${autoInsertTarget.actNumber}, Chapter ${getGlobalSceneNumber(autoInsertTarget.actNumber, autoInsertTarget.afterSceneIndex, actOffsets)}.`}
                        <button
                          type="button"
                          className="ocm-insert-change-position"
                          disabled={
                            insertOutlineLoadingMessageId != null ||
                            isBusy ||
                            savingSceneId != null
                          }
                          onClick={() => onStartInsertForm(message.id)}
                        >
                          Change position
                        </button>
                      </p>
                    )}
                </>
              )}
            </div>
          )}
      </div>
    </div>
  );
};

export default memo(OliviaChatMessageRow);
