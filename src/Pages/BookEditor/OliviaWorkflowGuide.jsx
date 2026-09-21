import { useState, useRef, useEffect, useCallback } from "react";
import { LuChevronLeft, LuChevronRight, LuX } from "react-icons/lu";
import { TbPencil, TbTrash, TbMessageCircle } from "react-icons/tb";
import { MdDragIndicator } from "react-icons/md";
import "./OliviaWorkflowGuide.scss";

/**
 * Seven-step onboarding walkthrough for the Outlining & Drafting Studio. Copy is
 * sourced from the client's "Olivia Guide" (Workflow Update). Cards are shown one
 * at a time with Back / Next controls; the final card opens Olivia.
 *
 * Two render modes:
 *  - "inline": fills the pre-outline editor surface (default empty state).
 *  - "overlay": a centered modal used when re-opening the guide later.
 */

const TOTAL_CARDS = 7;

const OliviaAvatar = () => (
  <div className="olivia-guide-avatar" aria-hidden="true">
    <img
      src="/assets/images/olivia.png"
      alt=""
      onError={(e) => {
        e.target.src = "/assets/images/avatar.jpg";
      }}
    />
  </div>
);

const CARD_1 = () => (
  <>
    <h2 className="olivia-guide-title">
      Welcome to Olivia&apos;s{" "}
      <span className="olivia-guide-title-nowrap">
        Outlining &amp; Drafting Studio ✨
      </span>
    </h2>
    <div className="olivia-guide-text">
      <p>
        <strong>
          📌 Important Instructions for Working with Olivia: Please read this
          guide before you begin. You can always find it again in the Story Hub.
        </strong>
      </p>
      <p>
        Your <strong>Story Bible</strong> and <strong>Character Dossiers</strong> are saved here, so you can
        reference them as you build your novel.
      </p>
      <p>
        You&apos;ll find them in the top left corner under{" "}
        <strong>Story Hub</strong> 👈
      </p>
      <p>
        I have persistent memory of your novel, which means I remember what is
        saved in your Story Hub as you build, adjust, and refine your project.
        Your <strong>Story Bible</strong> and <strong>Character Dossiers</strong> are my source of truth, so if
        something important changes, like a character&apos;s role, POV, timeline
        structure, or your general story summary, update those sections so my
        guidance stays accurate. 😊
      </p>
      <p>
        Next, I&apos;ll walk you through two ways to work with me in the
        Outlining &amp; Drafting Studio.
      </p>
      <div className="olivia-guide-callout">
        <p className="olivia-guide-callout-title">
          Path 1: Starting From Scratch
        </p>
        <p>
          Best if you have an idea, scattered notes, or a partial draft.
        </p>
      </div>
      <div className="olivia-guide-callout">
        <p className="olivia-guide-callout-title">
          Path 2: Rebuild Structure for a Finished or Partial Draft, or Existing
          Outline
        </p>
        <p>
          Best if you already have a finished first draft, or partial draft or
          outline, and like the general direction, and know the structure needs
          work.
        </p>
      </div>
    </div>
  </>
);

const CARD_2 = () => (
  <>
    <h2 className="olivia-guide-title">
      Path 1: Starting From Scratch 🧭
    </h2>
    <div className="olivia-guide-text">
      <p>Best if you have an idea, scattered notes, or a partial draft.</p>
      <p>
        There are two ways we can build the structural skeleton of your novel.
        Neither is better. The right choice depends on how you prefer to think
        through your story.
      </p>
      <div className="olivia-guide-callout">
        <p className="olivia-guide-callout-title">
          Option 1: Build Your 15-Chapter Core Spine
        </p>
        <p>
          We identify the 15 major chapters that anchor your story across Act
          1, Act 2, and Act 3.
        </p>
        <p>
          If you know Save the Cat 🐱, this is a similar starting concept, we
          are building a skeleton first across 15 major chapters across 3 acts.
        </p>
        <p>
          Once the core spine is in place, we will use a Scene Layering Table to
          explore additional chapters and connective scenes.
        </p>
      </div>
      <div className="olivia-guide-callout">
        <p className="olivia-guide-callout-title">
          Option 2: Build Chronologically
        </p>
        <p>
          We begin with your opening chapter and build forward in story order.
        </p>
        <p>
          This approach works well if you already have a strong sense of the
          path your story may take over the next 15 to 20 chapters, or if you
          simply prefer to develop your novel sequentially rather than jumping
          ahead to major turning points.
        </p>
      </div>
      <p>Here is where both paths lead:</p>
      <p>
        👉 <strong>Full</strong> novel to length chapter plans, usually 40 to 60 chapters, or
        whatever your story requires.
      </p>
      <p>Don&apos;t worry, I&apos;ll guide you. 😊</p>
    </div>
  </>
);

