import React, { useState } from "react";
import { Row, Col, Badge, Table, Modal, Form, ProgressBar } from "react-bootstrap";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";
import {
  MdArrowBack,
  MdBlock,
  MdCheckCircle,
  MdTune,
  MdEmail,
  MdBarChart,
  MdToken,
  MdAttachMoney,
  MdShowChart,
} from "react-icons/md";

const accountStatusConfig = {
  active: { bg: "success", label: "Active" },
  inactive: { bg: "secondary", label: "Inactive" },
  blocked: { bg: "danger", label: "Blocked" },
  deleted: { bg: "dark", label: "Deleted" },
};

const apiAccessStatusConfig = {
  active: { bg: "success", label: "Active" },
  blocked: { bg: "danger", label: "Blocked" },
  limit_reached: { bg: "warning", label: "Limit Reached" },
};

const roleConfig = {
  superadmin: { bg: "dark", label: "Superadmin" },
  admin: { bg: "primary", label: "Admin" },
  user: { bg: "secondary", label: "User" },
};

const MONTH_NAMES = [
  "",
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const dimensionLabels = {
  RPM: "Requests/Min",
  RPD: "Requests/Day",
  TPM: "Tokens/Min",
  TPD: "Tokens/Day",
  SPEND: "Monthly Spend",
  BLOCKED: "Blocked",
};

const actionLabels = {
  request_rejected: "Rejected",
  user_notified: "Notified",
  auto_blocked: "Auto Blocked",
  warning_80_pct: "80% Warning",
};

const chartModes = [
  { key: "cost", label: "Cost", icon: MdAttachMoney },
  { key: "requests", label: "Requests", icon: MdBarChart },
  { key: "tokens", label: "Tokens", icon: MdToken },
];

const rateLimitDimensions = [
  { key: "rpm", label: "RPM", description: "Requests / Min" },
  { key: "rpd", label: "RPD", description: "Requests / Day" },
  { key: "tpm", label: "TPM", description: "Tokens / Min" },
  { key: "tpd", label: "TPD", description: "Tokens / Day" },
];

function formatCost(v) {
  return `$${(v || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatTokens(v) {
  if (!v) return "0";
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(1)}K`;
  return v.toLocaleString();
}

function buildChartData(costHistory) {
  if (!costHistory || costHistory.length === 0) return [];
  return costHistory.map((item) => ({
    name: `${MONTH_NAMES[item._id.month]} ${item._id.year}`,
    cost: item.totalCost,
    requests: item.totalRequests,
    tokens: item.totalTokens,
  }));
}

function getBarColor(pct) {
  if (pct >= 90) return "#d32f2f";
  if (pct >= 70) return "#ed6c02";
  return "#078fca";
}

const EmptyChart = ({ message }) => (
  <div className="empty-chart">
    <MdShowChart size={48} />
    <p>{message}</p>
  </div>
);

const emptyLimitForm = {
  monthlySpendLimit: "",
  customRpmLimit: "",
  customRpdLimit: "",
  customTpmLimit: "",
  customTpdLimit: "",
};

const UserDetailPanel = ({
  user,
  historyData,
  loading,
  onBack,
  onBlockToggle,
  onIncreaseLimitClick,
}) => {
  const [chartMode, setChartMode] = useState("cost");
  const [limitModal, setLimitModal] = useState(false);
  const [limitForm, setLimitForm] = useState({
    monthlySpendLimit: user.monthlySpendLimit ?? "",
    customRpmLimit: user.customRpmLimit ?? "",
    customRpdLimit: user.customRpdLimit ?? "",
    customTpmLimit: user.customTpmLimit ?? "",
    customTpdLimit: user.customTpdLimit ?? "",
  });

  const accountSt =
    accountStatusConfig[user.status] || accountStatusConfig.inactive;
  const apiSt =
    apiAccessStatusConfig[user.apiUsageStatus] ||
    apiAccessStatusConfig.active;
  const chartData = buildChartData(historyData?.costHistory);
  const rateLimitHits = historyData?.rateLimitHits || [];
  const rateLimitStatus = historyData?.rateLimitStatus || null;
  const spendLimitInfo = historyData?.spendLimit || null;
  const hasChartData = chartData.length > 0;

  const handleLimitSave = async () => {
    const parsed = {};
    Object.entries(limitForm).forEach(([k, v]) => {
      parsed[k] = v === "" ? null : Number(v);
    });
    await onIncreaseLimitClick(user._id, parsed);
    setLimitModal(false);
  };

  const openLimitModal = () => {
    setLimitForm({
      monthlySpendLimit: user.monthlySpendLimit ?? "",
      customRpmLimit: user.customRpmLimit ?? "",
      customRpdLimit: user.customRpdLimit ?? "",
      customTpmLimit: user.customTpmLimit ?? "",
      customTpdLimit: user.customTpdLimit ?? "",
    });
    setLimitModal(true);
  };

  const handleResetToDefault = () => {
    setLimitForm(emptyLimitForm);
  };

  return (
    <div className="user-detail-panel">
      <button className="back-btn" onClick={onBack}>
        <MdArrowBack size={18} />
        <span>Back to Users</span>
      </button>

      <div className="user-detail-header">
        <div className="d-flex align-items-center gap-3 flex-wrap">
          <div className="user-detail-avatar">
            {(user.email || "U")[0].toUpperCase()}
          </div>
          <div>
            <h3 className="user-detail-name">
              {user.name || user.email?.split("@")[0] || "User"}
            </h3>
            <div className="d-flex align-items-center gap-2 mt-1">
              <MdEmail size={14} style={{ color: "#999" }} />
              <span className="user-detail-email">{user.email}</span>
              <Badge
                bg={(roleConfig[user.role] || roleConfig.user).bg}
                className="badge-pill ms-1"
              >
                {(roleConfig[user.role] || roleConfig.user).label}
              </Badge>
              <Badge bg={accountSt.bg} className="badge-pill">
                Account: {accountSt.label}
              </Badge>
              <Badge bg={apiSt.bg} className="badge-pill">
                API: {apiSt.label}
              </Badge>
            </div>
          </div>
        </div>
        <div className="d-flex gap-2">
          {user.role !== "superadmin" && (
            <button
              className={`btn-action ${user.apiUsageStatus === "blocked" ? "btn-action-success" : "btn-action-danger"}`}
              onClick={() => onBlockToggle(user)}
            >
              {user.apiUsageStatus === "blocked" ? (
                <>
                  <MdCheckCircle size={16} className="me-1" /> Unblock
                </>
              ) : (
                <>
                  <MdBlock size={16} className="me-1" /> Block
                </>
              )}
            </button>
          )}
          <button className="btn-action" onClick={openLimitModal}>
            <MdTune size={16} className="me-1" /> Edit Limits
          </button>
        </div>
      </div>

      {loading ? (
        <>
          <div className="detail-skeleton-row">
            <div className="detail-stat-card">
              <div className="detail-stat-icon skeleton-circle" />
              <div className="w-100">
                <div className="skeleton-line skeleton-label" />
                <div className="skeleton-line skeleton-value" />
              </div>
            </div>
          </div>
          <div className="section-panel">
            <div className="skeleton-line skeleton-label" />
            <div className="skeleton-rect skeleton-chart" />
          </div>
          <div className="section-panel">
            <div className="skeleton-line skeleton-label" />
            <div className="skeleton-line skeleton-long" />
            <div className="skeleton-line skeleton-long" />
          </div>
        </>
      ) : (
        <>
          {/* Stat cards */}
          <Row className="g-3 mb-4">
            <Col xs={12} sm={6} lg={3}>
              <div className="detail-stat-card">
                <div className="detail-stat-icon" style={{ background: "#e8f4fd" }}>
                  <MdBarChart size={20} style={{ color: "#078fca" }} />
                </div>
                <div>
                  <div className="detail-stat-label">Total Requests</div>
                  <div className="detail-stat-value">
                    {(user.totalRequests || 0).toLocaleString()}
                  </div>
                </div>
              </div>
            </Col>
            <Col xs={12} sm={6} lg={3}>
              <div className="detail-stat-card">
                <div className="detail-stat-icon" style={{ background: "#edf7f6" }}>
                  <MdToken size={20} style={{ color: "#48a09e" }} />
                </div>
                <div>
                  <div className="detail-stat-label">Tokens Used</div>
                  <div className="detail-stat-value">
                    {formatTokens(user.totalTokens)}
                  </div>
                  <div className="detail-stat-sub">
                    In: {formatTokens(user.promptTokens)} &middot; Out:{" "}
                    {formatTokens(user.completionTokens)}
                  </div>
                </div>
              </div>
            </Col>
            <Col xs={12} sm={6} lg={3}>
              <div className="detail-stat-card">
                <div className="detail-stat-icon" style={{ background: "#fef4e8" }}>
                  <MdAttachMoney size={20} style={{ color: "#ed6c02" }} />
                </div>
                <div>
                  <div className="detail-stat-label">Total Cost</div>
                  <div className="detail-stat-value">
                    {formatCost(user.totalCost)}
                  </div>
                </div>
              </div>
            </Col>
            <Col xs={12} sm={6} lg={3}>
              <div className="detail-stat-card">
                <div className="detail-stat-icon" style={{ background: "#f3eef8" }}>
                  <MdShowChart size={20} style={{ color: "#7b61ff" }} />
                </div>
                <div>
                  <div className="detail-stat-label">Spend Limit</div>
                  <div className="detail-stat-value">
                    {spendLimitInfo?.effective != null
                      ? formatCost(spendLimitInfo.effective)
                      : "No limit"}
                  </div>
                  {spendLimitInfo?.source && (
                    <div className="detail-stat-sub">
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 600,
                          textTransform: "uppercase",
                          letterSpacing: 0.5,
                          color:
                            spendLimitInfo.source === "custom"
                              ? "#078fca"
                              : spendLimitInfo.source === "trial"
                                ? "#ed6c02"
                                : "#48a09e",
                        }}
                      >
                        {spendLimitInfo.source === "custom"
                          ? "Custom Override"
                          : spendLimitInfo.source === "trial"
                            ? "Trial Limit"
                            : spendLimitInfo.source === "default"
                              ? "Default"
                              : `${spendLimitInfo.source} Plan`}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </Col>
          </Row>

          {/* Per-user rate limit status */}
          {rateLimitStatus && (
            <div className="section-panel">
              <h3 className="section-heading mb-1">Rate Limit Status</h3>
              <p className="section-subtext" style={{ marginBottom: 16 }}>
                Current usage against this user&apos;s individual limits.
              </p>
              <Row className="g-4">
                {rateLimitDimensions.map((dim) => {
                  const data = rateLimitStatus[dim.key] || {
                    current: 0,
                    limit: 0,
                    percentage: 0,
                    isCustom: false,
                  };
                  const barColor = getBarColor(data.percentage);
                  return (
                    <Col key={dim.key} xs={12} sm={6} lg={3}>
                      <div className="d-flex justify-content-between align-items-end mb-2">
                        <div>
                          <span
                            style={{
                              fontSize: 14,
                              fontWeight: 600,
                              color: "#333",
                            }}
                          >
                            {dim.label}
                          </span>
                          <span
                            style={{
                              fontSize: 12,
                              color: "#999",
                              marginLeft: 6,
                            }}
                          >
                            {dim.description}
                          </span>
                        </div>
                        <span
                          style={{
                            fontSize: 13,
                            fontWeight: 600,
                            color: barColor,
                          }}
                        >
                          {data.percentage}%
                        </span>
                      </div>
                      <ProgressBar
                        now={data.percentage}
                        style={{
                          height: 8,
                          borderRadius: 4,
                          backgroundColor: "#e8e8e8",
                        }}
                      >
                        <ProgressBar
                          now={data.percentage}
                          style={{
                            backgroundColor: barColor,
                            borderRadius: 4,
                          }}
                        />
                      </ProgressBar>
                      <div className="d-flex justify-content-between" style={{ marginTop: 6 }}>
                        <span style={{ fontSize: 12, color: "#999" }}>
                          {formatTokens(data.current)} / {formatTokens(data.limit)}
                        </span>
                        {data.isCustom && (
                          <span
                            style={{
                              fontSize: 10,
                              color: "#078fca",
                              fontWeight: 600,
                              textTransform: "uppercase",
                              letterSpacing: 0.5,
                            }}
                          >
                            Custom
                          </span>
                        )}
                      </div>
                    </Col>
                  );
                })}
              </Row>
            </div>
          )}

          {/* Chart section */}
          <div className="section-panel">
            <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
              <h3 className="section-heading mb-0">Usage Over Time</h3>
              <div className="chart-toggle">
                {chartModes.map((mode) => (
                  <button
                    key={mode.key}
                    onClick={() => setChartMode(mode.key)}
                    className={`chart-toggle-btn ${chartMode === mode.key ? "active" : ""}`}
                  >
                    <mode.icon size={14} />
                    {mode.label}
                  </button>
                ))}
              </div>
            </div>

            {hasChartData ? (
              <div style={{ width: "100%", height: 300 }}>
                <ResponsiveContainer>
                  {chartMode === "cost" ? (
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis
                        dataKey="name"
                        tick={{ fontSize: 12, fill: "#999" }}
                      />
                      <YAxis
                        tick={{ fontSize: 12, fill: "#999" }}
                        tickFormatter={(v) => `$${v}`}
                      />
                      <Tooltip
                        formatter={(v) => [`$${v.toFixed(2)}`, "Cost"]}
                        contentStyle={{
                          borderRadius: 8,
                          border: "1px solid #ccd4d8",
                          fontFamily: "'Inter', sans-serif",
                          fontSize: 13,
                        }}
                      />
                      <Bar
                        dataKey="cost"
                        fill="#078fca"
                        radius={[4, 4, 0, 0]}
                        maxBarSize={48}
                      />
                    </BarChart>
                  ) : chartMode === "requests" ? (
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis
                        dataKey="name"
                        tick={{ fontSize: 12, fill: "#999" }}
                      />
                      <YAxis tick={{ fontSize: 12, fill: "#999" }} />
                      <Tooltip
                        formatter={(v) => [v.toLocaleString(), "Requests"]}
                        contentStyle={{
                          borderRadius: 8,
                          border: "1px solid #ccd4d8",
                          fontFamily: "'Inter', sans-serif",
                          fontSize: 13,
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="requests"
                        stroke="#48a09e"
                        strokeWidth={2}
                        dot={{ r: 4, fill: "#48a09e" }}
                      />
                    </LineChart>
                  ) : (
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis
                        dataKey="name"
                        tick={{ fontSize: 12, fill: "#999" }}
                      />
                      <YAxis
                        tick={{ fontSize: 12, fill: "#999" }}
                        tickFormatter={(v) => {
                          if (v >= 1_000_000)
                            return `${(v / 1_000_000).toFixed(1)}M`;
                          if (v >= 1_000) return `${(v / 1_000).toFixed(0)}K`;
                          return v;
                        }}
                      />
                      <Tooltip
                        formatter={(v) => [v.toLocaleString(), "Tokens"]}
                        contentStyle={{
                          borderRadius: 8,
                          border: "1px solid #ccd4d8",
                          fontFamily: "'Inter', sans-serif",
                          fontSize: 13,
                        }}
                      />
                      <Bar
                        dataKey="tokens"
                        fill="#0A5D84"
                        radius={[4, 4, 0, 0]}
                        maxBarSize={48}
                      />
                    </BarChart>
                  )}
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyChart message="No usage data recorded for this user yet." />
            )}
          </div>

          {/* Rate limit hits */}
          <div className="section-panel">
            <h3 className="section-heading">Rate Limit Hits</h3>
            {rateLimitHits.length > 0 ? (
              <div className="table-responsive">
                <Table hover className="align-middle mb-0">
                  <thead>
                    <tr>
                      <th>Timestamp</th>
                      <th>Dimension</th>
                      <th>Value / Limit</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rateLimitHits.slice(0, 15).map((hit) => (
                      <tr key={hit._id}>
                        <td>
                          {new Date(hit.createdAt).toLocaleString()}
                        </td>
                        <td>
                          <span style={{ fontWeight: 600, color: "#333" }}>
                            {hit.dimension}
                          </span>
                          <span
                            style={{
                              fontSize: 11,
                              color: "#999",
                              marginLeft: 4,
                            }}
                          >
                            ({dimensionLabels[hit.dimension]})
                          </span>
                        </td>
                        <td>
                          {hit.currentValue.toLocaleString()} /{" "}
                          {hit.limitValue.toLocaleString()}
                        </td>
                        <td>
                          <Badge
                            bg={
                              hit.action === "request_rejected"
                                ? "danger"
                                : hit.action === "auto_blocked"
                                  ? "dark"
                                  : "warning"
                            }
                            className="badge-pill"
                          >
                            {actionLabels[hit.action] || hit.action}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
            ) : (
              <div className="empty-state-inline">
                <MdCheckCircle size={24} style={{ color: "#48a09e" }} />
                <span>No rate limit violations recorded for this user.</span>
              </div>
            )}
          </div>
        </>
      )}

      {/* Limit edit modal */}
      <Modal
        show={limitModal}
        onHide={() => setLimitModal(false)}
        centered
        className="storygroove-theme"
      >
        <Modal.Header closeButton>
          <Modal.Title
            style={{
              fontSize: 18,
              fontFamily: "'Domine', serif",
              color: "#1b1b1b",
            }}
          >
            Update Limits
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p style={{ fontSize: 13, color: "#999", marginBottom: 20 }}>
            {user.email} — Leave spend limit blank to use the plan-based
            limit. Leave rate limits blank to use platform defaults.
          </p>
          <Row className="g-3">
            <Col xs={12}>
              <Form.Label>Monthly Spend Limit ($)</Form.Label>
              <Form.Control
                type="number"
                value={limitForm.monthlySpendLimit}
                onChange={(e) =>
                  setLimitForm((p) => ({
                    ...p,
                    monthlySpendLimit: e.target.value,
                  }))
                }
                placeholder="No limit"
              />
            </Col>
            <Col xs={6}>
              <Form.Label>RPM Limit</Form.Label>
              <Form.Control
                type="number"
                value={limitForm.customRpmLimit}
                onChange={(e) =>
                  setLimitForm((p) => ({
                    ...p,
                    customRpmLimit: e.target.value,
                  }))
                }
                placeholder="Default"
              />
            </Col>
            <Col xs={6}>
              <Form.Label>RPD Limit</Form.Label>
              <Form.Control
                type="number"
                value={limitForm.customRpdLimit}
                onChange={(e) =>
                  setLimitForm((p) => ({
                    ...p,
                    customRpdLimit: e.target.value,
                  }))
                }
                placeholder="Default"
              />
            </Col>
            <Col xs={6}>
              <Form.Label>TPM Limit</Form.Label>
              <Form.Control
                type="number"
                value={limitForm.customTpmLimit}
                onChange={(e) =>
                  setLimitForm((p) => ({
                    ...p,
                    customTpmLimit: e.target.value,
                  }))
                }
                placeholder="Default"
              />
            </Col>
            <Col xs={6}>
              <Form.Label>TPD Limit</Form.Label>
              <Form.Control
                type="number"
                value={limitForm.customTpdLimit}
                onChange={(e) =>
                  setLimitForm((p) => ({
                    ...p,
                    customTpdLimit: e.target.value,
                  }))
                }
                placeholder="Default"
              />
            </Col>
          </Row>
        </Modal.Body>
        <Modal.Footer className="d-flex justify-content-between flex-wrap gap-2">
          <button
            type="button"
            className="sg-btn-outline"
            onClick={handleResetToDefault}
          >
            Reset to default
          </button>
          <div className="d-flex gap-2">
            <button
              className="sg-btn-outline"
              onClick={() => setLimitModal(false)}
            >
              Cancel
            </button>
            <button className="sg-btn-fill" onClick={handleLimitSave}>
              Save Limits
            </button>
          </div>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default UserDetailPanel;
