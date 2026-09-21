import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Tabs, Tab, Button, Form, Modal } from "react-bootstrap";
import { toast } from "react-hot-toast";
import {
  MdAdd,
  MdSave,
  MdDelete,
  MdRefresh,
  MdFactCheck,
  MdClose,
  MdSearch,
  MdMenuBook,
  MdRule,
  MdViewList,
  MdCategory,
  MdCheckCircle,
  MdWarning,
  MdTouchApp,
  MdFileDownload,
  MdUpload,
} from "react-icons/md";

import {
  getMethodologyRules,
  upsertMethodologyRule,
  deleteMethodologyRule,
  getPromptTemplates,
  upsertPromptTemplate,
  getGenreOverlays,
  upsertGenreOverlay,
  deleteGenreOverlay,
  runMethodologyAudit,
  exportMethodologyBundle,
  importMethodologyBundle,
} from "../../api/assistant";

import "./MethodologyAdmin.css";

// ---------------------------------------------------------------------------
// Constants the BE expects. Kept here (rather than fetched) because the
// shape is stable across the assembler / worker / FE. If you add a
// layering phase, update both this file and
// `storygroove-be/constants/oliviaUiMessages.js`.
// ---------------------------------------------------------------------------

const LAYERING_PHASES = [
  "outlining",
  "phase1_table",
  "phase2_expansion",
  "coaching",
  "drafting",
];

const RULE_SCOPES = ["universal", "phase"];
const OVERLAY_APPLIES_AS = ["base_genre", "additional_overlay"];

// Categories observed in the existing seed; new categories can be typed
// directly (the field is a free-form input falling back on a datalist).
const KNOWN_OVERLAY_CATEGORIES = [
  "literary",
  "speculative",
  "thriller",
  "romance",
  "mystery",
  "historical",
  "young_adult",
  "children",
  "memoir",
  "horror",
  "other",
];

const PHASE_LABELS = {
  outlining: "Outlining",
  phase1_table: "Phase 1 — Table",
  phase2_expansion: "Phase 2 — Expansion",
  coaching: "Coaching",
  drafting: "Drafting",
};

const formatPhase = (p) => PHASE_LABELS[p] || p;

/** Client-side mirror of BE `normalizeImportBundle` for preview counts. */
const normalizeClientBundle = (parsed) => {
  if (Array.isArray(parsed)) {
    const first = parsed[0];
    if (first?.genreKey != null) {
      return { rules: [], templates: [], overlays: parsed };
    }
    if (typeof first?.sceneIndex === "number") {
      return { rules: [], templates: parsed, overlays: [] };
    }
    return { rules: parsed, templates: [], overlays: [] };
  }
  if (!parsed || typeof parsed !== "object") {
    throw new Error("File must contain a JSON object or array");
  }
  return {
    rules: Array.isArray(parsed.rules) ? parsed.rules : [],
    templates: Array.isArray(parsed.templates) ? parsed.templates : [],
    overlays: Array.isArray(parsed.overlays) ? parsed.overlays : [],
  };
};

const formatImportTally = (label, tally) => {
  if (!tally) return "";
  const parts = [];
  if (tally.added) parts.push(`${tally.added} added`);
  if (tally.updated) parts.push(`${tally.updated} updated`);
  if (tally.unchanged) parts.push(`${tally.unchanged} unchanged`);
  if (tally.disabled) parts.push(`${tally.disabled} disabled`);
  if (tally.errors?.length) parts.push(`${tally.errors.length} errors`);
  return parts.length ? `${label}: ${parts.join(", ")}` : `${label}: no changes`;
};

// ---------------------------------------------------------------------------
// Layout primitives
// ---------------------------------------------------------------------------


const EmptyEditorPane = ({ title, description, actionLabel, onAction }) => (
  <div className="methodology-admin__empty-panel">
    <MdTouchApp className="methodology-admin__empty-panel-icon" aria-hidden />
    <h5>{title}</h5>
    <p>{description}</p>
    {onAction && (
      <Button variant="outline-primary" className="mt-3" onClick={onAction}>
        <MdAdd aria-hidden /> {actionLabel}
      </Button>
    )}
  </div>
);

const AuditBanner = ({ result, onDismiss }) => {
  if (!result) return null;
  const hasIssues = (result.collisions || []).length > 0;
  return (
    <div
      className={`methodology-admin__audit${hasIssues ? " has-collisions" : ""}`}
      role="status"
    >
      {hasIssues ? (
        <MdWarning className="methodology-admin__audit-icon" aria-hidden />
      ) : (
        <MdCheckCircle className="methodology-admin__audit-icon" aria-hidden />
      )}
      <div className="methodology-admin__audit-body">
        {hasIssues ? (
          <>
            <strong>{result.collisions.length} collision(s) with code constants</strong>
            <ul>
              {result.collisions.map((c, i) => (
                <li key={i}>
                  Rule <code>{c.ruleKey}</code> overlaps <code>{c.codeBlockHint}</code>
                </li>
              ))}
            </ul>
            <small>Trim rule text or keep parsing-sensitive strings in code only.</small>
          </>
        ) : (
          <strong>Audit passed — no rule overlaps with kept code constants.</strong>
        )}
      </div>
      <button
        type="button"
        className="methodology-admin__audit-dismiss"
        onClick={onDismiss}
        aria-label="Dismiss audit result"
      >
        <MdClose />
      </button>
    </div>
  );
};

// ---------------------------------------------------------------------------
// List pane
// ---------------------------------------------------------------------------

const ChipInput = ({ values, onChange, placeholder, disabled }) => {
  const safeValues = Array.isArray(values) ? values : [];
  const [draft, setDraft] = useState("");
  const commit = useCallback(() => {
    const t = draft.trim();
    if (!t) return;
    if (!safeValues.includes(t)) onChange([...safeValues, t]);
    setDraft("");
  }, [draft, safeValues, onChange]);

  return (
    <div className="methodology-admin__chips">
      {safeValues.map((v) => (
        <span key={v} className="methodology-admin__chip">
          {v}
          {!disabled && (
            <button
              type="button"
              className="methodology-admin__chip-x"
              onClick={() => onChange(safeValues.filter((x) => x !== v))}
              aria-label={`Remove ${v}`}
            >
              <MdClose />
            </button>
          )}
        </span>
      ))}
      {!disabled && (
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              commit();
            }
            if (e.key === "Backspace" && draft === "" && safeValues.length) {
              onChange(safeValues.slice(0, -1));
            }
          }}
          onBlur={commit}
          placeholder={placeholder}
        />
      )}
    </div>
  );
};