const CARD_3 = () => (
  <>
    <h2 className="olivia-guide-title">
      Path 2: Remastering Structure for a Finished or Partial Draft, or Existing
      Outline 🔧
    </h2>
    <div className="olivia-guide-text">
      <p>
        If you already have a finished or partial draft or existing outline,
        like the general direction, and are looking to remaster your beat
        structure chapter by chapter, we are going to rebuild your outline
        chronologically to reflect your draft&apos;s or existing outline&apos;s
        direction, so just tell me that&apos;s what we are going to do 😊
      </p>
      <p>Here&apos;s how we&apos;re going to do it:</p>
      <p>
        When you are rebuilding from a draft or outline, 🛑 do not paste the
        full chapters or outline — that&apos;s not as efficient for me because
        I want to think bigger than what you already wrote and I know all of
        your story elements. 🛑 I don&apos;t want to get boxed in by what is
        already on the page. ✍ We&apos;re going BIGGER 🙂
      </p>
      <p>
        Instead give me the high-level overview of the chapter, what is working
        and what isn&apos;t, just like if you are talking to an editor. 🎙️{" "}
        <strong>
          You can also use the dictation feature to speak your response aloud.
        </strong>
      </p>
      <p>
        <strong>
          🎙️ You can also use the dictation feature to speak your response
          aloud.
        </strong>
      </p>
      <p>For example:</p>
      <blockquote className="olivia-guide-quote">
        <p>
          &ldquo;My Chapter One for <em>The Lanterns of Blackwell Manor</em>{" "}
          opens with Eliza arriving at her late aunt&apos;s crumbling estate
          after receiving a strange letter warning her not to sell the house.
          She is greeted by the housekeeper, Mrs. Vale, who clearly knows more
          than she is saying. Eliza finds a locked room at the end of the west
          corridor and hears someone crying behind the door, but when she
          finally gets the key, the room is empty.
        </p>
        <p>
          Right now, the chapter has atmosphere, but it does not have enough
          pressure. I want the ending to feel more dangerous. I need a stronger
          turn, a bigger sense that Eliza has crossed into something she cannot
          explain, and a reason for the reader to feel like opening that door
          has consequences.&rdquo;
        </p>
      </blockquote>
      <p>
        Yours will be different, of course, based on your own writer&apos;s
        intuition. Maybe you know you need more tension for example, or you know
        the chapter is not exciting enough for whatever reason. That is exactly
        the kind of direction I need.
      </p>
      <p>
        The goal is to take whatever you have imaged already, and make it much
        stronger.
      </p>
      <p>😊 You&apos;re going to love this!</p>
    </div>
  </>
);

const CARD_4 = () => (
  <>
    <h2 className="olivia-guide-title">Scene Layering Table Cue at Scene 16</h2>
    <div className="olivia-guide-text">
      <div className="olivia-guide-callout">
        <p className="olivia-guide-callout-title">
          Path 1: Starting From Scratch 🧭
        </p>
        <p>
          Once your first 15 core chapters or scenes are built, I&apos;ll move
          into scene layering. This is where we add connective chapters, deepen
          subplots, strengthen cause and effect, and complete the full arc.
        </p>
        <p>
          If you chose the chronological path, you can ask me to skip the Scene
          Layering Table.
        </p>
      </div>
      <div className="olivia-guide-callout">
        <p className="olivia-guide-callout-title">
          Path 2: Rebuilding A Finished First Draft, Partial, or Existing
          Outline 🔧
        </p>
        <p>
          If you are rebuilding chronologically and I offer a scene layering
          table around Chapter/Scene 16, just remind me:
        </p>
        <blockquote className="olivia-guide-quote olivia-guide-quote--compact">
          <p>
            &ldquo;Please skip scene layering for now and keep outlining my
            chapters/scenes in order. Let&apos;s continue with Chapter/Scene
            16.&rdquo;
          </p>
        </blockquote>
      </div>
    </div>
  </>
);

