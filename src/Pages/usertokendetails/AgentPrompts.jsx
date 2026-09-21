import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Tabs, Tab, Button, Form, Modal } from "react-bootstrap";
import {
  MdSave,
  MdFileDownload,
  MdUpload,
  MdSmartToy,
  MdRestore,
  MdWarning,
} from "react-icons/md";
import { toast } from "react-hot-toast";
import {
  getAgentPrompts,
  updateAgentPrompt,
  exportAgentPromptsBundle,
  importAgentPromptsBundle,
} from "../../api/assistant";
import Loading from "../../component/Prompt/Loading";
import "./AgentPrompts.css";

const normalizePromptText = (text = "") =>
  String(text ?? "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n");

const normalizeClientBundle = (parsed) => {
  if (Array.isArray(parsed)) {
    return { prompts: parsed };
  }
  if (!parsed || typeof parsed !== "object") {
    throw new Error("File must contain a JSON object or array");
  }
  if (Array.isArray(parsed.prompts)) {
    return { prompts: parsed.prompts };
  }
  if (Array.isArray(parsed.agentPrompts)) {
    return { prompts: parsed.agentPrompts };
  }
  throw new Error('File must include a "prompts" or "agentPrompts" array');
};

const formatImportTally = (tally) => {
  if (!tally) return "";
  const parts = [];
  if (tally.added) parts.push(`${tally.added} added`);
  if (tally.updated) parts.push(`${tally.updated} updated`);
  if (tally.unchanged) parts.push(`${tally.unchanged} unchanged`);
  if (tally.errors?.length) parts.push(`${tally.errors.length} errors`);
  return parts.length ? parts.join(", ") : "no changes";
};

const formatAgentTitle = (name) => {
  if (!name) return "";
  return name
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
};

const sortAgentPromptsForTabs = (prompts) =>
  [...prompts].sort((a, b) => {
    const nameA = a.agentName.toLowerCase();
    const nameB = b.agentName.toLowerCase();
    if (nameA === "simone") return -1;
    if (nameB === "simone") return 1;
    return nameA.localeCompare(nameB);
  });

