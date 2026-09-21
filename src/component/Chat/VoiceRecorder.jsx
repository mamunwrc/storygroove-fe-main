import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import { createPortal } from "react-dom";
import {
  MdMic,
  MdMicOff,
  MdLanguage,
  MdExpandMore,
  MdCheck,
  MdSearch,
} from "react-icons/md";
import { toast } from "react-toastify";
import {
  DICTATION_LANG_AUTO,
  DICTATION_LANGUAGE_GROUPS,
  getDictationLanguageLabel,
  normalizeDictationLanguageCode,
} from "../../constants/dictationLanguages";
import {
  readDictationLanguagePreference,
  writeDictationLanguagePreference,
} from "../../utils/dictationLanguageStorage";
import {
  buildNormalizedLiveTranscript,
  supportsUnspokenPunctuation,
} from "../../utils/dictationTranscript";
import { normalizeSpokenCommandsInChunk } from "../../utils/spokenPunctuationRules";
import VoiceTipsButton from "./VoiceTipsButton";
import "./VoiceRecorder.scss";

const SpeechRecognition =
  typeof window !== "undefined"
    ? window.SpeechRecognition || window.webkitSpeechRecognition
    : null;

const isSupported = Boolean(SpeechRecognition);

/** iOS Safari / iPadOS — Web Speech API needs special handling. */
const isIOSDevice = () => {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  const isTouchMac =
    navigator.platform === "MacIntel" && (navigator.maxTouchPoints || 0) > 1;
  return /iPad|iPhone|iPod/i.test(ua) || isTouchMac;
};

const isMobileDevice = () => {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || navigator.vendor || "";
  return (
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua) ||
    isIOSDevice()
  );
};

// Create a FRESH recognition instance for every session. iOS Safari has a
// well-documented bug where a reused (singleton) instance opens the mic
// (`onstart` fires) but never delivers `onresult`/`onend` again after the
// first use. A new instance each time costs a small system chime but is the
// only reliable way to get results on iOS. Desktop/Android are unaffected.
const createRecognition = () => {
  if (!SpeechRecognition) return null;
  const recognition = new SpeechRecognition();
  recognition.interimResults = true;
  recognition.maxAlternatives = 1;
  let unspokenPunctuationEnabled = false;
  if (supportsUnspokenPunctuation()) {
    recognition.unspokenPunctuation = true;
    unspokenPunctuationEnabled = true;
  }
  return { recognition, unspokenPunctuationEnabled };
};

const PANEL_WIDTH = 256;
const PANEL_MAX_HEIGHT = 340;
const VIEWPORT_MARGIN = 8;
const CLOSE_ANIMATION_MS = 150;
const IOS_END_DELIVER_MS = 200;
const RESTART_AFTER_INVALID_STATE_MS = 280;

const resolveDictationLang = (languagePreference) => {
  if (languagePreference !== DICTATION_LANG_AUTO) {
    return languagePreference;
  }
  const browserLang = navigator.language || "en-US";
  const normalized = normalizeDictationLanguageCode(browserLang);
  return normalized === DICTATION_LANG_AUTO ? browserLang : normalized;
};

const getTriggerShortLabel = (languagePreference) => {
  if (languagePreference === DICTATION_LANG_AUTO) return "Auto";
  return languagePreference.split("-")[0].toUpperCase();
};

/**
 * Stop the active recognition session.
 *
 * Note: we deliberately do NOT use the "start() then stop()" Safari hack here.
 * With a live session that hack spawns a fresh (empty) recognition run on iOS,
 * which discards the transcript we just captured and delivers nothing. A plain
 * stop() lets `onresult`/`onend` deliver the accumulated text.
 */
const stopRecognitionSafely = (recognition) => {
  if (!recognition) return;
  try {
    recognition.stop();
  } catch {
    // Ignore — session may already be ended.
  }
};