const CARD_5 = () => (
  <>
    <h2 className="olivia-guide-title">Draft Inside The Studio ✍</h2>
    <div className="olivia-guide-text">
      <p>
        Once your outline is ready, this space becomes your drafting studio.
      </p>
      <p>
        You&apos;ll write your chapters here in your own words, with your
        outline, Story Bible, and characters beside you. 😊
      </p>
      <p>
        If you already have a draft, you can bring each chapter into the
        drafting space and revise it based on your new beat structure.
      </p>
    </div>
  </>
);

const CARD_6 = () => (
  <>
    <h2 className="olivia-guide-title">How I Coach You While You Write ✍</h2>
    <div className="olivia-guide-text">
      <p>Spoiler alert: You may be breaking up with your other word processor. 🙂</p>
      <p>
        Once you begin drafting or rewriting your chapters here, I&apos;ll
        unlock my Draft Coaching feature. It appears in your outline beside each
        completed chapter, like this:
      </p>
      <div className="olivia-guide-coaching-preview" aria-hidden="true">
        <div className="outline-box olivia-guide-outline-box">
          <div
            className="scene-item olivia-guide-scene-item"
            style={{ backgroundColor: "#03587a" }}
          >
            <div className="scene-item-row">
              <span className="scene-title-text">Chapter 3 — The Locked Room</span>
              <div className="scene-actions">
                <button
                  type="button"
                  tabIndex={-1}
                  className="scene-action-btn scene-action-btn--coach olivia-guide-coach-highlight"
                  title="Coach Draft"
                >
                  <TbMessageCircle size={14} />
                </button>
                <button
                  type="button"
                  tabIndex={-1}
                  className="scene-action-btn"
                  title="Rename scene"
                >
                  <TbPencil size={14} />
                </button>
                <button
                  type="button"
                  tabIndex={-1}
                  className="scene-action-btn scene-action-btn--delete"
                  title="Delete scene"
                >
                  <TbTrash size={14} />
                </button>
                <span className="drag-handle-wrap drag-handle drag-handle-wrap--affordance">
                  <MdDragIndicator size={14} />
                </span>
              </div>
            </div>
          </div>
        </div>
        <div className="olivia-guide-coach-callout">
          <span className="olivia-guide-coach-callout-arrow" aria-hidden="true" />
          <span className="olivia-guide-coach-callout-text">
            Tap this <TbMessageCircle size={13} /> icon beside a completed
            chapter to start a coaching pass
          </span>
        </div>
      </div>
      <p>
        When you ask for a coaching pass, I&apos;ll review your drafted chapter
        against your beat structure, Story Bible, character arcs, and overall
        novel structure — including what has already happened and what is still
        coming. Then I&apos;ll give you specific craft opportunities to
        strengthen the chapter.
      </p>
      <p>
        This is not just pacing &amp; tension feedback. I get really specific.
        It may be something like: &ldquo;Your character needs to get drunker
        with each beat so the final choice actually earns its payoff.&rdquo; 🍷
      </p>
      <p>
        I also have revision intelligence. Once you make changes, you can ask me
        to look again and I&apos;ll give you a second pass. Try to keep it to
        two passes while you are drafting — the goal is to write your strongest
        draft and keep moving forward. 🚀
      </p>
    </div>
  </>
);

const CARD_7 = () => (
  <>
    <h2 className="olivia-guide-title">Ask Me Anytime 💬</h2>
    <div className="olivia-guide-text">
      <p>
        You may be used to taking story questions to general AI chat tools, but
        you don&apos;t need to leave this workspace to brainstorm.
      </p>
      <p>
        That&apos;s a little like stepping out of a Lamborghini and hailing a
        cab instead 😊
      </p>
      <p>
        Stay here. Because the experience is like an AI chat, but I&apos;m
        trained specifically in novel structure, genre expectations, and scene
        design, and never losing track of your novel as it evolves. 🧠✨
      </p>
      <p>
        If you get stuck while drafting, or just need to ideate in general,
        click my bubble and ask me anytime. 😊
      </p>
      <p>🎙️ You can also use dictation if that is easier.</p>
      <p>
        ✍️ Remember, I&apos;m your trained story architect &amp; draft coach. I
        support structure, story logic, scene design, but I never write or
        rewrite your prose. That&apos;s your job. 😊
      </p>
      <p>👉 When you&apos;re ready, click my bubble to begin.</p>
      <p>
        <strong>
          📌 Remember: You can always find this Olivia Guide in the Story Hub or
          you can revisit your bitesize tutorials in your dashboard whenever you
          need.
        </strong>
      </p>
    </div>
  </>
);

