import { useState, useCallback, useEffect, useMemo } from "react";
import { LuX } from "react-icons/lu";
import {
  getCoverSession,
  getCoverMessages,
  sendCoverChat,
  renderBookCover,
  renderBookCoverStream,
  readCoverRenderSSE,
  editBookCover,
  editBookCoverStream,
} from "../../api/bookGeneration";
import { uploadChatFile } from "../../api/assistant";
import { toast } from "react-toastify";
import BookCoverChatPanel from "./BookCoverChatPanel";
import BookCoverStudioTabs from "./BookCoverStudioTabs";
import BookCoverGalleryTab from "./BookCoverGalleryTab";
import BookCoverLightbox from "./BookCoverLightbox";
import { resolveCoverAssetUrl } from "./coverChatHelpers";
import { isSuperAdminRole } from "../../utils/index";
import "../OliviaChatModal/OliviaChatModal.scss";
import "./BookCoverModal.scss";

const normalizeCoverReference = (raw) => {
  if (!raw) return null;
  const withoutOrigin = raw.replace(/^https?:\/\/[^/]+\/?/, "");
  return withoutOrigin.startsWith("/") ? withoutOrigin.slice(1) : withoutOrigin;
};

const formatQuotaResetDate = (iso) => {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: "long",
      day: "numeric",
    });
  } catch {
    return "";
  }
};

const formatResetDate = (iso) => {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return "";
  }
};

