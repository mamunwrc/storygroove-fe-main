import { useRef, useCallback } from "react";
import {
  getLiveDictationDelta,
  joinDictationToBase,
} from "../utils/dictationTranscript";

/**
 * Live dictation helpers for controlled textareas.
 *
 * @param {Object} options
 * @param {() => string} options.getDraft
 * @param {(next: string) => void} options.setDraft
 */
export const useDictationDraft = ({ getDraft, setDraft }) => {
  const baseRef = useRef("");
  const lastLiveRef = useRef("");
  const acceptedLiveRef = useRef("");
  const lastWrittenRef = useRef(null);
  const autoPunctuationRef = useRef(false);

  const onDictationStart = useCallback(() => {
    baseRef.current = getDraft();
    lastLiveRef.current = "";
    acceptedLiveRef.current = "";
    lastWrittenRef.current = baseRef.current;
    autoPunctuationRef.current = false;
  }, [getDraft]);

  const onDictationProgress = useCallback(
    ({ live, autoPunctuation }) => {
      const liveText = String(live || "");
      if (autoPunctuation != null) {
        autoPunctuationRef.current = autoPunctuation;
      }
      if (
        lastWrittenRef.current != null &&
        getDraft() !== lastWrittenRef.current
      ) {
        // User edited the draft while recording — keep their text and only
        // append speech that arrives after this point.
        baseRef.current = getDraft();
        acceptedLiveRef.current = lastLiveRef.current;
      }

      const delta = getLiveDictationDelta(liveText, acceptedLiveRef.current);
      const next = joinDictationToBase(baseRef.current, delta, {
        autoPunctuation: autoPunctuationRef.current,
      });
      lastLiveRef.current = liveText;
      lastWrittenRef.current = next;
      setDraft(next);
    },
    [getDraft, setDraft]
  );

  const onTranscript = useCallback(
    (finalText) => {
      if (
        lastWrittenRef.current != null &&
        getDraft() !== lastWrittenRef.current
      ) {
        baseRef.current = getDraft();
        acceptedLiveRef.current = lastLiveRef.current;
      }

      const delta = getLiveDictationDelta(
        String(finalText || ""),
        acceptedLiveRef.current
      );
      const next = joinDictationToBase(baseRef.current, delta, {
        autoPunctuation: autoPunctuationRef.current,
      });
      setDraft(next);
      baseRef.current = "";
      lastLiveRef.current = "";
      acceptedLiveRef.current = "";
      lastWrittenRef.current = null;
      autoPunctuationRef.current = false;
    },
    [getDraft, setDraft]
  );

  return {
    onDictationStart,
    onDictationProgress,
    onTranscript,
  };
};