const ListPane = ({
  title,
  rows,
  totalCount,
  selectedId,
  onSelect,
  onNew,
  newButtonLabel = "New",
  searchTerm,
  onSearchChange,
  searchPlaceholder = "Search…",
  rowLabel,
  rowMeta,
  rowKey,
  rowDisabled,
  emptyHint,
  scopeFilter,
}) => (
  <div className="methodology-admin__list">
    <div className="methodology-admin__list-header">
      <div className="methodology-admin__list-title-wrap">
        <h5 className="methodology-admin__list-title">{title}</h5>
        <span className="methodology-admin__list-count">
          {rows.length}
          {totalCount != null && totalCount !== rows.length
            ? ` / ${totalCount}`
            : ""}
        </span>
      </div>
      <Button size="sm" variant="outline-primary" onClick={onNew}>
        <MdAdd aria-hidden /> {newButtonLabel}
      </Button>
    </div>
    <div className="methodology-admin__list-search">
      <MdSearch className="methodology-admin__list-search-icon" aria-hidden />
      <input
        type="search"
        value={searchTerm}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder={searchPlaceholder}
        aria-label={`Search ${title.toLowerCase()}`}
      />
    </div>
    {scopeFilter && (
      <div className="methodology-admin__filter-row" role="group" aria-label="Filter by scope">
        {scopeFilter.options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            className={[
              "methodology-admin__filter-chip",
              scopeFilter.value === opt.value ? "is-active" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            onClick={() => scopeFilter.onChange(opt.value)}
          >
            {opt.label}
          </button>
        ))}
      </div>
    )}
    <div className="methodology-admin__list-rows" role="listbox" aria-label={title}>
      {rows.length === 0 ? (
        <div className="methodology-admin__empty">
          <MdViewList className="methodology-admin__empty-icon" aria-hidden />
          <span>{emptyHint}</span>
        </div>
      ) : (
        rows.map((row) => {
          const id = rowKey(row);
          const isActive = id === selectedId;
          const disabled = rowDisabled?.(row);
          return (
            <div
              key={id}
              role="option"
              tabIndex={0}
              aria-selected={isActive}
              className={[
                "methodology-admin__list-row",
                isActive ? "is-active" : "",
                disabled ? "is-disabled" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              onClick={() => onSelect(id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSelect(id);
                }
              }}
            >
              <div className="methodology-admin__list-row-title">{rowLabel(row)}</div>
              <div className="methodology-admin__list-row-meta">{rowMeta(row)}</div>
            </div>
          );
        })
      )}
    </div>
  </div>
);

// ---------------------------------------------------------------------------
// MethodologyRule editor
// ---------------------------------------------------------------------------

const BLANK_RULE = {
  key: "",
  title: "",
  scope: "universal",
  phase: [],
  priority: 70,
  enabled: true,
  summary: "",
  text: "",
  source: "",
};

/** Mongo stores `phase: null` on universal rules — always normalize to []. */
const normalizeRule = (row) => ({
  ...BLANK_RULE,
  ...row,
  key: row?.key ?? "",
  title: row?.title ?? "",
  scope: row?.scope || "universal",
  phase: Array.isArray(row?.phase) ? row.phase : [],
  priority: row?.priority ?? 70,
  enabled: row?.enabled !== false,
  summary: row?.summary ?? "",
  text: row?.text ?? "",
  source: row?.source ?? "",
});

const RuleEditor = ({ rule, isNew, onSave, onDelete, saving, deleting }) => {
  // Initialised from props on mount; parent passes a stable `key` so this
  // component is remounted whenever the user picks a different row,
  // giving us a fresh draft. We deliberately do NOT useEffect-sync back
  // to props — that would clobber the draft on unrelated parent re-renders
  // (e.g. search box typing in the list pane).
  const [draft, setDraft] = useState(() => normalizeRule(rule));
  const phases = Array.isArray(draft.phase) ? draft.phase : [];

  const set = (patch) => setDraft((d) => ({ ...d, ...patch }));
  const togglePhase = (p) => {
    const current = Array.isArray(draft.phase) ? draft.phase : [];
    const next = current.includes(p)
      ? current.filter((x) => x !== p)
      : [...current, p];
    set({ phase: next });
  };

  const canSave =
    String(draft.key || "").trim() !== "" &&
    RULE_SCOPES.includes(draft.scope) &&
    (draft.scope === "universal" || phases.length > 0);

  return (
    <div className="methodology-admin__editor">
      <div className="methodology-admin__form-header">
        <div>
          <h5 className="methodology-admin__form-title">
            {isNew ? "New rule" : draft.title || draft.key}
          </h5>
          {!isNew && <p className="methodology-admin__form-key">{draft.key}</p>}
        </div>
        <div className="methodology-admin__form-badges">
          <span
            className={`methodology-admin__pill methodology-admin__pill--scope-${draft.scope || "universal"}`}
          >
            {draft.scope}
          </span>
          {!draft.enabled && (
            <span className="methodology-admin__pill methodology-admin__pill--disabled">
              Disabled
            </span>
          )}
        </div>
      </div>

      <div className="methodology-admin__form-body">
      <div className="methodology-admin__form-grid">
        <div className="methodology-admin__field">
          <label>Key {isNew ? "" : "(locked)"}</label>
          <input
            value={draft.key}
            disabled={!isNew}
            onChange={(e) => set({ key: e.target.value })}
            placeholder="e.g. rule_pov_consistency"
          />
        </div>
        <div className="methodology-admin__field">
          <label>Title</label>
          <input
            value={draft.title}
            onChange={(e) => set({ title: e.target.value })}
          />
        </div>
        <div className="methodology-admin__field">
          <label>Scope</label>
          <select
            value={draft.scope}
            onChange={(e) =>
              set({
                scope: e.target.value,
                phase: e.target.value === "universal" ? [] : phases,
              })
            }
          >
            {RULE_SCOPES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div className="methodology-admin__field">
          <label>Priority (0–100)</label>
          <input
            type="number"
            min={0}
            max={100}
            value={draft.priority}
            onChange={(e) => set({ priority: Number(e.target.value) || 0 })}
          />
        </div>
        <div className="methodology-admin__field methodology-admin__field--full">
          <label>
            Phase{draft.scope === "phase" ? " (required, choose ≥1)" : " (only applies when scope = phase)"}
          </label>
          <div className="methodology-admin__phase-options">
            {LAYERING_PHASES.map((p) => (
              <button
                key={p}
                type="button"
                className={phases.includes(p) ? "is-active" : ""}
                onClick={() => togglePhase(p)}
                disabled={draft.scope !== "phase"}
              >
                {formatPhase(p)}
              </button>
            ))}
          </div>
        </div>
        <div className="methodology-admin__field">
          <label>Enabled</label>
          <Form.Check
            type="switch"
            id={`rule-enabled-${draft.key || "new"}`}
            checked={!!draft.enabled}
            onChange={(e) => set({ enabled: e.target.checked })}
            label={draft.enabled ? "Active" : "Disabled"}
          />
        </div>
        <div className="methodology-admin__field">
          <label>Source (file#anchor)</label>
          <input
            value={draft.source}
            onChange={(e) => set({ source: e.target.value })}
            placeholder="e.g. methodology_v1.pdf#p4"
          />
        </div>
        <div className="methodology-admin__field methodology-admin__field--full">
          <label>Summary (1 line, shown when the rule body is demoted)</label>
          <input
            value={draft.summary}
            onChange={(e) => set({ summary: e.target.value })}
          />
        </div>
        <div className="methodology-admin__field methodology-admin__field--full">
          <label>Text (the rule body the model sees)</label>
          <textarea
            value={draft.text}
            onChange={(e) => set({ text: e.target.value })}
            rows={12}
          />
          <div className="methodology-admin__char-count">
            {(draft.text || "").length} characters
          </div>
        </div>
      </div>
      </div>

      <div className="methodology-admin__form-footer">
        {!isNew && (
          <Button
            variant="outline-danger"
            onClick={() => onDelete(draft.key)}
            disabled={deleting}
          >
            <MdDelete aria-hidden /> {deleting ? "Disabling…" : "Disable rule"}
          </Button>
        )}
        <Button
          variant="primary"
          className="methodology-admin__btn-primary ma-btn ms-auto"
          onClick={() => onSave(draft, isNew)}
          disabled={!canSave || saving}
        >
          <MdSave aria-hidden /> {saving ? "Saving…" : "Save rule"}
        </Button>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// PromptTemplate editor
// ---------------------------------------------------------------------------

const BLANK_TEMPLATE = {
  key: "",
  sceneIndex: 1,
  actNumber: 1,
  title: "",
  tentpoleHint: "",
  enabled: true,
  outputFormatLabels: [],
  template: "",
  coachingPrompt: "",
  subplotReminder: "",
  source: "",
};

const TemplateEditor = ({ template, isNew, onSave, saving, usedSceneIndexes }) => {
  // See RuleEditor — keyed remount handles selection changes.
  const [draft, setDraft] = useState(template);

  const set = (patch) => setDraft((d) => ({ ...d, ...patch }));
  const sceneIndexConflict =
    isNew &&
    usedSceneIndexes.includes(draft.sceneIndex);

  const canSave =
    Number.isInteger(draft.sceneIndex) &&
    draft.sceneIndex >= 1 &&
    draft.sceneIndex <= 15 &&
    !sceneIndexConflict;

  return (
    <div className="methodology-admin__editor">
      <div className="methodology-admin__form-header">
        <div>
          <h5 className="methodology-admin__form-title">
            {isNew ? "New scene template" : `Scene ${draft.sceneIndex} — ${draft.title || "(untitled)"}`}
          </h5>
          {!isNew && draft.key && (
            <p className="methodology-admin__form-key">{draft.key}</p>
          )}
        </div>
        <div className="methodology-admin__form-badges">
          <span className="methodology-admin__pill">Act {draft.actNumber || 1}</span>
          {!draft.enabled && (
            <span className="methodology-admin__pill methodology-admin__pill--disabled">
              Disabled
            </span>
          )}
        </div>
      </div>

      <div className="methodology-admin__form-body">
      <div className="methodology-admin__form-grid">
        <div className="methodology-admin__field">
          <label>Scene index (1–15)</label>
          <input
            type="number"
            min={1}
            max={15}
            value={draft.sceneIndex}
            disabled={!isNew}
            onChange={(e) => set({ sceneIndex: Number(e.target.value) || 1 })}
          />
          {sceneIndexConflict && (
            <div className="methodology-admin__field-error">
              Scene {draft.sceneIndex} already has a template.
            </div>
          )}
        </div>
        <div className="methodology-admin__field">
          <label>Act number</label>
          <input
            type="number"
            min={1}
            max={3}
            value={draft.actNumber}
            onChange={(e) => set({ actNumber: Number(e.target.value) || 1 })}
          />
        </div>
        <div className="methodology-admin__field">
          <label>Key</label>
          <input
            value={draft.key}
            onChange={(e) => set({ key: e.target.value })}
            placeholder={`scene_${draft.sceneIndex}_label`}
          />
        </div>
        <div className="methodology-admin__field">
          <label>Tentpole hint</label>
          <input
            value={draft.tentpoleHint || ""}
            onChange={(e) => set({ tentpoleHint: e.target.value })}
            placeholder="e.g. midpoint, climax"
          />
        </div>
        <div className="methodology-admin__field methodology-admin__field--full">
          <label>Title</label>
          <input
            value={draft.title}
            onChange={(e) => set({ title: e.target.value })}
          />
        </div>
        <div className="methodology-admin__field">
          <label>Enabled</label>
          <Form.Check
            type="switch"
            id={`tpl-enabled-${draft.sceneIndex || "new"}`}
            checked={!!draft.enabled}
            onChange={(e) => set({ enabled: e.target.checked })}
            label={draft.enabled ? "Yes" : "No"}
          />
        </div>
        <div className="methodology-admin__field">
          <label>Source</label>
          <input
            value={draft.source}
            onChange={(e) => set({ source: e.target.value })}
          />
        </div>
        <div className="methodology-admin__field methodology-admin__field--full">
          <label>
            Output format labels (the rich-scene section headings the
            model emits — order matters)
          </label>
          <ChipInput
            values={draft.outputFormatLabels || []}
            onChange={(next) => set({ outputFormatLabels: next })}
            placeholder="Type a label and press Enter"
          />
        </div>
        <div className="methodology-admin__field methodology-admin__field--full">
          <label>Template (sets the model's structural target)</label>
          <textarea
            value={draft.template || ""}
            onChange={(e) => set({ template: e.target.value })}
            rows={6}
          />
        </div>
        <div className="methodology-admin__field methodology-admin__field--full">
          <label>Coaching prompt (visible to the writer when delivering this scene)</label>
          <textarea
            value={draft.coachingPrompt || ""}
            onChange={(e) => set({ coachingPrompt: e.target.value })}
            rows={4}
          />
        </div>
        <div className="methodology-admin__field methodology-admin__field--full">
          <label>Subplot reminder</label>
          <textarea
            value={draft.subplotReminder || ""}
            onChange={(e) => set({ subplotReminder: e.target.value })}
            rows={3}
          />
        </div>
      </div>
      </div>

      <div className="methodology-admin__form-footer">
        <Button
          variant="primary"
          className="methodology-admin__btn-primary ma-btn ms-auto"
          onClick={() => onSave(draft, isNew)}
          disabled={!canSave || saving}
        >
          <MdSave aria-hidden /> {saving ? "Saving…" : "Save template"}
        </Button>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// GenreOverlay editor
// ---------------------------------------------------------------------------

const BLANK_OVERLAY = {
  genreKey: "",
  displayName: "",
  category: "other",
  appliesAs: "base_genre",
  aliases: [],
  beats: [],
  notes: "",
  applicabilityNote: "",
  enabled: true,
  source: "",
};

const BeatsEditor = ({ beats, onChange }) => {
  const update = (idx, patch) => {
    const next = beats.map((b, i) => (i === idx ? { ...b, ...patch } : b));
    onChange(next);
  };
  const remove = (idx) => onChange(beats.filter((_, i) => i !== idx));
  const add = () =>
    onChange([...beats, { sceneIndex: beats.length + 1, label: "", beat: "" }]);

  return (
    <div className="methodology-admin__beats">
      {beats.length === 0 && (
        <div style={{ fontSize: "0.85rem", color: "#64748b" }}>
          No beats defined. Add a beat to anchor it to a specific scene index.
        </div>
      )}
      {beats.map((b, i) => (
        <div key={i} className="methodology-admin__beat">
          <button
            type="button"
            className="methodology-admin__beat-remove"
            onClick={() => remove(i)}
            aria-label={`Remove beat ${i + 1}`}
          >
            <MdClose />
          </button>
          <div className="methodology-admin__beat-field">
            <label>Scene</label>
            <input
              type="number"
              min={1}
              max={15}
              value={b.sceneIndex || ""}
              onChange={(e) =>
                update(i, { sceneIndex: Number(e.target.value) || 1 })
              }
            />
          </div>
          <div className="methodology-admin__beat-field">
            <label>Label (optional)</label>
            <input
              value={b.label || ""}
              onChange={(e) => update(i, { label: e.target.value })}
              placeholder="e.g. Midpoint"
            />
          </div>
          <div
            className="methodology-admin__beat-field"
            style={{ gridColumn: "1 / -1" }}
          >
            <label>Beat text</label>
            <textarea
              value={b.beat || ""}
              onChange={(e) => update(i, { beat: e.target.value })}
              rows={2}
            />
          </div>
        </div>
      ))}
      <Button
        size="sm"
        variant="outline-primary"
        onClick={add}
        style={{ alignSelf: "flex-start" }}
      >
        <MdAdd /> Add beat
      </Button>
    </div>
  );
};

const OverlayEditor = ({ overlay, isNew, onSave, onDelete, saving, deleting }) => {
  // See RuleEditor — keyed remount handles selection changes.
  const [draft, setDraft] = useState(overlay);

  const set = (patch) => setDraft((d) => ({ ...d, ...patch }));

  const canSave =
    draft.genreKey.trim() !== "" &&
    OVERLAY_APPLIES_AS.includes(draft.appliesAs);

  return (
    <div className="methodology-admin__editor">
      <div className="methodology-admin__form-header">
        <div>
          <h5 className="methodology-admin__form-title">
            {isNew ? "New genre overlay" : draft.displayName || draft.genreKey}
          </h5>
          {!isNew && <p className="methodology-admin__form-key">{draft.genreKey}</p>}
        </div>
        <div className="methodology-admin__form-badges">
          <span className="methodology-admin__pill">{draft.category || "other"}</span>
          {!draft.enabled && (
            <span className="methodology-admin__pill methodology-admin__pill--disabled">
              Disabled
            </span>
          )}
        </div>
      </div>

      <div className="methodology-admin__form-body">
      <div className="methodology-admin__form-grid">
        <div className="methodology-admin__field">
          <label>Genre key {isNew ? "" : "(locked)"}</label>
          <input
            value={draft.genreKey}
            disabled={!isNew}
            onChange={(e) => set({ genreKey: e.target.value })}
            placeholder="e.g. epic_fantasy"
          />
        </div>
        <div className="methodology-admin__field">
          <label>Display name</label>
          <input
            value={draft.displayName}
            onChange={(e) => set({ displayName: e.target.value })}
          />
        </div>
        <div className="methodology-admin__field">
          <label>Category</label>
          <input
            list="methodology-overlay-categories"
            value={draft.category || ""}
            onChange={(e) => set({ category: e.target.value })}
          />
          <datalist id="methodology-overlay-categories">
            {KNOWN_OVERLAY_CATEGORIES.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </div>
        <div className="methodology-admin__field">
          <label>Applies as</label>
          <select
            value={draft.appliesAs}
            onChange={(e) => set({ appliesAs: e.target.value })}
          >
            {OVERLAY_APPLIES_AS.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </div>
        <div className="methodology-admin__field">
          <label>Enabled</label>
          <Form.Check
            type="switch"
            id={`overlay-enabled-${draft.genreKey || "new"}`}
            checked={!!draft.enabled}
            onChange={(e) => set({ enabled: e.target.checked })}
            label={draft.enabled ? "Yes" : "No"}
          />
        </div>
        <div className="methodology-admin__field">
          <label>Source</label>
          <input
            value={draft.source || ""}
            onChange={(e) => set({ source: e.target.value })}
          />
        </div>
        <div className="methodology-admin__field methodology-admin__field--full">
          <label>Aliases (other names the writer might type)</label>
          <ChipInput
            values={draft.aliases || []}
            onChange={(next) => set({ aliases: next })}
            placeholder="Add an alias and press Enter"
          />
        </div>
        <div className="methodology-admin__field methodology-admin__field--full">
          <label>Beats (anchored to scene indexes)</label>
          <BeatsEditor
            beats={draft.beats || []}
            onChange={(next) => set({ beats: next })}
          />
        </div>
        <div className="methodology-admin__field methodology-admin__field--full">
          <label>Notes</label>
          <textarea
            value={draft.notes || ""}
            onChange={(e) => set({ notes: e.target.value })}
            rows={3}
          />
        </div>
        <div className="methodology-admin__field methodology-admin__field--full">
          <label>Applicability note</label>
          <textarea
            value={draft.applicabilityNote || ""}
            onChange={(e) => set({ applicabilityNote: e.target.value })}
            rows={2}
          />
        </div>
      </div>
      </div>

      <div className="methodology-admin__form-footer">
        {!isNew && (
          <Button
            variant="outline-danger"
            onClick={() => onDelete(draft.genreKey)}
            disabled={deleting}
          >
            <MdDelete aria-hidden /> {deleting ? "Disabling…" : "Disable overlay"}
          </Button>
        )}
        <Button
          variant="primary"
          className="methodology-admin__btn-primary ma-btn ms-auto"
          onClick={() => onSave(draft, isNew)}
          disabled={!canSave || saving}
        >
          <MdSave aria-hidden /> {saving ? "Saving…" : "Save overlay"}
        </Button>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Top-level page
// ---------------------------------------------------------------------------

const MethodologyAdmin = () => {
  const [activeTab, setActiveTab] = useState("rules");
  const [methodologyVersion, setMethodologyVersion] = useState(null);

  // --- rules state ---
  const [rules, setRules] = useState([]);
  const [ruleSearch, setRuleSearch] = useState("");
  const [ruleScopeFilter, setRuleScopeFilter] = useState("all");
  const [ruleSelected, setRuleSelected] = useState(null); // key
  const [ruleIsNew, setRuleIsNew] = useState(false);
  const [ruleDraft, setRuleDraft] = useState(BLANK_RULE);
  const [ruleSaving, setRuleSaving] = useState(false);
  const [ruleDeleting, setRuleDeleting] = useState(false);

  // --- templates state ---
  const [templates, setTemplates] = useState([]);
  const [tplSearch, setTplSearch] = useState("");
  const [tplSelected, setTplSelected] = useState(null); // sceneIndex
  const [tplIsNew, setTplIsNew] = useState(false);
  const [tplDraft, setTplDraft] = useState(BLANK_TEMPLATE);
  const [tplSaving, setTplSaving] = useState(false);

  // --- overlays state ---
  const [overlays, setOverlays] = useState([]);
  const [overlaySearch, setOverlaySearch] = useState("");
  const [overlaySelected, setOverlaySelected] = useState(null); // genreKey
  const [overlayIsNew, setOverlayIsNew] = useState(false);
  const [overlayDraft, setOverlayDraft] = useState(BLANK_OVERLAY);
  const [overlaySaving, setOverlaySaving] = useState(false);
  const [overlayDeleting, setOverlayDeleting] = useState(false);

  // --- audit state ---
  const [auditRunning, setAuditRunning] = useState(false);
  const [auditResult, setAuditResult] = useState(null);

  // --- export / import ---
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importPreview, setImportPreview] = useState(null);
  const importFileRef = useRef(null);

  const [loading, setLoading] = useState(true);

  const initialFetchRef = useRef(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [r, t, o] = await Promise.all([
      getMethodologyRules(),
      getPromptTemplates(),
      getGenreOverlays(),
    ]);
    if (!r.success) toast.error(r.message);
    else {
      setRules(r.data?.rules || []);
      if (r.data?.methodologyVersion != null) {
        setMethodologyVersion(r.data.methodologyVersion);
      }
    }
    if (!t.success) toast.error(t.message);
    else setTemplates(t.data?.templates || []);
    if (!o.success) toast.error(o.message);
    else setOverlays(o.data?.overlays || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (initialFetchRef.current) return;
    initialFetchRef.current = true;
    void fetchAll();
  }, [fetchAll]);

  // ---------- rule actions ----------

  const filteredRules = useMemo(() => {
    const q = ruleSearch.trim().toLowerCase();
    let rows = rules;
    if (ruleScopeFilter !== "all") {
      rows = rows.filter((r) => (r.scope || "universal") === ruleScopeFilter);
    }
    if (q) {
      rows = rows.filter(
        (r) =>
          r.key?.toLowerCase().includes(q) ||
          r.title?.toLowerCase().includes(q) ||
          r.summary?.toLowerCase().includes(q)
      );
    }
    return [...rows].sort(
      (a, b) =>
        (b.priority || 0) - (a.priority || 0) ||
        (a.key || "").localeCompare(b.key || "")
    );
  }, [rules, ruleSearch, ruleScopeFilter]);

  const enabledRulesCount = useMemo(
    () => rules.filter((r) => r.enabled !== false).length,
    [rules]
  );
  const enabledTemplatesCount = useMemo(
    () => templates.filter((t) => t.enabled !== false).length,
    [templates]
  );
  const enabledOverlaysCount = useMemo(
    () => overlays.filter((o) => o.enabled !== false).length,
    [overlays]
  );

  const openRule = useCallback(
    (key) => {
      const row = rules.find((r) => r.key === key);
      if (!row) return;
      setRuleSelected(key);
      setRuleIsNew(false);
      setRuleDraft(normalizeRule(row));
    },
    [rules]
  );

  const startNewRule = () => {
    setRuleSelected(null);
    setRuleIsNew(true);
    setRuleDraft({ ...BLANK_RULE });
  };

  const saveRule = async (draft, isNew) => {
    setRuleSaving(true);
    const res = await upsertMethodologyRule(draft);
    setRuleSaving(false);
    if (!res.success) {
      toast.error(res.message);
      return;
    }
    toast.success(isNew ? "Rule created" : "Rule saved");
    await fetchAll();
    setRuleSelected(draft.key);
    setRuleIsNew(false);
  };

  const removeRule = async (key) => {
    if (!window.confirm(`Disable rule "${key}"? (Soft delete — sets enabled: false)`)) {
      return;
    }
    setRuleDeleting(true);
    const res = await deleteMethodologyRule(key);
    setRuleDeleting(false);
    if (!res.success) {
      toast.error(res.message);
      return;
    }
    toast.success("Rule disabled");
    await fetchAll();
    setRuleSelected(null);
  };

  // ---------- template actions ----------

  const filteredTemplates = useMemo(() => {
    const q = tplSearch.trim().toLowerCase();
    const rows = !q
      ? templates
      : templates.filter(
          (t) =>
            String(t.sceneIndex).includes(q) ||
            t.title?.toLowerCase().includes(q) ||
            t.key?.toLowerCase().includes(q)
        );
    return [...rows].sort(
      (a, b) => (a.sceneIndex || 0) - (b.sceneIndex || 0)
    );
  }, [templates, tplSearch]);

  const usedSceneIndexes = useMemo(
    () => templates.map((t) => t.sceneIndex),
    [templates]
  );

  const openTemplate = useCallback(
    (sceneIndex) => {
      const row = templates.find((t) => t.sceneIndex === sceneIndex);
      if (!row) return;
      setTplSelected(sceneIndex);
      setTplIsNew(false);
      setTplDraft({
        key: row.key || "",
        sceneIndex: row.sceneIndex,
        actNumber: row.actNumber || Math.ceil((row.sceneIndex || 1) / 5),
        title: row.title || "",
        tentpoleHint: row.tentpoleHint || "",
        enabled: row.enabled !== false,
        outputFormatLabels: row.outputFormatLabels || [],
        template: row.template || "",
        coachingPrompt: row.coachingPrompt || "",
        subplotReminder: row.subplotReminder || "",
        source: row.source || "",
      });
    },
    [templates]
  );

  const startNewTemplate = () => {
    setTplSelected(null);
    setTplIsNew(true);
    setTplDraft({ ...BLANK_TEMPLATE });
  };

  const saveTemplate = async (draft, isNew) => {
    setTplSaving(true);
    const res = await upsertPromptTemplate(draft);
    setTplSaving(false);
    if (!res.success) {
      toast.error(res.message);
      return;
    }
    toast.success(isNew ? "Template created" : "Template saved");
    await fetchAll();
    setTplSelected(draft.sceneIndex);
    setTplIsNew(false);
  };

  // ---------- overlay actions ----------

  const filteredOverlays = useMemo(() => {
    const q = overlaySearch.trim().toLowerCase();
    const rows = !q
      ? overlays
      : overlays.filter(
          (o) =>
            o.genreKey?.toLowerCase().includes(q) ||
            o.displayName?.toLowerCase().includes(q) ||
            o.category?.toLowerCase().includes(q) ||
            (o.aliases || []).some((a) => a.toLowerCase().includes(q))
        );
    return [...rows].sort(
      (a, b) =>
        (a.category || "").localeCompare(b.category || "") ||
        (a.genreKey || "").localeCompare(b.genreKey || "")
    );
  }, [overlays, overlaySearch]);

  const openOverlay = useCallback(
    (genreKey) => {
      const row = overlays.find((o) => o.genreKey === genreKey);
      if (!row) return;
      setOverlaySelected(genreKey);
      setOverlayIsNew(false);
      setOverlayDraft({
        genreKey: row.genreKey || "",
        displayName: row.displayName || "",
        category: row.category || "other",
        appliesAs: row.appliesAs || "base_genre",
        aliases: row.aliases || [],
        beats: row.beats || [],
        notes: row.notes || "",
        applicabilityNote: row.applicabilityNote || "",
        enabled: row.enabled !== false,
        source: row.source || "",
      });
    },
    [overlays]
  );

  const startNewOverlay = () => {
    setOverlaySelected(null);
    setOverlayIsNew(true);
    setOverlayDraft({ ...BLANK_OVERLAY });
  };

  const saveOverlay = async (draft, isNew) => {
    setOverlaySaving(true);
    const res = await upsertGenreOverlay(draft);
    setOverlaySaving(false);
    if (!res.success) {
      toast.error(res.message);
      return;
    }
    toast.success(isNew ? "Overlay created" : "Overlay saved");
    await fetchAll();
    setOverlaySelected(draft.genreKey);
    setOverlayIsNew(false);
  };

  const removeOverlay = async (genreKey) => {
    if (
      !window.confirm(
        `Disable overlay "${genreKey}"? (Soft delete — sets enabled: false)`
      )
    ) {
      return;
    }
    setOverlayDeleting(true);
    const res = await deleteGenreOverlay(genreKey);
    setOverlayDeleting(false);
    if (!res.success) {
      toast.error(res.message);
      return;
    }
    toast.success("Overlay disabled");
    await fetchAll();
    setOverlaySelected(null);
  };

  // ---------- audit ----------

  const handleAudit = async () => {
    setAuditRunning(true);
    setAuditResult(null);
    const res = await runMethodologyAudit();
    setAuditRunning(false);
    if (!res.success) {
      toast.error(res.message);
      return;
    }
    setAuditResult(res.data);
    if (res.data?.collisions?.length) {
      toast.error(
        `Audit found ${res.data.collisions.length} rule(s) overlapping with code constants`
      );
    } else {
      toast.success("Audit passed — no collisions");
    }
  };

  const handleExport = async () => {
    setExporting(true);
    const res = await exportMethodologyBundle();
    setExporting(false);
    if (!res.success) {
      toast.error(res.message);
      return;
    }
    const bundle = res.data;
    const json = JSON.stringify(bundle, null, 2);
    const blob = new Blob([json], { type: "application/json;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `olivia-methodology-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(
      `Exported ${bundle.rules?.length ?? 0} rules, ${bundle.templates?.length ?? 0} templates, ${bundle.overlays?.length ?? 0} overlays`
    );
  };

  const handleImportFileChange = (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result || ""));
        const bundle = normalizeClientBundle(parsed);
        setImportPreview({
          bundle,
          fileName: file.name,
          counts: {
            rules: bundle.rules.length,
            templates: bundle.templates.length,
            overlays: bundle.overlays.length,
          },
        });
      } catch (err) {
        toast.error(err.message || "Invalid JSON file");
      }
    };
    reader.onerror = () => toast.error("Could not read file");
    reader.readAsText(file);
  };

  const closeImportModal = () => {
    if (importing) return;
    setImportPreview(null);
  };

  const confirmImport = async () => {
    if (!importPreview?.bundle) return;
    setImporting(true);
    const res = await importMethodologyBundle(importPreview.bundle);
    setImporting(false);
    if (!res.success) {
      toast.error(res.message);
      return;
    }
    const { rules, templates, overlays } = res.data || {};
    const messages = [
      formatImportTally("Rules", rules),
      formatImportTally("Templates", templates),
      formatImportTally("Overlays", overlays),
    ].filter(Boolean);
    const hasErrors =
      (rules?.errors?.length || 0) +
        (templates?.errors?.length || 0) +
        (overlays?.errors?.length || 0) >
      0;
    if (hasErrors) {
      toast.error(messages.join(" · "), { duration: 6000 });
      const allErrors = [
        ...(rules?.errors || []),
        ...(templates?.errors || []),
        ...(overlays?.errors || []),
      ];
      console.warn("[methodology import] validation errors:", allErrors);
    } else {
      toast.success(messages.join(" · "), { duration: 5000 });
    }
    setImportPreview(null);
    await fetchAll();
    if (hasErrors) {
      toast("Consider running audit after fixing import errors.", { icon: "ℹ️" });
    }
  };

  if (loading) {
    return (
      <div className="methodology-admin">
        <div className="methodology-admin__loading">
          <div className="methodology-admin__loading-bar" aria-hidden />
          <span>Loading methodology…</span>
        </div>
      </div>
    );
  }

  const ruleScopeOptions = [
    { value: "all", label: "All" },
    ...RULE_SCOPES.map((s) => ({ value: s, label: s })),
  ];

  return (
    <div className="methodology-admin">
      <div className="methodology-admin__shell">
        <section className="methodology-admin__hero">
          <div className="methodology-admin__hero-accent" aria-hidden />
          <div className="methodology-admin__hero-body">
            <div className="methodology-admin__hero-top">
              <div className="methodology-admin__hero-icon" aria-hidden>
                <MdMenuBook />
              </div>
              <div className="methodology-admin__hero-text">
                <h4 className="methodology-admin__title">Olivia methodology</h4>
                <p className="methodology-admin__subtitle">
                  Hot-tune craft rules, scene templates, and genre overlays. Changes apply on the
                  next chat turn (in-process cache TTL ~5 minutes).
                </p>
              </div>
              <div className="methodology-admin__hero-actions">
                {methodologyVersion != null && (
                  <span className="methodology-admin__version-chip">v{methodologyVersion}</span>
                )}
                <input
                  ref={importFileRef}
                  type="file"
                  accept=".json,application/json"
                  className="methodology-admin__file-input"
                  aria-hidden
                  tabIndex={-1}
                  onChange={handleImportFileChange}
                />
                <Button
                  variant="outline-secondary"
                  size="sm"
                  className="methodology-admin__btn-secondary ma-btn"
                  onClick={() => void handleExport()}
                  disabled={exporting}
                >
                  <MdFileDownload aria-hidden /> {exporting ? "Exporting…" : "Export"}
                </Button>
                <Button
                  variant="outline-secondary"
                  size="sm"
                  className="methodology-admin__btn-secondary ma-btn"
                  onClick={() => importFileRef.current?.click()}
                  disabled={importing}
                >
                  <MdUpload aria-hidden /> Import
                </Button>
                <Button
                  variant="outline-secondary"
                  size="sm"
                  className="methodology-admin__btn-secondary ma-btn"
                  onClick={() => void fetchAll()}
                >
                  <MdRefresh aria-hidden /> Refresh
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  className="methodology-admin__btn-primary ma-btn"
                  onClick={() => void handleAudit()}
                  disabled={auditRunning}
                >
                  <MdFactCheck aria-hidden /> {auditRunning ? "Auditing…" : "Run audit"}
                </Button>
              </div>
            </div>
            <div className="methodology-admin__stats">
              <div className="methodology-admin__stat">
                <MdRule className="methodology-admin__stat-icon" aria-hidden />
                <span className="methodology-admin__stat-value">
                  {enabledRulesCount}/{rules.length}
                </span>
                <span className="methodology-admin__stat-label">Rules active</span>
              </div>
              <div className="methodology-admin__stat">
                <MdViewList className="methodology-admin__stat-icon" aria-hidden />
                <span className="methodology-admin__stat-value">
                  {enabledTemplatesCount}/{templates.length}
                </span>
                <span className="methodology-admin__stat-label">Scene templates</span>
              </div>
              <div className="methodology-admin__stat">
                <MdCategory className="methodology-admin__stat-icon" aria-hidden />
                <span className="methodology-admin__stat-value">
                  {enabledOverlaysCount}/{overlays.length}
                </span>
                <span className="methodology-admin__stat-label">Genre overlays</span>
              </div>
            </div>
          </div>
        </section>

        <AuditBanner result={auditResult} onDismiss={() => setAuditResult(null)} />

        <Modal
          show={!!importPreview}
          onHide={closeImportModal}
          centered
          className="methodology-admin__import-modal"
        >
          <Modal.Header closeButton={!importing}>
            <Modal.Title>Import methodology</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {importPreview && (
              <>
                <p className="mb-2">
                  File: <strong>{importPreview.fileName}</strong>
                </p>
                <ul className="methodology-admin__import-summary">
                  <li>{importPreview.counts.rules} craft rule(s)</li>
                  <li>{importPreview.counts.templates} scene template(s)</li>
                  <li>{importPreview.counts.overlays} genre overlay(s)</li>
                </ul>
                <div className="methodology-admin__import-warning" role="alert">
                  <MdWarning aria-hidden />
                  <div>
                    <strong>Full sync</strong> — rows in the database that are not
                    in this file will be <strong>disabled</strong>. Empty collections
                    in the file disable all rows in that collection.
                  </div>
                </div>
              </>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button
              variant="outline-secondary"
              onClick={closeImportModal}
              disabled={importing}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              className="methodology-admin__btn-primary ma-btn"
              onClick={() => void confirmImport()}
              disabled={importing || !importPreview}
            >
              {importing ? "Importing…" : "Import & sync"}
            </Button>
          </Modal.Footer>
        </Modal>

        <div className="methodology-admin__workspace">
        <Tabs
          activeKey={activeTab}
          onSelect={(k) => k && setActiveTab(k)}
          id="methodology-admin-tabs"
          className="methodology-admin__tabs"
        >
          <Tab
            eventKey="rules"
            title={
              <span className="d-inline-flex align-items-center gap-1">
                <MdRule aria-hidden /> Rules
                <span className="methodology-admin__tab-count">{rules.length}</span>
              </span>
            }
          >
            <div className="methodology-admin__tab-panel">
            <div className="methodology-admin__split">
              <ListPane
                title="Craft rules"
                rows={filteredRules}
                totalCount={rules.length}
                selectedId={ruleSelected}
                onSelect={openRule}
                onNew={startNewRule}
                newButtonLabel="New rule"
                searchTerm={ruleSearch}
                onSearchChange={setRuleSearch}
                searchPlaceholder="Search rules…"
                scopeFilter={{
                  value: ruleScopeFilter,
                  onChange: setRuleScopeFilter,
                  options: ruleScopeOptions,
                }}
                rowKey={(r) => r.key}
                rowLabel={(r) => r.title || r.key}
                rowMeta={(r) => (
                  <>
                    <span
                      className={`methodology-admin__pill methodology-admin__pill--scope-${r.scope || "universal"}`}
                    >
                      {r.scope}
                    </span>
                    {r.priority != null && (
                      <span className="methodology-admin__pill">
                        p{r.priority}
                      </span>
                    )}
                    {Array.isArray(r.phase) &&
                      r.phase.length > 0 && (
                        <span className="methodology-admin__pill">
                          {r.phase.map(formatPhase).join(", ")}
                        </span>
                      )}
                  </>
                )}
                rowDisabled={(r) => r.enabled === false}
                emptyHint="No matching rules. Click New rule to add one."
              />
              {ruleIsNew || ruleSelected ? (
                <RuleEditor
                  key={ruleIsNew ? "new" : `existing-${ruleSelected}`}
                  rule={
                    ruleIsNew
                      ? normalizeRule(ruleDraft)
                      : normalizeRule(
                          rules.find((r) => r.key === ruleSelected) || BLANK_RULE
                        )
                  }
                  isNew={ruleIsNew}
                  onSave={saveRule}
                  onDelete={removeRule}
                  saving={ruleSaving}
                  deleting={ruleDeleting}
                />
              ) : (
                <EmptyEditorPane
                  title="Select a rule"
                  description="Pick a craft rule from the list to edit it, or create a new one for Olivia's methodology layer."
                  actionLabel="New rule"
                  onAction={startNewRule}
                />
              )}
            </div>
            </div>
          </Tab>

          <Tab
            eventKey="templates"
            title={
              <span className="d-inline-flex align-items-center gap-1">
                <MdViewList aria-hidden /> Templates
                <span className="methodology-admin__tab-count">{templates.length}</span>
              </span>
            }
          >
            <div className="methodology-admin__tab-panel">
            <div className="methodology-admin__split">
              <ListPane
                title="Scene templates"
                rows={filteredTemplates}
                totalCount={templates.length}
                selectedId={tplSelected}
                onSelect={openTemplate}
                onNew={startNewTemplate}
                newButtonLabel="New template"
                searchTerm={tplSearch}
                onSearchChange={setTplSearch}
                searchPlaceholder="Search templates…"
                rowKey={(t) => t.sceneIndex}
                rowLabel={(t) => `Scene ${t.sceneIndex} — ${t.title || "(untitled)"}`}
                rowMeta={(t) => (
                  <>
                    <span className="methodology-admin__pill">
                      Act {t.actNumber || Math.ceil((t.sceneIndex || 1) / 5)}
                    </span>
                    {t.tentpoleHint && (
                      <span className="methodology-admin__pill">
                        {t.tentpoleHint}
                      </span>
                    )}
                  </>
                )}
                rowDisabled={(t) => t.enabled === false}
                emptyHint="No matching templates. Click New template to add one."
              />
              {tplIsNew || tplSelected != null ? (
                <TemplateEditor
                  key={tplIsNew ? "new" : `existing-${tplSelected}`}
                  template={
                    tplIsNew
                      ? tplDraft
                      : (templates.find((t) => t.sceneIndex === tplSelected) || BLANK_TEMPLATE)
                  }
                  isNew={tplIsNew}
                  onSave={saveTemplate}
                  saving={tplSaving}
                  usedSceneIndexes={usedSceneIndexes}
                />
              ) : (
                <EmptyEditorPane
                  title="Select a scene template"
                  description="Choose a scene (1–15) to edit its structural template and coaching copy."
                  actionLabel="New template"
                  onAction={startNewTemplate}
                />
              )}
            </div>
            </div>
          </Tab>

          <Tab
            eventKey="overlays"
            title={
              <span className="d-inline-flex align-items-center gap-1">
                <MdCategory aria-hidden /> Overlays
                <span className="methodology-admin__tab-count">{overlays.length}</span>
              </span>
            }
          >
            <div className="methodology-admin__tab-panel">
            <div className="methodology-admin__split">
              <ListPane
                title="Genre overlays"
                rows={filteredOverlays}
                totalCount={overlays.length}
                selectedId={overlaySelected}
                onSelect={openOverlay}
                onNew={startNewOverlay}
                newButtonLabel="New overlay"
                searchTerm={overlaySearch}
                onSearchChange={setOverlaySearch}
                searchPlaceholder="Search overlays…"
                rowKey={(o) => o.genreKey}
                rowLabel={(o) => o.displayName || o.genreKey}
                rowMeta={(o) => (
                  <>
                    <span className="methodology-admin__pill">
                      {o.category || "—"}
                    </span>
                    <span className="methodology-admin__pill">
                      {o.appliesAs === "base_genre" ? "base" : "overlay"}
                    </span>
                    {(o.beats || []).length > 0 && (
                      <span className="methodology-admin__pill">
                        {o.beats.length} beat{o.beats.length === 1 ? "" : "s"}
                      </span>
                    )}
                  </>
                )}
                rowDisabled={(o) => o.enabled === false}
                emptyHint="No matching overlays. Click New overlay to add one."
              />
              {overlayIsNew || overlaySelected ? (
                <OverlayEditor
                  key={overlayIsNew ? "new" : `existing-${overlaySelected}`}
                  overlay={
                    overlayIsNew
                      ? overlayDraft
                      : (overlays.find((o) => o.genreKey === overlaySelected) || BLANK_OVERLAY)
                  }
                  isNew={overlayIsNew}
                  onSave={saveOverlay}
                  onDelete={removeOverlay}
                  saving={overlaySaving}
                  deleting={overlayDeleting}
                />
              ) : (
                <EmptyEditorPane
                  title="Select a genre overlay"
                  description="Edit genre-specific beats and aliases, or add a new overlay for Olivia to apply at runtime."
                  actionLabel="New overlay"
                  onAction={startNewOverlay}
                />
              )}
            </div>
            </div>
          </Tab>
        </Tabs>
        </div>
      </div>
    </div>
  );
};

export default MethodologyAdmin;
