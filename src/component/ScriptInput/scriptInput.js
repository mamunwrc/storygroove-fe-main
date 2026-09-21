import { MdModeEditOutline } from 'react-icons/md';
import './scriptInput.scss';
import React, { useState } from 'react';
import { Button } from 'react-bootstrap';
import { FiRefreshCcw } from 'react-icons/fi';

const ScriptInput = ({
  setScript,
  script,
  handleScriptFormInput,
  fromPrompt,
  regenerateScript,
  error = '',
  isMobile = '',
}) => {
  const [scriptEditable, setScriptEditable] = useState(fromPrompt);

  const handleScriptEdit = () => {
    if (scriptEditable === true) {
      setScriptEditable(false);
    } else {
      setScriptEditable(true);
    }
    // setScriptEditable(false);
  };

  return (
    <div>
      <div className="video-generator-container text-left d-block">
        {!fromPrompt && <h4 className="text-left mb-4 ">Type your script</h4>}
      </div>
      <div className="script-outer-container">
        <form onSubmit={handleScriptFormInput}>
          <div className="bg-white p-3">
            <h4>Script : </h4>
            <textarea
              placeholder="Prompt: (Share your primary idea)"
              className="custom-input textarea-height"
              onChange={(event) => setScript(event.target.value)}
              value={script}
              readOnly={scriptEditable}
            ></textarea>
          </div>
          <div className="submit-button btn-primary-black position-end justify-content-end">
            <div className="d-flex align-items-center  script-btns mt-4 mb-2">
              {fromPrompt ? (
                <>
                  <Button
                    className="greybtn me-3"
                    onClick={handleScriptEdit}
                    type="button"
                    value="Edit"
                  >
                    <MdModeEditOutline className="editicon" />
                    Edit
                  </Button>
                  <Button
                    className="greybtn me-3"
                    onClick={(e) => {
                      regenerateScript(e);
                    }}
                    type="button"
                    value="Regenerate"
                  >
                    <FiRefreshCcw className="editicon" />
                    Regenerate
                  </Button>
                </>
              ) : (
                <></>
              )}
              {isMobile === true ? (
                <p className="text-danger text-center mb-0 mt-2 p-4">{error}</p>
              ) : (
                <></>
              )}
              <input
                className="mt-0 border-0 py-2"
                type="submit"
                value="Proceed"
              />
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ScriptInput;
