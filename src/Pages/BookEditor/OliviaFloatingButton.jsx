import React from "react";
import { useDraggableFab } from "./useDraggableFab";

const OliviaFloatingButton = ({
  containerRef,
  visible,
  attention,
  disabled,
  onOpenChat,
  snapToDefaultWhen = false,
}) => {
  const { anchorRef, buttonRef, isDragging, isPositioned, handlePointerDown } =
    useDraggableFab(containerRef, onOpenChat, snapToDefaultWhen);

  return (
    <div
      ref={anchorRef}
      className={[
        "olivia-floating-anchor",
        isDragging && "is-dragging",
        isPositioned && "is-positioned",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="floating-fab-row">
        <button
          ref={buttonRef}
          type="button"
          className={[
            "olivia-floating-btn",
            visible ? "olivia-floating-btn--visible" : "olivia-floating-btn--hidden",
            attention && "olivia-floating-btn--attention",
          ]
            .filter(Boolean)
            .join(" ")}
          aria-label="Open Olivia chat"
          title="Drag to move · Click to open Olivia"
          onPointerDown={handlePointerDown}
          disabled={disabled}
        >
          <div
            className="olivia-floating-btn__avatar"
            aria-hidden="true"
            draggable={false}
            onContextMenu={(e) => e.preventDefault()}
            onDragStart={(e) => e.preventDefault()}
            style={{
              backgroundImage:
                "url(/assets/images/olivia.png), url(/assets/images/avatar.jpg)",
              backgroundSize: "cover",
              backgroundPosition: "center",
              backgroundRepeat: "no-repeat",
            }}
          />
        </button>
      </div>
    </div>
  );
};

export default OliviaFloatingButton;