const startRecognitionSafely = (recognition) => {
  if (!recognition) return false;
  try {
    recognition.start();
    return true;
  } catch (err) {
    if (err?.name !== "InvalidStateError") {
      throw err;
    }
    try {
      recognition.stop();
    } catch {
      // ignore
    }
    setTimeout(() => {
      try {
        recognition.start();
      } catch {
        // Second attempt failed — surfaced via onerror.
      }
    }, RESTART_AFTER_INVALID_STATE_MS);
    return true;
  }
};

/**
 * VoiceRecorder
 *
 * Props:
 *   onTranscript(text: string) — called with the final transcript when recording stops
 *   onDictationStart() — optional; called when recording begins
 *   onDictationProgress({ committed, interim, live }) — optional; live updates while speaking
 *   disabled — disables the button when the chat input is locked
 */
const VoiceRecorder = ({
  onTranscript,
  onDictationStart,
  onDictationProgress,
  disabled,
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [languagePreference, setLanguagePreference] = useState(
    readDictationLanguagePreference
  );
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [query, setQuery] = useState("");
  const [panelStyle, setPanelStyle] = useState(null);
  const [dropUp, setDropUp] = useState(true);

  const recognitionRef = useRef(null);
  const transcriptRef = useRef("");
  const interimRef = useRef("");
  const fullTextRef = useRef("");
  const isRecordingRef = useRef(false);
  const onTranscriptRef = useRef(onTranscript);
  const onDictationStartRef = useRef(onDictationStart);
  const onDictationProgressRef = useRef(onDictationProgress);
  const languagePreferenceRef = useRef(languagePreference);
  const micClickLockRef = useRef(false);
  const progressRafRef = useRef(null);
  const pendingProgressRef = useRef(null);
  const sessionUsesUnspokenPunctuationRef = useRef(false);
  const sessionLangRef = useRef("en-US");
  const wrapperRef = useRef(null);
  const triggerRef = useRef(null);
  const panelRef = useRef(null);
  const searchRef = useRef(null);
  const closeTimerRef = useRef(null);

  onTranscriptRef.current = onTranscript;
  onDictationStartRef.current = onDictationStart;
  onDictationProgressRef.current = onDictationProgress;
  languagePreferenceRef.current = languagePreference;

  const flushDictationProgress = useCallback(() => {
    progressRafRef.current = null;
    const payload = pendingProgressRef.current;
    pendingProgressRef.current = null;
    if (payload) {
      onDictationProgressRef.current?.(payload);
    }
  }, []);

  const scheduleDictationProgress = useCallback(
    (payload) => {
      if (!onDictationProgressRef.current) return;
      pendingProgressRef.current = payload;
      if (progressRafRef.current != null) return;
      progressRafRef.current = requestAnimationFrame(flushDictationProgress);
    },
    [flushDictationProgress]
  );

  const cancelDictationProgress = useCallback(() => {
    if (progressRafRef.current != null) {
      cancelAnimationFrame(progressRafRef.current);
      progressRafRef.current = null;
    }
    pendingProgressRef.current = null;
  }, []);

  const activeLang = useMemo(
    () => resolveDictationLang(languagePreference),
    [languagePreference]
  );

  const triggerShortLabel = useMemo(
    () => getTriggerShortLabel(languagePreference),
    [languagePreference]
  );

  const triggerTitle = useMemo(() => {
    if (languagePreference === DICTATION_LANG_AUTO) {
      return `Dictation language: Auto (${activeLang})`;
    }
    return `Dictation language: ${getDictationLanguageLabel(
      languagePreference
    )}`;
  }, [languagePreference, activeLang]);

  const autoPunctuationSupported = useMemo(
    () => supportsUnspokenPunctuation(),
    []
  );

  const micTitle = useMemo(() => {
    if (isRecording) return "Stop recording";
    const autoPunctSuffix = autoPunctuationSupported
      ? " — auto punctuation on pause (Chrome)"
      : "";
    if (languagePreference === DICTATION_LANG_AUTO) {
      return `Voice dictation (Auto — ${activeLang})${autoPunctSuffix}`;
    }
    return `Voice dictation (${getDictationLanguageLabel(
      languagePreference
    )})${autoPunctSuffix}`;
  }, [
    isRecording,
    languagePreference,
    activeLang,
    autoPunctuationSupported,
  ]);

  const deliverTranscript = useCallback(() => {
    cancelDictationProgress();
    const lang = sessionLangRef.current;
    const committed = transcriptRef.current || "";
    const tail = normalizeSpokenCommandsInChunk(interimRef.current || "", {
      lang,
      trim: true,
    });
    const text = (committed + tail).trim();
    transcriptRef.current = "";
    interimRef.current = "";
    fullTextRef.current = "";
    sessionUsesUnspokenPunctuationRef.current = false;
    sessionLangRef.current = "en-US";
    // Always notify so consumers can tear down live dictation state even when
    // the final transcript is empty (e.g. rebase + stop without new speech).
    onTranscriptRef.current?.(text);
  }, [cancelDictationProgress]);

  const bindRecognitionHandlers = useCallback(
    (recognition) => {
      recognition.onstart = () => {
        isRecordingRef.current = true;
        setIsRecording(true);
        onDictationStartRef.current?.();
      };

      recognition.onresult = (event) => {
        const { committed, interim, live } = buildNormalizedLiveTranscript(
          event.results,
          { lang: sessionLangRef.current, useSpokenCommands: true }
        );
        transcriptRef.current = committed;
        interimRef.current = interim;
        fullTextRef.current = live;
        scheduleDictationProgress({
          committed,
          interim,
          live,
          autoPunctuation: sessionUsesUnspokenPunctuationRef.current,
        });
      };

      // iOS Safari sometimes opens the mic but does not auto-stop on silence,
      // so it never reaches onend (and thus never delivers). Force a stop when
      // speech ends so the final result + onend are emitted.
      recognition.onspeechend = () => {
        try {
          recognition.stop();
        } catch {
          // ignore — may already be stopping
        }
      };

      recognition.onerror = (event) => {
        const code = event.error || "unknown";
        if (code === "not-allowed") {
          toast.warn(
            "Microphone access denied. Allow microphone access in Safari Settings → Website Settings."
          );
        } else if (code === "service-not-allowed") {
          toast.warn("Voice dictation requires a secure (HTTPS) connection.");
        } else if (code !== "aborted" && code !== "no-speech") {
          toast.warn(`Voice recognition error: ${code}`);
        }
        isRecordingRef.current = false;
        setIsRecording(false);
      };

      recognition.onend = () => {
        isRecordingRef.current = false;
        setIsRecording(false);
        if (recognitionRef.current === recognition) {
          recognitionRef.current = null;
        }
        if (isIOSDevice()) {
          window.setTimeout(deliverTranscript, IOS_END_DELIVER_MS);
        } else {
          deliverTranscript();
        }
      };
    },
    [deliverTranscript, scheduleDictationProgress]
  );

  const stopRecording = useCallback(() => {
    cancelDictationProgress();
    stopRecognitionSafely(recognitionRef.current);
  }, [cancelDictationProgress]);

  const startRecording = useCallback(() => {
    // Fresh instance every session (see createRecognition note) — critical for
    // iOS Safari to deliver results reliably.
    const created = createRecognition();
    if (!created) return;
    const { recognition, unspokenPunctuationEnabled } = created;

    transcriptRef.current = "";
    interimRef.current = "";
    fullTextRef.current = "";
    sessionUsesUnspokenPunctuationRef.current = unspokenPunctuationEnabled;

    const mobile = isMobileDevice();
    // On mobile (iOS Safari + Android Chrome) `continuous` is unreliable: iOS
    // never delivers results, Android stops after the first utterance. Use
    // continuous=false on mobile and rely on interim + final capture; desktop
    // keeps continuous=true for longer dictation.
    recognition.continuous = !mobile;
    const sessionLang = resolveDictationLang(languagePreferenceRef.current);
    recognition.lang = sessionLang;
    sessionLangRef.current = sessionLang;

    bindRecognitionHandlers(recognition);
    recognitionRef.current = recognition;
    startRecognitionSafely(recognition);
  }, [bindRecognitionHandlers]);

  const handleMicClick = useCallback(() => {
    if (micClickLockRef.current) return;
    micClickLockRef.current = true;
    window.setTimeout(() => {
      micClickLockRef.current = false;
    }, 320);

    if (isRecordingRef.current) {
      stopRecording();
    } else {
      startRecording();
    }
  }, [startRecording, stopRecording]);

  // Stop if the page goes to background (iOS kills recognition silently).
  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden && isRecordingRef.current) {
        stopRecording();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [stopRecording]);

  const computePanelPosition = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const shouldDropUp =
      spaceBelow < PANEL_MAX_HEIGHT + VIEWPORT_MARGIN * 2 &&
      spaceAbove > spaceBelow;

    let left = rect.left;
    if (left + PANEL_WIDTH > window.innerWidth - VIEWPORT_MARGIN) {
      left = rect.right - PANEL_WIDTH;
    }
    left = Math.max(
      VIEWPORT_MARGIN,
      Math.min(left, window.innerWidth - PANEL_WIDTH - VIEWPORT_MARGIN)
    );

    const style = {
      position: "fixed",
      left: `${Math.round(left)}px`,
      width: `${PANEL_WIDTH}px`,
    };

    if (shouldDropUp) {
      style.bottom = `${Math.round(
        window.innerHeight - rect.top + VIEWPORT_MARGIN
      )}px`;
      style.maxHeight = `${Math.min(
        PANEL_MAX_HEIGHT,
        spaceAbove - VIEWPORT_MARGIN * 2
      )}px`;
    } else {
      style.top = `${Math.round(rect.bottom + VIEWPORT_MARGIN)}px`;
      style.maxHeight = `${Math.min(
        PANEL_MAX_HEIGHT,
        spaceBelow - VIEWPORT_MARGIN * 2
      )}px`;
    }

    setDropUp(shouldDropUp);
    setPanelStyle(style);
  }, []);

  const closePanel = useCallback(() => {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    setIsClosing(true);
    closeTimerRef.current = setTimeout(() => {
      setIsPanelOpen(false);
      setIsClosing(false);
      setQuery("");
      triggerRef.current?.focus();
    }, CLOSE_ANIMATION_MS);
  }, []);

  const openPanel = useCallback(() => {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    computePanelPosition();
    setIsClosing(false);
    setIsPanelOpen(true);
  }, [computePanelPosition]);

  const togglePanel = () => {
    if (isPanelOpen && !isClosing) {
      closePanel();
    } else {
      openPanel();
    }
  };

  const handleSelectLanguage = (code) => {
    setLanguagePreference(code);
    writeDictationLanguagePreference(code);
    closePanel();
  };

  useEffect(() => {
    if (isPanelOpen && !isClosing) {
      const id = requestAnimationFrame(() => searchRef.current?.focus());
      return () => cancelAnimationFrame(id);
    }
    return undefined;
  }, [isPanelOpen, isClosing]);

  useEffect(() => {
    if (!isPanelOpen) return undefined;

    const handlePointerDown = (event) => {
      if (
        wrapperRef.current?.contains(event.target) ||
        panelRef.current?.contains(event.target)
      ) {
        return;
      }
      closePanel();
    };
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        closePanel();
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isPanelOpen, closePanel]);

  useEffect(() => {
    if (!isPanelOpen) return undefined;
    const handleReposition = () => computePanelPosition();
    window.addEventListener("scroll", handleReposition, true);
    window.addEventListener("resize", handleReposition);
    return () => {
      window.removeEventListener("scroll", handleReposition, true);
      window.removeEventListener("resize", handleReposition);
    };
  }, [isPanelOpen, computePanelPosition]);

  useEffect(() => {
    if (isRecording && isPanelOpen) {
      closePanel();
    }
  }, [isRecording, isPanelOpen, closePanel]);

  useEffect(() => {
    return () => {
      cancelDictationProgress();
      if (recognitionRef.current && isRecordingRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // ignore
        }
      }
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
      }
    };
  }, [cancelDictationProgress]);

  const normalizedQuery = query.trim().toLowerCase();

  const showAutoOption =
    !normalizedQuery || "auto browser".includes(normalizedQuery);

  const filteredGroups = useMemo(() => {
    if (!normalizedQuery) return DICTATION_LANGUAGE_GROUPS;
    return DICTATION_LANGUAGE_GROUPS.map((group) => ({
      ...group,
      languages: group.languages.filter(
        ({ code, label }) =>
          label.toLowerCase().includes(normalizedQuery) ||
          code.toLowerCase().includes(normalizedQuery)
      ),
    })).filter((group) => group.languages.length > 0);
  }, [normalizedQuery]);

  const hasResults = showAutoOption || filteredGroups.length > 0;

  if (!isSupported) {
    return (
      <button
        type="button"
        className="chat-icon-btn chat-icon-btn--disabled"
        title="Voice dictation is not supported in this browser"
        disabled
        aria-label="Voice dictation unavailable"
      >
        <MdMicOff size={20} />
      </button>
    );
  }

  const renderOption = (code, label) => {
    const isActive = code === languagePreference;
    return (
      <button
        key={code}
        type="button"
        role="option"
        aria-selected={isActive}
        className={`voice-lang-option${
          isActive ? " voice-lang-option--active" : ""
        }`}
        onClick={() => handleSelectLanguage(code)}
      >
        <span className="voice-lang-option__label">{label}</span>
        {isActive && (
          <MdCheck className="voice-lang-option__check" size={16} />
        )}
      </button>
    );
  };

  return (
    <div className="voice-recorder-wrapper" ref={wrapperRef}>
      <button
        type="button"
        ref={triggerRef}
        className={`voice-lang-trigger${
          isPanelOpen && !isClosing ? " voice-lang-trigger--open" : ""
        }`}
        onClick={togglePanel}
        disabled={isRecording}
        title={triggerTitle}
        aria-label="Dictation language"
        aria-haspopup="listbox"
        aria-expanded={isPanelOpen && !isClosing}
      >
        <MdLanguage className="voice-lang-trigger__globe" size={15} />
        <span className="voice-lang-trigger__code">{triggerShortLabel}</span>
        <MdExpandMore className="voice-lang-trigger__chevron" size={15} />
      </button>

      <VoiceTipsButton
        lang={activeLang}
        autoPunctuation={autoPunctuationSupported}
        disabled={isRecording}
      />

      <button
        type="button"
        className={`chat-icon-btn voice-mic-btn${
          isRecording ? " chat-icon-btn--recording" : ""
        }`}
        onClick={handleMicClick}
        disabled={disabled && !isRecording}
        title={micTitle}
        aria-label={isRecording ? "Stop recording" : "Start voice dictation"}
        aria-pressed={isRecording}
      >
        <MdMic size={20} />
      </button>

      {isRecording && (
        <span className="voice-recording-badge" aria-live="polite">
          Recording…
        </span>
      )}

      {isPanelOpen &&
        panelStyle &&
        createPortal(
          <div
            ref={panelRef}
            className={`voice-lang-panel${dropUp ? " voice-lang-panel--up" : " voice-lang-panel--down"}${
              isClosing ? " voice-lang-panel--closing" : ""
            }`}
            style={panelStyle}
            role="listbox"
            aria-label="Dictation language"
          >
            <div className="voice-lang-panel__search">
              <MdSearch size={16} className="voice-lang-panel__search-icon" />
              <input
                ref={searchRef}
                type="text"
                className="voice-lang-panel__search-input"
                placeholder="Search language"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                aria-label="Search language"
              />
            </div>

            <div className="voice-lang-panel__list">
              {showAutoOption &&
                renderOption(DICTATION_LANG_AUTO, "Auto (Browser)")}

              {filteredGroups.map((group) => (
                <div className="voice-lang-group" key={group.groupLabel}>
                  <div className="voice-lang-group__label">
                    {group.groupLabel}
                  </div>
                  {group.languages.map(({ code, label }) =>
                    renderOption(code, label)
                  )}
                </div>
              ))}

              {!hasResults && (
                <div className="voice-lang-panel__empty">
                  No languages found
                </div>
              )}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};

export default VoiceRecorder;
