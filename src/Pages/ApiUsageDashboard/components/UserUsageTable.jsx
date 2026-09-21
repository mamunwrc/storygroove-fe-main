import React, { useState } from "react";
import { Table, Badge, Form, InputGroup, Modal, Row, Col } from "react-bootstrap";
import { FiSearch, FiChevronUp, FiChevronDown } from "react-icons/fi";
import {
  MdBlock,
  MdCheckCircle,
  MdTune,
  MdChevronLeft,
  MdChevronRight,
  MdLockOpen,
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

const SortHeader = ({ label, field, currentSort, currentOrder, onSort }) => {
  const isActive = currentSort === field;
  return (
    <th
      style={{ cursor: "pointer", userSelect: "none" }}
      onClick={() => onSort(field)}
    >
      <span className="d-inline-flex align-items-center gap-1">
        {label}
        {isActive &&
          (currentOrder === "asc" ? (
            <FiChevronUp size={14} />
          ) : (
            <FiChevronDown size={14} />
          ))}
      </span>
    </th>
  );
};

const UserUsageTable = ({
  users,
  pagination,
  loading,
  onSelectUser,
  onBlockToggle,
  onIncreaseLimitClick,
  onUnlockLogin,
  onSearch,
  onSort,
  sortField,
  sortOrder,
  onPageChange,
}) => {
  const [searchValue, setSearchValue] = useState("");
  const [limitModal, setLimitModal] = useState({ show: false, user: null });
  const [limitForm, setLimitForm] = useState({
    monthlySpendLimit: "",
    customRpmLimit: "",
    customRpdLimit: "",
    customTpmLimit: "",
    customTpdLimit: "",
  });

  const handleSearch = (e) => {
    e.preventDefault();
    onSearch(searchValue);
  };

  const handleSort = (field) => {
    const newOrder =
      sortField === field && sortOrder === "desc" ? "asc" : "desc";
    onSort(field, newOrder);
  };

  const openLimitModal = (e, user) => {
    e.stopPropagation();
    setLimitForm({
      monthlySpendLimit: user.monthlySpendLimit ?? "",
      customRpmLimit: user.customRpmLimit ?? "",
      customRpdLimit: user.customRpdLimit ?? "",
      customTpmLimit: user.customTpmLimit ?? "",
      customTpdLimit: user.customTpdLimit ?? "",
    });
    setLimitModal({ show: true, user });
  };

  const handleLimitSave = () => {
    const parsed = {};
    Object.entries(limitForm).forEach(([k, v]) => {
      parsed[k] = v === "" ? null : Number(v);
    });
    onIncreaseLimitClick(limitModal.user._id, parsed);
    setLimitModal({ show: false, user: null });
  };

  const handleBlockClick = (e, user) => {
    e.stopPropagation();
    onBlockToggle(user);
  };

  const handleUnlockClick = (e, user) => {
    e.stopPropagation();
    if (onUnlockLogin) onUnlockLogin(user);
  };

  const isUserLocked = (user) =>
    Boolean(user.lockUntil && new Date(user.lockUntil).getTime() > Date.now());

  return (
    <>
      <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
        <div>
          <h3 className="section-heading mb-1">User Usage Overview</h3>
          <p className="section-subtext">
            All accounts including superadmin and admin. Click a row for
            detailed usage history and analytics.
          </p>
        </div>
        <Form onSubmit={handleSearch} style={{ maxWidth: 320 }}>
          <InputGroup>
            <Form.Control
              type="text"
              placeholder="Search by email..."
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              style={{ borderColor: "#ccd4d8" }}
            />
            <button
              type="submit"
              className="btn-action"
              style={{ borderLeft: "none", borderRadius: "0 8px 8px 0" }}
            >
              <FiSearch size={16} />
            </button>
          </InputGroup>
        </Form>
      </div>

      <div className="table-responsive">
        <Table hover className="align-middle mb-0 user-usage-table">
          <thead>
            <tr>
              <th>User</th>
              <th>Role</th>
              <SortHeader
                label="Requests"
                field="totalRequests"
                currentSort={sortField}
                currentOrder={sortOrder}
                onSort={handleSort}
              />
              <SortHeader
                label="Tokens"
                field="totalTokens"
                currentSort={sortField}
                currentOrder={sortOrder}
                onSort={handleSort}
              />
              <SortHeader
                label="Cost"
                field="totalCost"
                currentSort={sortField}
                currentOrder={sortOrder}
                onSort={handleSort}
              />
              <th className="user-usage-status-col">Account Status</th>
              <th className="user-usage-status-col">API Access</th>
              <th className="text-end user-usage-actions-col" style={{ minWidth: 100 }}>
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {loading
              ? Array.from({ length: 6 }).map((_, idx) => (
                  <tr key={idx} className="table-skeleton-row">
                    <td>
                      <div className="user-cell">
                        <div className="user-avatar skeleton-circle" />
                        <div className="skeleton-line skeleton-short" />
                      </div>
                    </td>
                    <td>
                      <div className="skeleton-pill" />
                    </td>
                    <td>
                      <div className="skeleton-line skeleton-short" />
                    </td>
                    <td>
                      <div className="skeleton-line skeleton-short" />
                    </td>
                    <td>
                      <div className="skeleton-line skeleton-short" />
                    </td>
                    <td className="user-usage-status-col">
                      <div className="skeleton-pill mx-auto" />
                    </td>
                    <td className="user-usage-status-col">
                      <div className="skeleton-pill mx-auto" />
                    </td>
                    <td className="user-usage-actions-col">
                      <div className="d-flex gap-1 justify-content-end">
                        <div className="skeleton-icon" />
                        <div className="skeleton-icon" />
                      </div>
                    </td>
                  </tr>
                ))
              : users && users.length > 0
              ? users.map((u) => {
                  const accountSt =
                    accountStatusConfig[u.status] ||
                    accountStatusConfig.inactive;
                  const apiSt =
                    apiAccessStatusConfig[u.apiUsageStatus] ||
                    apiAccessStatusConfig.active;
                  const role =
                    roleConfig[u.role] || {
                      bg: "secondary",
                      label: u.role || "User",
                    };
                  const isSuperadmin = u.role === "superadmin";
                  const locked = isUserLocked(u);
                  const lockedUntilLabel = locked
                    ? new Date(u.lockUntil).toLocaleString()
                    : "";
                  return (
                    <tr
                      key={u._id}
                      className="user-row"
                      onClick={() => onSelectUser(u)}
                    >
                      <td>
                        <div className="user-cell">
                          <div className="user-avatar">
                            {(u.email || "U")[0].toUpperCase()}
                          </div>
                          <span className="user-email">{u.email}</span>
                        </div>
                      </td>
                      <td>
                        <Badge bg={role.bg} className="badge-pill">
                          {role.label}
                        </Badge>
                      </td>
                      <td>{(u.totalRequests || 0).toLocaleString()}</td>
                      <td>
                        <span
                          title={`Prompt: ${formatTokens(u.promptTokens)} | Completion: ${formatTokens(u.completionTokens)}`}
                        >
                          {formatTokens(u.totalTokens)}
                        </span>
                      </td>
                      <td className="fw-medium">{formatCost(u.totalCost)}</td>
                      <td className="user-usage-status-col">
                        <Badge bg={accountSt.bg} className="badge-pill">
                          {accountSt.label}
                        </Badge>
                      </td>
                      <td className="user-usage-status-col">
                        <div className="user-usage-status-badges">
                          <Badge bg={apiSt.bg} className="badge-pill">
                            {apiSt.label}
                          </Badge>
                          {locked && (
                            <Badge
                              bg="warning"
                              className="badge-pill"
                              title={`Login locked until ${lockedUntilLabel}`}
                            >
                              Login Locked
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="user-usage-actions-col">
                        <div className="d-flex gap-1 justify-content-end">
                          {locked && (
                            <button
                              className="icon-btn icon-btn-success"
                              title={`Unlock login (locked until ${lockedUntilLabel})`}
                              onClick={(e) => handleUnlockClick(e, u)}
                            >
                              <MdLockOpen size={16} />
                            </button>
                          )}
                          {!isSuperadmin && (
                            <button
                              className={`icon-btn ${u.apiUsageStatus === "blocked" ? "icon-btn-success" : "icon-btn-danger"}`}
                              title={
                                u.apiUsageStatus === "blocked"
                                  ? "Unblock"
                                  : "Block"
                              }
                              onClick={(e) => handleBlockClick(e, u)}
                            >
                              {u.apiUsageStatus === "blocked" ? (
                                <MdCheckCircle size={16} />
                              ) : (
                                <MdBlock size={16} />
                              )}
                            </button>
                          )}
                          <button
                            className="icon-btn"
                            title="Edit Limits"
                            onClick={(e) => openLimitModal(e, u)}
                          >
                            <MdTune size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              : (
                  <tr>
                    <td colSpan={8} className="empty-state">
                      No users found.
                    </td>
                  </tr>
                )}
          </tbody>
        </Table>
      </div>

      {pagination && pagination.totalPages > 1 && (
        <div
          className="d-flex justify-content-between align-items-center mt-3 pt-3"
          style={{ borderTop: "1px solid #e0e0e0" }}
        >
          <span className="pagination-info">
            Showing page {pagination.page} of {pagination.totalPages} (
            {pagination.total} users)
          </span>
          <div className="d-flex gap-2 align-items-center">
            <button
              className="icon-btn"
              disabled={pagination.page <= 1}
              onClick={() => onPageChange(pagination.page - 1)}
              title="Previous page"
            >
              <MdChevronLeft size={20} />
            </button>
            <span className="pagination-info fw-medium">
              {pagination.page}
            </span>
            <button
              className="icon-btn"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => onPageChange(pagination.page + 1)}
              title="Next page"
            >
              <MdChevronRight size={20} />
            </button>
          </div>
        </div>
      )}

      <Modal
        show={limitModal.show}
        onHide={() => setLimitModal({ show: false, user: null })}
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
          {limitModal.user && (
            <p style={{ fontSize: 14, color: "#999", marginBottom: 20 }}>
              {limitModal.user.email}
            </p>
          )}
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
                placeholder="Global default"
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
                placeholder="Global default"
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
                placeholder="Global default"
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
                placeholder="Global default"
              />
            </Col>
          </Row>
        </Modal.Body>
        <Modal.Footer>
          <button
            className="sg-btn-outline"
            onClick={() => setLimitModal({ show: false, user: null })}
          >
            Cancel
          </button>
          <button className="sg-btn-fill" onClick={handleLimitSave}>
            Save Limits
          </button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default UserUsageTable;