const WORKFLOW_CARDS = [
  CARD_1,
  CARD_2,
  CARD_3,
  CARD_4,
  CARD_5,
  CARD_6,
  CARD_7,
];

const OliviaWorkflowGuide = ({
  variant = "inline",
  onStartOlivia,
  onComplete,
  onClose,
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const bodyRef = useRef(null);
  const titleRef = useRef(null);
  const didMountRef = useRef(false);

  const isFirst = currentStep === 0;
  const isLast = currentStep === TOTAL_CARDS - 1;
  const CardContent = WORKFLOW_CARDS[currentStep];

  // On each step change, scroll the card body to the top and move focus to the
  // card content so screen-reader users hear the new card. Skip the very first
  // render so we don't yank focus (and scroll) when the guide first appears.
  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = 0;
    if (!didMountRef.current) {
      didMountRef.current = true;
      return;
    }
    if (titleRef.current) {
      try {
        titleRef.current.focus();
      } catch {
        // focus() can throw on detached nodes — non-fatal.
      }
    }
  }, [currentStep]);

  const goBack = useCallback(() => {
    setCurrentStep((s) => Math.max(0, s - 1));
  }, []);

  const goNext = useCallback(() => {
    setCurrentStep((s) => Math.min(TOTAL_CARDS - 1, s + 1));
  }, []);

  const handleStart = useCallback(() => {
    onComplete?.();
    onStartOlivia?.();
  }, [onComplete, onStartOlivia]);

  const card = (
    <div
      className={`olivia-guide olivia-guide--${variant}`}
      role="group"
      aria-label={`Olivia's Guide, card ${currentStep + 1} of ${TOTAL_CARDS}`}
    >
      <div className="olivia-guide-card">
        {variant === "overlay" && (
          <button
            type="button"
            className="olivia-guide-close"
            onClick={onClose}
            aria-label="Close guide"
          >
            <LuX size={18} aria-hidden="true" />
          </button>
        )}

        <div className="olivia-guide-card-head">
          <OliviaAvatar />
        </div>

        <div className="olivia-guide-card-body" ref={bodyRef}>
          <div
            className="olivia-guide-card-inner"
            ref={titleRef}
            tabIndex={-1}
            aria-live="polite"
          >
            <CardContent />
          </div>
        </div>

        <div className="olivia-guide-footer">
          <div className="olivia-guide-progress" aria-hidden="true">
            {WORKFLOW_CARDS.map((_, i) => (
              <span
                key={i}
                className={`olivia-guide-dot${
                  i === currentStep ? " is-active" : ""
                }${i < currentStep ? " is-done" : ""}`}
              />
            ))}
          </div>

          <div className="olivia-guide-controls">
            <span className="olivia-guide-counter">
              Card {currentStep + 1} of {TOTAL_CARDS}
            </span>

            <div className="olivia-guide-buttons">
              {!isFirst && (
                <button
                  type="button"
                  className="olivia-guide-btn olivia-guide-btn--ghost"
                  onClick={goBack}
                >
                  <LuChevronLeft size={16} aria-hidden="true" />
                  Back
                </button>
              )}

              {!isLast && (
                <button
                  type="button"
                  className="olivia-guide-btn olivia-guide-btn--primary"
                  onClick={goNext}
                >
                  OK, got it
                  <LuChevronRight size={16} aria-hidden="true" />
                </button>
              )}

              {isLast &&
                (variant === "inline" ? (
                  <button
                    type="button"
                    className="olivia-guide-btn olivia-guide-btn--primary"
                    onClick={handleStart}
                  >
                    Start Act 1, Chapter 1 with Olivia
                  </button>
                ) : (
                  <button
                    type="button"
                    className="olivia-guide-btn olivia-guide-btn--primary"
                    onClick={onClose}
                  >
                    Done
                  </button>
                ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  if (variant === "overlay") {
    return (
      <div
        className="olivia-guide-overlay"
        role="dialog"
        aria-modal="true"
        aria-label="Olivia's Guide"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose?.();
        }}
      >
        {card}
      </div>
    );
  }

  return card;
};

export default OliviaWorkflowGuide;