const BookCoverModal = ({
  show,
  onClose,
  novelId,
  bookName,
  onCoverGenerated,
}) => {
  const [sessionLoading, setSessionLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("studio");
  const [messages, setMessages] = useState([]);
  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  const [isLoadingEarlier, setIsLoadingEarlier] = useState(false);
  const [versionCount, setVersionCount] = useState(0);
  const [galleryRefreshKey, setGalleryRefreshKey] = useState(0);
  const [quota, setQuota] = useState(null);
  const [isChatProcessing, setIsChatProcessing] = useState(false);
  const [isRendering, setIsRendering] = useState(false);
  const [generatingMessageId, setGeneratingMessageId] = useState(null);
  const [streamingPreviewB64, setStreamingPreviewB64] = useState(null);
  const [pendingFiles, setPendingFiles] = useState([]);
  const [lightbox, setLightbox] = useState({
    open: false,
    version: null,
    versions: [],
  });
  const [lightboxEditMode, setLightboxEditMode] = useState(false);
  const [enhanceEditPrompt, setEnhanceEditPrompt] = useState(false);

  const loadSession = useCallback(async ({ silent = false } = {}) => {
    if (!novelId) return null;
    if (!silent) setSessionLoading(true);
    try {
      const { data } = await getCoverSession(novelId);
      setMessages(data.messages || []);
      setVersionCount(data.versionCount ?? 0);
      setQuota(data.quota || null);
      setHasMoreMessages(Boolean(data.hasMoreMessages));
      return data;
    } catch (error) {
      console.error("Failed to load cover session:", error);
      if (!silent) {
        toast.error("Could not load cover workspace.");
      }
      return null;
    } finally {
      if (!silent) setSessionLoading(false);
    }
  }, [novelId]);

  useEffect(() => {
    if (!show || !novelId) return;
    setSessionLoading(true);
    setActiveTab("studio");
    setPendingFiles([]);
    loadSession();
  }, [show, novelId, loadSession]);

  useEffect(() => {
    if (!show) return undefined;
    const onKeyDown = (e) => {
      if (e.key === "Escape" && typeof onClose === "function") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [show, onClose]);

  const isSuperAdmin = isSuperAdminRole();

  const quotaDisplay = useMemo(() => {
    if (!quota) return null;

    if (isSuperAdmin || quota.unlimited) {
      return {
        label: isSuperAdmin
          ? "Unlimited cover generations (superadmin)"
          : "Unlimited cover generations",
        title: "You can generate as many cover images as you like.",
      };
    }

    const remaining =
      quota.remaining ?? Math.max(0, (quota.limit || 0) - (quota.used || 0));
    const resetDate = formatQuotaResetDate(quota.resetsAt);
    const resetPhrase = resetDate ? `renews ${resetDate}` : null;

    if (remaining <= 0) {
      return {
        label: resetDate
          ? `No cover generations left until ${resetDate}`
          : "No cover generations left this period",
        title: resetDate
          ? `Your cover generation limit resets on ${resetDate}.`
          : "You've used all cover generations for this billing period.",
      };
    }

    if (remaining === 1) {
      return {
        label: resetPhrase
          ? `1 cover generation left · ${resetPhrase}`
          : "1 cover generation left",
        title: resetPhrase
          ? `You have 1 cover generation remaining. Limit ${resetPhrase}.`
          : "You have 1 cover generation remaining this period.",
      };
    }

    const label = resetPhrase
      ? `${remaining} of ${quota.limit} cover generations left · ${resetPhrase}`
      : `${remaining} of ${quota.limit} cover generations left`;

    return {
      label,
      title: resetPhrase
        ? `You have ${remaining} of ${quota.limit} cover generations remaining. Limit ${resetPhrase}.`
        : `You have ${remaining} of ${quota.limit} cover generations remaining this period.`,
    };
  }, [quota, isSuperAdmin]);

  const canRender =
    isSuperAdmin || quota?.unlimited || (quota?.remaining ?? 0) > 0;
  const quotaEmpty =
    !isSuperAdmin &&
    Boolean(quota) &&
    !quota.unlimited &&
    (quota.remaining ?? 0) <= 0;

  const bumpGallery = useCallback(() => {
    setGalleryRefreshKey((k) => k + 1);
  }, []);

  const handleLoadEarlierMessages = useCallback(async () => {
    if (!novelId || isLoadingEarlier || !hasMoreMessages || messages.length === 0) {
      return;
    }
    setIsLoadingEarlier(true);
    try {
      const oldestCreatedAt = messages[0]?.createdAt;
      const { data } = await getCoverMessages(novelId, {
        before: oldestCreatedAt,
        limit: 50,
      });
      const earlier = data.messages || [];
      if (earlier.length > 0) {
        setMessages((prev) => {
          const existingIds = new Set(prev.map((m) => m.id));
          const merged = earlier.filter((m) => !existingIds.has(m.id));
          return [...merged, ...prev];
        });
      }
      setHasMoreMessages(Boolean(data.hasMore));
    } catch (error) {
      console.error("Failed to load earlier cover messages:", error);
      toast.error("Could not load earlier messages.");
    } finally {
      setIsLoadingEarlier(false);
    }
  }, [novelId, isLoadingEarlier, hasMoreMessages, messages]);

  const handleRenderError = useCallback(async (error) => {
    console.error("Cover render failed:", error);
    const status = error.response?.status;
    const payload = error.response?.data || {};
    if (status === 429) {
      const resetsAt = payload.resetsAt;
      toast.error(
        payload.message ||
          `You've used all cover renders for this billing period.${
            resetsAt ? ` Resets ${formatResetDate(resetsAt)}.` : ""
          }`
      );
      if (payload.resetsAt) {
        setQuota((prev) => ({
          ...prev,
          remaining: 0,
          used: payload.used,
          limit: payload.limit,
          resetsAt: payload.resetsAt,
        }));
      }
    } else if (status === 409) {
      toast.info(
        payload.message ||
          "This cover was already generated from this message."
      );
      await loadSession({ silent: true });
    } else {
      const msg =
        payload.message ||
        error.message ||
        "Failed to generate cover. Please try again.";
      toast.error(msg);
    }
    return false;
  }, [loadSession]);

  const handleRenderSuccess = useCallback(
    async (data) => {
      if (data?.coverUrl) {
        onCoverGenerated?.(normalizeCoverReference(data.coverUrl));
      }

      // Append edit/generate messages immediately so the thread updates even
      // before (or if) the session reload is slow.
      const incoming = [data?.userMessage, data?.message].filter(Boolean);
      if (incoming.length > 0) {
        setMessages((prev) => {
          const seen = new Set(prev.map((m) => String(m.id)));
          const next = incoming.filter((m) => m?.id && !seen.has(String(m.id)));
          return next.length ? [...prev, ...next] : prev;
        });
      }

      // Drop the generating placeholder as soon as the cover is in the thread —
      // don't wait for the session reload (that left a duplicate layout below).
      setIsRendering(false);
      setGeneratingMessageId(null);
      setStreamingPreviewB64(null);

      setActiveTab("studio");
      await loadSession({ silent: true });
      bumpGallery();
      toast.success(
        data?.userMessage ? "Cover refinement applied!" : "Cover version generated!"
      );
      return true;
    },
    [loadSession, bumpGallery, onCoverGenerated]
  );

  const performMaskEdit = useCallback(
    async ({ baseVersionId, prompt, maskBlob, enhancePrompt = false }) => {
      if (!novelId || isRendering || !canRender || !baseVersionId) return false;
      setIsRendering(true);
      setStreamingPreviewB64(null);

      const formData = new FormData();
      formData.append("prompt", prompt);
      formData.append("baseVersionId", baseVersionId);
      if (enhancePrompt) formData.append("enhancePrompt", "true");
      if (maskBlob) formData.append("mask", maskBlob, "mask.png");

      try {
        try {
          const streamResponse = await editBookCoverStream(novelId, formData);
          if (!streamResponse.ok) {
            const errorData = await streamResponse.json().catch(() => ({}));
            const err = new Error(
              errorData.message || errorData.error || "Cover edit failed"
            );
            err.response = { status: streamResponse.status, data: errorData };
            throw err;
          }

          const streamResult = await readCoverRenderSSE(streamResponse, {
            onPartial: (b64) => setStreamingPreviewB64(b64),
          });

          if (streamResult?.coverUrl || streamResult?.done) {
            setLightboxEditMode(false);
            setLightbox((prev) =>
              prev.version
                ? {
                    ...prev,
                    version: streamResult.version || prev.version,
                    open: true,
                  }
                : prev
            );
            return await handleRenderSuccess(streamResult);
          }
        } catch (streamErr) {
          if (streamErr.response?.status) {
            return handleRenderError(streamErr);
          }
          console.warn(
            "Cover edit stream unavailable, falling back to JSON:",
            streamErr
          );
        }

        const { data } = await editBookCover(novelId, formData);
        setLightboxEditMode(false);
        if (data?.version) {
          setLightbox((prev) => ({
            ...prev,
            version: data.version,
            open: true,
          }));
        }
        return await handleRenderSuccess(data);
      } catch (error) {
        return handleRenderError(error);
      } finally {
        setIsRendering(false);
        setStreamingPreviewB64(null);
      }
    },
    [novelId, isRendering, canRender, handleRenderSuccess, handleRenderError]
  );

  const handleApplyLightboxEdit = useCallback(
    async ({ prompt, maskBlob, enhancePrompt }) => {
      const versionId = lightbox.version?.id;
      if (!versionId) return;
      await performMaskEdit({
        baseVersionId: versionId,
        prompt,
        maskBlob,
        enhancePrompt,
      });
    },
    [lightbox.version?.id, performMaskEdit]
  );

  const performRender = useCallback(
    async ({ sourceMessageId, renderFeedback } = {}) => {
      if (!novelId || isRendering || !canRender) return false;
      setIsRendering(true);
      setStreamingPreviewB64(null);
      if (sourceMessageId) setGeneratingMessageId(String(sourceMessageId));

      const renderParams = { sourceMessageId, message: renderFeedback };

      try {
        try {
          const streamResponse = await renderBookCoverStream(
            novelId,
            renderParams
          );
          if (!streamResponse.ok) {
            const errorData = await streamResponse.json().catch(() => ({}));
            const err = new Error(
              errorData.message || errorData.error || "Cover render failed"
            );
            err.response = { status: streamResponse.status, data: errorData };
            throw err;
          }

          const streamResult = await readCoverRenderSSE(streamResponse, {
            onPartial: (b64) => setStreamingPreviewB64(b64),
          });

          if (streamResult?.coverUrl || streamResult?.done) {
            return await handleRenderSuccess(streamResult);
          }
        } catch (streamErr) {
          if (streamErr.response?.status) {
            return handleRenderError(streamErr);
          }
          console.warn(
            "Cover render stream unavailable, falling back to JSON:",
            streamErr
          );
        }

        const { data } = await renderBookCover(novelId, renderParams);
        return await handleRenderSuccess(data);
      } catch (error) {
        return handleRenderError(error);
      } finally {
        setIsRendering(false);
        setGeneratingMessageId(null);
        setStreamingPreviewB64(null);
      }
    },
    [
      novelId,
      isRendering,
      canRender,
      handleRenderSuccess,
      handleRenderError,
    ]
  );

  const handleGenerateFromMessage = useCallback(
    async (message) => {
      if (!message?.id || isRendering || !canRender) return;
      await performRender({
        sourceMessageId: message.id,
        renderFeedback: message.metadata?.renderFeedback,
      });
    },
    [isRendering, canRender, performRender]
  );

  const handleSendChat = useCallback(
    async (text) => {
      if (!novelId || isChatProcessing || isRendering) return;

      const readyAttachments = pendingFiles
        .filter((pf) => pf.fileUrl && !pf.isUploading)
        .map((pf) => ({
          fileUrl: pf.fileUrl,
          fileKey: pf.fileKey,
          fileType: pf.fileType,
          fileName: pf.fileName,
        }));

      if (!text && readyAttachments.length === 0) return;

      const optimisticId = `user-${Date.now()}`;
      setMessages((prev) => [
        ...prev,
        {
          id: optimisticId,
          role: "user",
          text:
            text ||
            `Shared ${readyAttachments.length} reference file${
              readyAttachments.length === 1 ? "" : "s"
            }.`,
          kind: "chat",
          attachments: readyAttachments,
        },
      ]);
      setPendingFiles([]);
      setIsChatProcessing(true);
      try {
        const { data } = await sendCoverChat(novelId, text, readyAttachments);
        await loadSession({ silent: true });
        if (data.quota) {
          setQuota(data.quota);
        }
      } catch (error) {
        console.error("Cover chat failed:", error);
        const msg =
          error.response?.data?.message || "Failed to send message. Please try again.";
        toast.error(msg);
        setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
      } finally {
        setIsChatProcessing(false);
      }
    },
    [novelId, isChatProcessing, isRendering, pendingFiles, loadSession]
  );

  const handleFilesSelected = useCallback(async (files) => {
    const batchId = Date.now();
    const newEntries = files.map((file, i) => ({
      id: `${batchId}-${i}-${file.name}`,
      file,
      fileUrl: null,
      fileKey: null,
      fileType: null,
      fileName: file.name,
      isUploading: true,
      uploadProgress: 0,
    }));

    setPendingFiles((prev) => [...prev, ...newEntries]);

    const ids = new Set(newEntries.map((e) => e.id));
    const progressInterval = setInterval(() => {
      setPendingFiles((prev) =>
        prev.map((pf) =>
          ids.has(pf.id) && pf.isUploading
            ? { ...pf, uploadProgress: Math.min(pf.uploadProgress + 12, 85) }
            : pf
        )
      );
    }, 200);

    try {
      const result = await uploadChatFile(files);
      clearInterval(progressInterval);
      const uploaded = result.attachments || [];
      setPendingFiles((prev) =>
        prev.map((pf) => {
          if (!ids.has(pf.id)) return pf;
          const idx = newEntries.findIndex((e) => e.id === pf.id);
          const att = uploaded[idx];
          return att
            ? {
                ...pf,
                fileUrl: att.fileUrl,
                fileKey: att.fileKey,
                fileType: att.fileType,
                fileName: att.fileName || pf.file.name,
                isUploading: false,
                uploadProgress: 100,
              }
            : { ...pf, isUploading: false, uploadProgress: 100 };
        })
      );
    } catch (err) {
      clearInterval(progressInterval);
      toast.error(err.response?.data?.error || "Failed to upload file(s).");
      setPendingFiles((prev) => prev.filter((pf) => !ids.has(pf.id)));
    }
  }, []);

  const handleRemoveFile = useCallback((fileId) => {
    setPendingFiles((prev) => prev.filter((pf) => pf.id !== fileId));
  }, []);

  const handleDownload = useCallback(
    async (versionOrUrl) => {
      const url = resolveCoverAssetUrl(
        typeof versionOrUrl === "string"
          ? versionOrUrl
          : versionOrUrl?.coverUrl
      );
      if (!url) return;
      try {
        const res = await fetch(url);
        const blob = await res.blob();
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `${(bookName || "book").replace(/[^a-zA-Z0-9-_ ]/g, "")}-cover.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(a.href);
      } catch {
        toast.error("Download failed. Try right-clicking the image and saving it.");
      }
    },
    [bookName]
  );

  const openLightbox = useCallback((version, versions = []) => {
    if (!version?.coverUrl) return;
    setLightboxEditMode(false);
    setLightbox({
      open: true,
      version,
      versions: versions.length ? versions : [version],
    });
  }, []);

  const closeLightbox = useCallback(() => {
    setLightboxEditMode(false);
    setLightbox({ open: false, version: null, versions: [] });
  }, []);

  const navigateLightbox = useCallback((direction) => {
    setLightbox((lb) => {
      if (!lb.open || !lb.version || lb.versions.length <= 1) return lb;
      const idx = lb.versions.findIndex((v) => v.id === lb.version.id);
      if (idx < 0) return lb;
      const nextIdx =
        direction === "prev"
          ? (idx - 1 + lb.versions.length) % lb.versions.length
          : (idx + 1) % lb.versions.length;
      return { ...lb, version: lb.versions[nextIdx] };
    });
  }, []);

  const buildVersionFromMessage = useCallback((message) => {
    if (!message?.coverUrl) return null;
    return {
      id: message.coverVersionId || message.id,
      coverUrl: message.coverUrl,
      versionNumber: message.text?.match(/version (\d+)/i)?.[1] || "?",
    };
  }, []);

  const handleChatImageClick = useCallback(
    (message) => {
      const version = buildVersionFromMessage(message);
      if (version) openLightbox(version);
    },
    [buildVersionFromMessage, openLightbox]
  );

  const handleEditFromMessage = useCallback(
    (message) => {
      const version = buildVersionFromMessage(message);
      if (!version?.id) return;
      setLightbox({ open: true, version, versions: [version] });
      setLightboxEditMode(true);
    },
    [buildVersionFromMessage]
  );

  if (!show) return null;

  const busy = isRendering || sessionLoading;

  return (
    <div
      className="ocm-backdrop book-cover-studio"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="ocm-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Book Cover Studio"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="ocm-header bcs-header">
          <div className="bcs-header__start">
            <h5 className="ocm-title">Book Cover Studio</h5>
            <BookCoverStudioTabs
              activeTab={activeTab}
              onTabChange={setActiveTab}
              versionCount={versionCount}
            />
          </div>
          <div className="bcs-header__end">
            {quotaDisplay && (
              <span
                className={[
                  "bcs-quota-note",
                  quotaEmpty && "bcs-quota-note--empty",
                ]
                  .filter(Boolean)
                  .join(" ")}
                role="status"
                title={quotaDisplay.title}
              >
                {quotaDisplay.label}
              </span>
            )}
            <button
              type="button"
              className="ocm-close-btn"
              onClick={onClose}
              aria-label="Close Book Cover Studio"
            >
              <LuX />
            </button>
          </div>
        </div>

        {sessionLoading ? (
          <div className="ocm-body">
            <div
              className="ocm-history-loader"
              aria-busy="true"
              aria-live="polite"
              aria-label="Loading conversation"
            >
              <div className="ocm-history-loader-card">
                <div className="ocm-history-loader-spinner" role="status" />
                <p className="ocm-history-loader-title">Loading Cover Studio</p>
                <p className="ocm-history-loader-sub">
                  Fetching your cover concepts, versions, and conversation…
                </p>
              </div>
            </div>
          </div>
        ) : activeTab === "studio" ? (
          <BookCoverChatPanel
            messages={messages}
            onSend={handleSendChat}
            onImageClick={handleChatImageClick}
            onGenerateCover={handleGenerateFromMessage}
            onEditCover={handleEditFromMessage}
            isProcessing={isChatProcessing}
            isRendering={isRendering}
            generatingMessageId={generatingMessageId}
            streamingPreviewB64={streamingPreviewB64}
            inputLocked={busy}
            quotaEmpty={quotaEmpty}
            pendingFiles={pendingFiles}
            onFilesSelected={handleFilesSelected}
            onRemoveFile={handleRemoveFile}
            hasMoreOnServer={hasMoreMessages}
            onLoadEarlierMessages={handleLoadEarlierMessages}
            isLoadingEarlier={isLoadingEarlier}
          />
        ) : (
          <BookCoverGalleryTab
            novelId={novelId}
            onPreview={openLightbox}
            refreshKey={galleryRefreshKey}
          />
        )}

        <BookCoverLightbox
          open={lightbox.open}
          version={lightbox.version}
          versions={lightbox.versions}
          onClose={closeLightbox}
          onPrev={() => navigateLightbox("prev")}
          onNext={() => navigateLightbox("next")}
          onDownload={handleDownload}
          bookName={bookName}
          editMode={lightboxEditMode}
          onStartEdit={() => setLightboxEditMode(true)}
          onCancelEdit={() => setLightboxEditMode(false)}
          onApplyEdit={handleApplyLightboxEdit}
          editBusy={isRendering}
          canEdit={canRender}
          enhancePrompt={enhanceEditPrompt}
          onEnhancePromptChange={setEnhanceEditPrompt}
        />
      </div>
    </div>
  );
};

export default BookCoverModal;
