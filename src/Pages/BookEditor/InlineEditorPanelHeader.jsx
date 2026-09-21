const DEFAULT_TITLE = "Drafting Space";
const DEFAULT_SUBTITLE = (
  <>
    Write your manuscript here in your own words. Reference your chapter/scene
    outline, Story Bible, and character dossiers, as you draft. Stuck while you
    are drafting? Tap Olivia&apos;s bubble head anytime to ask about a scene or
    get help.
  </>
);

const InlineEditorPanelHeader = ({
  id,
  className = "",
  title = DEFAULT_TITLE,
  subtitle = DEFAULT_SUBTITLE,
}) => (
  <div
    id={id}
    className={[
      "panel-header panel-header--center panel-header--drafting-inline",
      className,
    ]
      .filter(Boolean)
      .join(" ")}
  >
    <div className="panel-header-row">
      <p className="panel-header-title">{title}</p>
      <p className="panel-header-subtitle">{subtitle}</p>
    </div>
  </div>
);

export default InlineEditorPanelHeader;
