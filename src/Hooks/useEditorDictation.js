import { useRef, useCallback } from "react";
import { getLiveDictationDelta } from "../utils/dictationTranscript";

/**
 * Live dictation for RichTextEditor (Quill): tracks accepted speech prefix so
 * keyboard/caret rebases only append new words instead of replaying old ones.
 *
 * @param {{ richEditorRef: React.RefObject<{ beginDictationAtCursor?: Function, updateDictationAtCursor?: Function, endDictationAtCursor?: Function, insertTextAtCursor?: Function }> }} options
 */
export const useEditorDictation = ({ richEditorRef }) => {
  const dictationStartRef = useRef(null);
  const lastLiveRef = useRef("");
  const acceptedLiveRef = useRef("");
  const autoPunctuationRef = useRef(false);

  const markSpeechAcceptedThroughCurrentLive = useCallback(() => {
    acceptedLiveRef.current = lastLiveRef.current;
  }, []);

  const handleEditorVoiceTranscript = useCallback(
    (transcript) => {
      const startIndex = dictationStartRef.current;
      const delta = getLiveDictationDelta(
        String(transcript || ""),
        acceptedLiveRef.current
      );
      const formatting = { autoPunctuation: autoPunctuationRef.current };

      if (startIndex != null) {
        richEditorRef.current?.endDictationAtCursor?.(
          startIndex,
          delta,
          formatting
        );
        dictationStartRef.current = null;
        lastLiveRef.current = "";
        acceptedLiveRef.current = "";
        autoPunctuationRef.current = false;
        return;
      }

      const trimmed = delta.trim();
      if (trimmed) {
        richEditorRef.current?.insertTextAtCursor?.(trimmed, formatting);
      }
    },
    [richEditorRef]
  );

  const handleEditorDictationStart = useCallback(() => {
    dictationStartRef.current =
      richEditorRef.current?.beginDictationAtCursor?.() ?? null;
    lastLiveRef.current = "";
    acceptedLiveRef.current = "";
    autoPunctuationRef.current = false;
  }, [richEditorRef]);

  const handleEditorDictationProgress = useCallback(
    ({ live, autoPunctuation }) => {
      const liveText = String(live || "");
      // Track the freshest live transcript before applying so a manual edit that
      // interleaves with throttled progress locks against the latest baseline.
      lastLiveRef.current = liveText;
      if (autoPunctuation != null) {
        autoPunctuationRef.current = autoPunctuation;
      }

      const startIndex = dictationStartRef.current;
      if (startIndex == null) return;

      const delta = getLiveDictationDelta(liveText, acceptedLiveRef.current);
      richEditorRef.current?.updateDictationAtCursor?.(startIndex, delta, {
        autoPunctuation: autoPunctuationRef.current,
      });
    },
    [richEditorRef]
  );

  const handleEditorDictationManualEdit = useCallback(
    (newStart) => {
      dictationStartRef.current = newStart;
      markSpeechAcceptedThroughCurrentLive();
    },
    [markSpeechAcceptedThroughCurrentLive]
  );

  return {
    dictationStartRef,
    handleEditorVoiceTranscript,
    handleEditorDictationStart,
    handleEditorDictationProgress,
    handleEditorDictationManualEdit,
  };
};
