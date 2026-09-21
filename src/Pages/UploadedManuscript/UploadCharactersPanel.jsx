import React, { useCallback, useEffect, useState } from "react";
import { Collapse } from "antd";
import { toast } from "react-toastify";
import {
  createCharacter,
  getAllCharactersOfaBook,
} from "../../api/bookGeneration";

const { Panel } = Collapse;

/**
 * Character list/editor for the upload viewer Story Hub (manual dossiers).
 */
const UploadCharactersPanel = ({ novelId }) => {
  const [characters, setCharacters] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [draftText, setDraftText] = useState("");
  const [savingId, setSavingId] = useState(null);

  const load = useCallback(async () => {
    if (!novelId) return;
    setLoading(true);
    try {
      const response = await getAllCharactersOfaBook(novelId);
      setCharacters(response.data?.characters || []);
    } catch (_) {
      setCharacters([]);
    } finally {
      setLoading(false);
    }
  }, [novelId]);

  useEffect(() => {
    load();
  }, [load]);

  const startEdit = (character) => {
    setEditingId(character._id);
    setDraftText(character.responseText || "");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setDraftText("");
  };

  const saveCharacter = async (character) => {
    setSavingId(character._id);
    try {
      await createCharacter({
        ...character,
        characterId: character._id,
        novelId,
        responseText: draftText,
      });
      toast.success("Character saved.");
      setEditingId(null);
      setDraftText("");
      await load();
    } catch (_) {
      toast.error("Could not save character.");
    } finally {
      setSavingId(null);
    }
  };

  if (loading && characters.length === 0) {
    return (
      <div className="p-3 text-muted" style={{ fontSize: 14 }}>
        Loading characters…
      </div>
    );
  }

  if (!characters.length) {
    return (
      <div className="p-3 text-muted" style={{ fontSize: 14 }}>
        No characters yet. Add character dossiers here as you refine your cast
        during Ellis' editing.
      </div>
    );
  }

  return (
    <div className="upload-characters-panel">
      <Collapse accordion>
        {characters.map((character) => {
          const isEditing = editingId === character._id;
          const isSaving = savingId === character._id;
          return (
            <Panel
              key={character._id}
              header={
                character.role
                  ? `${character.name} — ${character.role}`
                  : character.name
              }
            >
              {isEditing ? (
                <>
                  <textarea
                    className="form-control"
                    rows={8}
                    value={draftText}
                    onChange={(e) => setDraftText(e.target.value)}
                    disabled={isSaving}
                    style={{ fontSize: 13, lineHeight: 1.5 }}
                  />
                  <div className="d-flex gap-2 mt-2">
                    <button
                      type="button"
                      className="sg-btn-fill"
                      style={{ height: 32, fontSize: 12 }}
                      onClick={() => saveCharacter(character)}
                      disabled={isSaving}
                    >
                      {isSaving ? "Saving…" : "Save"}
                    </button>
                    <button
                      type="button"
                      className="sg-btn-outline"
                      style={{ height: 32, fontSize: 12 }}
                      onClick={cancelEdit}
                      disabled={isSaving}
                    >
                      Cancel
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div
                    style={{
                      fontSize: 13,
                      lineHeight: 1.55,
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    {character.responseText || "No dossier text yet."}
                  </div>
                  {!character.syntheticFromNovel && (
                    <button
                      type="button"
                      className="sg-btn-outline mt-2"
                      style={{ height: 32, fontSize: 12 }}
                      onClick={() => startEdit(character)}
                    >
                      Edit
                    </button>
                  )}
                </>
              )}
            </Panel>
          );
        })}
      </Collapse>
    </div>
  );
};

export default UploadCharactersPanel;
