import React, { useEffect, useRef, useState } from "react";
import { Spinner } from "react-bootstrap";
import toast from "react-hot-toast";
import { FiRefreshCw, FiCheckCircle, FiAlertTriangle } from "react-icons/fi";
import { recomputeCosts, getRecomputeJob } from "../../../api/apiUsage";

const POLL_INTERVAL_MS = 1500;
const MAX_POLL_ATTEMPTS = 800;

const CostRecomputePanel = () => {
  const [job, setJob] = useState(null);
  const [starting, setStarting] = useState(false);
  const pollTimer = useRef(null);
  const pollAttempts = useRef(0);

  useEffect(() => {
    return () => {
      if (pollTimer.current) clearTimeout(pollTimer.current);
    };
  }, []);

  const stopPolling = () => {
    if (pollTimer.current) {
      clearTimeout(pollTimer.current);
      pollTimer.current = null;
    }
    pollAttempts.current = 0;
  };

  const pollJob = (jobId) => {
    if (pollAttempts.current >= MAX_POLL_ATTEMPTS) {
      stopPolling();
      return;
    }
    pollAttempts.current += 1;

    pollTimer.current = setTimeout(async () => {
      try {
        const res = await getRecomputeJob(jobId);
        setJob({ jobId, ...res.data });
        if (res.data.status === "running") {
          pollJob(jobId);
        } else {
          stopPolling();
          if (res.data.status === "completed") {
            toast.success(
              `Done · updated costs on ${res.data.updated.toLocaleString()} of ${res.data.scanned.toLocaleString()} past requests`
            );
          } else if (res.data.status === "failed") {
            toast.error(
              `Could not finish updating costs: ${res.data.error || "Unknown error"}`
            );
          }
        }
      } catch (err) {
        console.error("recompute poll failed:", err);
        stopPolling();
      }
    }, POLL_INTERVAL_MS);
  };

  const handleStart = async () => {
    setStarting(true);
    try {
      const res = await recomputeCosts();
      const initial = { jobId: res.data.jobId, status: "running", scanned: 0, updated: 0 };
      setJob(initial);
      toast.success("Updating past request costs…");
      pollJob(res.data.jobId);
    } catch (err) {
      console.error("recompute start failed:", err);
      toast.error("Could not start the cost update");
    } finally {
      setStarting(false);
    }
  };

  const isRunning = job?.status === "running";
  const isDone = job?.status === "completed" || job?.status === "failed";

  return (
    <div className="recompute-panel">
      <div className="recompute-panel-header">
        <div>
          <h4 className="recompute-title">Update costs on past requests</h4>
          <p className="recompute-help">
            Recalculates the dollar amount shown for every past AI request using
            today&apos;s model prices. Use this after we change pricing, or if
            costs on the dashboard look wrong. You can run it more than once
            safely. If you have a very long history, it may take several
            minutes—leave this page open until it finishes.
          </p>
        </div>
        <button
          className="sg-btn-fill recompute-cta"
          onClick={handleStart}
          disabled={starting || isRunning}
        >
          {starting || isRunning ? (
            <Spinner animation="border" size="sm" />
          ) : (
            <>
              <FiRefreshCw size={14} />
              Update past costs
            </>
          )}
        </button>
      </div>

      {job && (
        <div className={`recompute-status recompute-status-${job.status}`}>
          <div className="recompute-status-icon">
            {job.status === "completed" ? (
              <FiCheckCircle size={18} />
            ) : job.status === "failed" ? (
              <FiAlertTriangle size={18} />
            ) : (
              <Spinner animation="border" size="sm" />
            )}
          </div>
          <div className="recompute-status-body">
            <div className="recompute-status-label">
              {job.status === "running" && "Updating costs…"}
              {job.status === "completed" && "Finished"}
              {job.status === "failed" && "Could not finish"}
            </div>
            <div className="recompute-status-meta">
              <span>
                Requests checked:{" "}
                <strong>{(job.scanned || 0).toLocaleString()}</strong>
              </span>
              <span className="dot-sep" />
              <span>
                Costs updated:{" "}
                <strong>{(job.updated || 0).toLocaleString()}</strong>
              </span>
              {isDone && job.startedAt && job.finishedAt && (
                <>
                  <span className="dot-sep" />
                  <span>
                    Time taken:{" "}
                    <strong>
                      {Math.max(
                        1,
                        Math.round((job.finishedAt - job.startedAt) / 1000)
                      )}
                      s
                    </strong>
                  </span>
                </>
              )}
            </div>
            {job.status === "failed" && job.error && (
              <div className="recompute-status-error">{job.error}</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CostRecomputePanel;