const AgentPrompts = () => {
  const importFileRef = useRef(null);
  const [agentPrompts, setAgentPrompts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingPrompts, setEditingPrompts] = useState({});
  const [savedPrompts, setSavedPrompts] = useState({});
  const [saving, setSaving] = useState({});
  const [activeTab, setActiveTab] = useState("");
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importPreview, setImportPreview] = useState(null);

  useEffect(() => {
    fetchAgentPrompts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchAgentPrompts = async () => {
    setLoading(true);
    try {
      const response = await getAgentPrompts();

      if (response.success) {
        const prompts = response.data.agentPrompts || [];
        setAgentPrompts(prompts);
        initializeEditingState(prompts);
        if (prompts.length > 0 && !activeTab) {
          setActiveTab(prompts[0].agentName);
        }
      } else {
        toast.error(response.message || "Failed to fetch agent prompts");
      }
    } catch (error) {
      console.error("Error fetching agent prompts:", error);
      toast.error("Failed to fetch agent prompts");
    } finally {
      setLoading(false);
    }
  };

  const initializeEditingState = (prompts) => {
    const initial = prompts.reduce((acc, agent) => {
      acc[agent.agentName] = normalizePromptText(agent.prompt || "");
      return acc;
    }, {});
    setEditingPrompts(initial);
    setSavedPrompts(initial);
  };

  const handlePromptChange = useCallback((agentName, value) => {
    setEditingPrompts((prev) => ({
      ...prev,
      [agentName]: value,
    }));
  }, []);

  const handleReset = (agentName) => {
    const saved = savedPrompts[agentName] ?? "";
    setEditingPrompts((prev) => ({ ...prev, [agentName]: saved }));
  };

  const handleSave = async (agentName) => {
    const prompt = editingPrompts[agentName] || "";
    setSaving((prev) => ({ ...prev, [agentName]: true }));
    try {
      const formatted = normalizePromptText(prompt);
      const response = await updateAgentPrompt(formatted, agentName);

      if (response.success) {
        toast.success(`${formatAgentTitle(agentName)} prompt saved`);
        setSavedPrompts((prev) => ({ ...prev, [agentName]: formatted }));
        setEditingPrompts((prev) => ({ ...prev, [agentName]: formatted }));
        setAgentPrompts((prev) =>
          prev.map((agent) =>
            agent.agentName === agentName ? { ...agent, prompt: formatted } : agent
          )
        );
      } else {
        toast.error(response.message || `Failed to save ${agentName}`);
      }
    } catch (error) {
      console.error("Error updating prompt:", error);
      toast.error(`Failed to save ${agentName}`);
    } finally {
      setSaving((prev) => ({ ...prev, [agentName]: false }));
    }
  };

  const handleExport = async () => {
    setExporting(true);
    const res = await exportAgentPromptsBundle();
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
    a.download = `agent-prompts-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(`Exported ${bundle.prompts?.length ?? 0} agent prompt(s)`);
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
          count: bundle.prompts.length,
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
    const res = await importAgentPromptsBundle(importPreview.bundle);
    setImporting(false);
    if (!res.success) {
      toast.error(res.message);
      return;
    }
    const tally = res.data?.prompts;
    const message = formatImportTally(tally);
    if (tally?.errors?.length) {
      toast.error(message || "Import completed with errors", { duration: 6000 });
      console.warn("[agent prompts import] validation errors:", tally.errors);
    } else {
      toast.success(message || "Import complete", { duration: 5000 });
    }
    setImportPreview(null);
    await fetchAgentPrompts();
  };

  const dirtyMap = useMemo(() => {
    const result = {};
    agentPrompts.forEach((agent) => {
      const current = editingPrompts[agent.agentName] ?? "";
      const saved = savedPrompts[agent.agentName] ?? "";
      result[agent.agentName] = normalizePromptText(current) !== normalizePromptText(saved);
    });
    return result;
  }, [agentPrompts, editingPrompts, savedPrompts]);

  const renderTabTitle = (agent) => (
    <span>
      {formatAgentTitle(agent.agentName)}
      {dirtyMap[agent.agentName] && (
        <span
          className="agent-prompts__tab-dirty"
          aria-label="unsaved changes"
          title="Unsaved changes"
        />
      )}
    </span>
  );

  if (loading) {
    return <Loading />;
  }

  if (agentPrompts.length === 0) {
    return (
      <div className="agent-prompts">
        <p className="agent-prompts__empty">No agent prompts found.</p>
      </div>
    );
  }

  const sortedPrompts = sortAgentPromptsForTabs(agentPrompts);

  return (
    <div className="agent-prompts">
      <div className="agent-prompts__shell">
        <section className="agent-prompts__hero">
          <div className="agent-prompts__hero-accent" aria-hidden />
          <div className="agent-prompts__hero-body">
            <div className="agent-prompts__hero-icon" aria-hidden>
              <MdSmartToy />
            </div>
            <div className="agent-prompts__hero-text">
              <h4 className="agent-prompts__title">Agent prompts</h4>
              <p className="agent-prompts__subtitle">
                Persona and workflow instructions for Simone, Olivia, and Ellis.
                Export from staging, import on production to sync all agents in
                one step.
              </p>
            </div>
            <div className="agent-prompts__hero-actions">
              <input
                ref={importFileRef}
                type="file"
                accept=".json,application/json"
                className="agent-prompts__file-input"
                aria-hidden
                tabIndex={-1}
                onChange={handleImportFileChange}
              />
              <Button
                variant="outline-secondary"
                size="sm"
                className="agent-prompts__btn-secondary ap-btn"
                onClick={() => void handleExport()}
                disabled={exporting}
              >
                <MdFileDownload aria-hidden />
                {exporting ? "Exporting…" : "Export"}
              </Button>
              <Button
                variant="outline-secondary"
                size="sm"
                className="agent-prompts__btn-secondary ap-btn"
                onClick={() => importFileRef.current?.click()}
                disabled={importing}
              >
                <MdUpload aria-hidden /> Import
              </Button>
            </div>
          </div>
        </section>

        <div>
          <Tabs
            activeKey={activeTab}
            onSelect={(k) => k && setActiveTab(k)}
            id="agent-prompts-tabs"
            className="agent-prompts__tabs"
          >
            {sortedPrompts.map((agent) => {
              const current = editingPrompts[agent.agentName] ?? "";
              const dirty = dirtyMap[agent.agentName];
              const isSaving = !!saving[agent.agentName];
              const charCount = current.length;
              const lineCount = current ? current.split("\n").length : 0;

              return (
                <Tab
                  key={agent.agentName}
                  eventKey={agent.agentName}
                  title={renderTabTitle(agent)}
                >
                  <div className="agent-prompts__tab-panel">
                    <div className="agent-prompts__editor-card">
                      <div className="agent-prompts__editor-header">
                        <div className="agent-prompts__editor-header-text">
                          <p className="agent-prompts__editor-label">
                            {formatAgentTitle(agent.agentName)} system prompt
                          </p>
                          {agent.description && (
                            <p className="agent-prompts__editor-sub">
                              {agent.description}
                            </p>
                          )}
                        </div>
                        <div className="agent-prompts__editor-meta">
                          {dirty && (
                            <span className="agent-prompts__editor-badge">
                              Modified
                            </span>
                          )}
                          <span>
                            {charCount.toLocaleString()} chars · {lineCount} lines
                          </span>
                        </div>
                      </div>

                      <Form.Group className="agent-prompts__form-group">
                        <Form.Control
                          as="textarea"
                          className="agent-prompts__textarea"
                          value={current}
                          onChange={(e) =>
                            handlePromptChange(agent.agentName, e.target.value)
                          }
                          placeholder="Enter agent prompt here..."
                          spellCheck={false}
                          aria-label={`${formatAgentTitle(agent.agentName)} prompt`}
                        />
                      </Form.Group>

                      <div className="agent-prompts__actions">
                        <span className="agent-prompts__actions-hint">
                          {dirty
                            ? "Unsaved changes — Save to persist."
                            : "Up to date."}
                        </span>
                        <div className="agent-prompts__actions-buttons">
                          <Button
                            variant="outline-secondary"
                            className="agent-prompts__btn-secondary ap-btn"
                            onClick={() => handleReset(agent.agentName)}
                            disabled={!dirty || isSaving}
                            title="Revert to last saved version"
                          >
                            <MdRestore aria-hidden /> Reset
                          </Button>
                          <Button
                            variant="primary"
                            className="agent-prompts__btn-primary ap-btn"
                            onClick={() => handleSave(agent.agentName)}
                            disabled={!dirty || isSaving}
                          >
                            <MdSave aria-hidden />
                            {isSaving ? "Saving…" : "Save prompt"}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </Tab>
              );
            })}
          </Tabs>
        </div>
      </div>

      <Modal show={!!importPreview} onHide={closeImportModal} centered>
        <Modal.Header closeButton={!importing}>
          <Modal.Title>Import agent prompts</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {importPreview && (
            <>
              <p className="mb-2">
                File: <strong>{importPreview.fileName}</strong>
              </p>
              <p className="mb-0">
                {importPreview.count} agent prompt(s) in file
              </p>
              <div className="agent-prompts__import-warning" role="alert">
                <MdWarning aria-hidden style={{ marginRight: 6, marginTop: -2 }} />
                <strong>Upsert only</strong> — prompts in this file will be
                created or updated. Agents not in the file are left unchanged.
              </div>
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="outline-secondary"
            className="agent-prompts__btn-secondary ap-btn"
            onClick={closeImportModal}
            disabled={importing}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            className="agent-prompts__btn-primary ap-btn"
            onClick={() => void confirmImport()}
            disabled={importing || !importPreview}
          >
            {importing ? "Importing…" : "Import"}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default AgentPrompts;
