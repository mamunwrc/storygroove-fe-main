import React from "react";
import { Table, Badge } from "react-bootstrap";

const dimensionColors = {
  RPM: "#078fca",
  RPD: "#078fca",
  TPM: "#0A5D84",
  TPD: "#0A5D84",
  SPEND: "#c0392b",
  BLOCKED: "#6c757d",
};

const actionConfig = {
  request_rejected: { label: "Rejected", bg: "danger" },
  user_notified: { label: "Notified", bg: "warning" },
  auto_blocked: { label: "Auto Blocked", bg: "dark" },
  warning_80_pct: { label: "80% Warning", bg: "info" },
};

const RateLimitHitLog = ({ events, loading }) => {
  return (
    <>
      <h3 className="section-heading">Rate Limit Hit Log</h3>

      {loading ? (
        <div className="table-responsive rate-log-skeleton">
          <Table hover className="align-middle mb-0">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>User</th>
                <th>Dimension</th>
                <th>Value / Limit</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 5 }).map((_, idx) => (
                <tr key={idx} className="table-skeleton-row">
                  <td>
                    <div className="skeleton-line skeleton-long" />
                  </td>
                  <td>
                    <div className="skeleton-line skeleton-short" />
                  </td>
                  <td>
                    <div className="skeleton-pill" />
                  </td>
                  <td>
                    <div className="skeleton-line skeleton-short" />
                  </td>
                  <td>
                    <div className="skeleton-pill" />
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
      ) : events && events.length > 0 ? (
        <div className="table-responsive">
          <Table hover className="align-middle mb-0">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>User</th>
                <th>Dimension</th>
                <th>Value / Limit</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {events.map((evt) => {
                const act = actionConfig[evt.action] || {
                  label: evt.action,
                  bg: "secondary",
                };
                return (
                  <tr key={evt._id}>
                    <td style={{ whiteSpace: "nowrap" }}>
                      {new Date(evt.createdAt).toLocaleString()}
                    </td>
                    <td>{evt.userEmail}</td>
                    <td>
                      <Badge
                        className="badge-pill"
                        style={{
                          backgroundColor:
                            dimensionColors[evt.dimension] || "#999",
                          color: "#fff",
                        }}
                      >
                        {evt.dimension}
                      </Badge>
                    </td>
                    <td>
                      {evt.currentValue.toLocaleString()} /{" "}
                      {evt.limitValue.toLocaleString()}
                    </td>
                    <td>
                      <Badge bg={act.bg} className="badge-pill">
                        {act.label}
                      </Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        </div>
      ) : (
        <div className="empty-state">
          No rate limit events recorded yet.
        </div>
      )}
    </>
  );
};

export default RateLimitHitLog;
