import { useDraggableFab } from "../BookEditor/useDraggableFab";

/**
 * Draggable "Ask Ellis" floating avatar for the upload viewer editor column.
 * Reuses the Book Editor FAB drag hook + `.olivia-floating-*` styles, swapping
 * in Ellis' avatar.
 */
const EllisFloatingButton = ({
  containerRef,
  visible = true,
  disabled = false,
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
            visible
              ? "olivia-floating-btn--visible"
              : "olivia-floating-btn--hidden",
          ]
            .filter(Boolean)
            .join(" ")}
          aria-label="Open Ellis' chat"
          title="Drag to move · Click to ask Ellis"
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
                "url(/assets/images/ellis.png), url(/assets/images/Ellis-Avatar.jpg)",
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

export default EllisFloatingButton;
