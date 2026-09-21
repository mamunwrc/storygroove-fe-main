import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import {
  MdHelpOutline,
  MdClose,
  MdArrowRightAlt,
  MdInfoOutline,
} from "react-icons/md";
import { getSpokenPunctuationGuide } from "../../utils/spokenPunctuationRules";
import "./VoiceTipsButton.scss";

const PANEL_WIDTH = 300;
const PANEL_MAX_HEIGHT = 420;
const VIEWPORT_MARGIN = 8;
const CLOSE_ANIMATION_MS = 150;

/**
 * VoiceTipsButton
 *
 * Quiet "?" affordance beside the mic that opens a language-aware reference of
 * spoken punctuation/layout commands. Self-contained: owns its popover portal,
 * positioning, outside-click and Escape handling.
 *
 * Props:
 *   lang — active dictation locale (BCP-47); guide content keys off this
 *   autoPunctuation — true when the browser auto-punctuates (Chrome unspokenPunctuation)
 *   disabled — hide interactions while recording
 */
const VoiceTipsButton = ({ lang, autoPunctuation = false, disabled = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [panelStyle, setPanelStyle] = useState(null);
  const [dropUp, setDropUp] = useState(true);

  const triggerRef = useRef(null);
  const panelRef = useRef(null);
  const closeTimerRef = useRef(null);

  const guide = useMemo(() => getSpokenPunctuationGuide(lang), [lang]);

  const computePosition = useCallback(() => {
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

  const close = useCallback(() => {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    setIsClosing(true);
    closeTimerRef.current = setTimeout(() => {
      setIsOpen(false);
      setIsClosing(false);
      triggerRef.current?.focus();
    }, CLOSE_ANIMATION_MS);
  }, []);

  const open = useCallback(() => {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    computePosition();
    setIsClosing(false);
    setIsOpen(true);
  }, [computePosition]);

  const toggle = () => {
    if (isOpen && !isClosing) {
      close();
    } else {
      open();
    }
  };

  useEffect(() => {
    if (!isOpen) return undefined;

    const handlePointerDown = (event) => {
      if (
        triggerRef.current?.contains(event.target) ||
        panelRef.current?.contains(event.target)
      ) {
        return;
      }
      close();
    };
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        close();
      }
    };
    const handleReposition = () => computePosition();

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("scroll", handleReposition, true);
    window.addEventListener("resize", handleReposition);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("scroll", handleReposition, true);
      window.removeEventListener("resize", handleReposition);
    };
  }, [isOpen, close, computePosition]);

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    };
  }, []);

  const renderCommandRow = ({ say, symbol, label, alt }) => (
    <li className="voice-tips__cmd" key={`${label}-${say}`}>
      <span className="voice-tips__symbol" aria-hidden="true">
        {symbol}
      </span>
      <span className="voice-tips__cmd-text">
        <span className="voice-tips__cmd-label">{label}</span>
        <span className="voice-tips__cmd-say">
          “{say}”{alt ? <span className="voice-tips__cmd-alt"> · “{alt}”</span> : null}
        </span>
      </span>
      <MdArrowRightAlt className="voice-tips__cmd-arrow" size={16} aria-hidden="true" />
    </li>
  );

  return (
    <>
      <button
        type="button"
        ref={triggerRef}
        className={`voice-tips-trigger${
          isOpen && !isClosing ? " voice-tips-trigger--open" : ""
        }`}
        onClick={toggle}
        disabled={disabled}
        title={guide.labels.title}
        aria-label={guide.labels.title}
        aria-haspopup="dialog"
        aria-expanded={isOpen && !isClosing}
      >
        <MdHelpOutline size={16} />
      </button>

      {isOpen &&
        panelStyle &&
        createPortal(
          <div
            ref={panelRef}
            className={`voice-tips-panel${
              dropUp ? " voice-tips-panel--up" : " voice-tips-panel--down"
            }${isClosing ? " voice-tips-panel--closing" : ""}`}
            style={panelStyle}
            role="dialog"
            aria-label={guide.labels.title}
          >
            <div className="voice-tips-panel__header">
              <span className="voice-tips-panel__title">
                {guide.labels.title}
              </span>
              <button
                type="button"
                className="voice-tips-panel__close"
                onClick={close}
                aria-label="Close"
              >
                <MdClose size={16} />
              </button>
            </div>

            <div className="voice-tips-panel__body">
              {autoPunctuation ? (
                <p className="voice-tips__note voice-tips__note--auto">
                  <MdInfoOutline size={15} aria-hidden="true" />
                  <span>{guide.autoNote}</span>
                </p>
              ) : (
                <p className="voice-tips__intro">{guide.intro}</p>
              )}

              {!guide.isSupported && (
                <p className="voice-tips__note voice-tips__note--warn">
                  <MdInfoOutline size={15} aria-hidden="true" />
                  <span>{guide.unsupportedNote}</span>
                </p>
              )}

              <div className="voice-tips__section">
                <div className="voice-tips__section-label">
                  {guide.labels.punctuation}
                </div>
                <ul className="voice-tips__list">
                  {guide.marks.map(renderCommandRow)}
                </ul>
              </div>

              <div className="voice-tips__section">
                <div className="voice-tips__section-label">
                  {guide.labels.layout}
                </div>
                <ul className="voice-tips__list">
                  {guide.layout.map(renderCommandRow)}
                </ul>
              </div>

              <div className="voice-tips__section">
                <div className="voice-tips__section-label">
                  {guide.labels.examples}
                </div>
                <ul className="voice-tips__examples">
                  {guide.examples.map((ex) => (
                    <li
                      className={`voice-tips__example voice-tips__example--${ex.kind}`}
                      key={ex.text}
                    >
                      <span className="voice-tips__example-mark" aria-hidden="true">
                        {ex.kind === "do" ? "✓" : "✕"}
                      </span>
                      <span>{ex.text}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
};

export default VoiceTipsButton;
