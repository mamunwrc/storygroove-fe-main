import React, { useEffect, useMemo, useState } from "react";
import {
  Table,
  Form,
  Button,
  Row,
  Col,
  Spinner,
  Badge,
  Collapse,
} from "react-bootstrap";
import toast, { Toaster } from "react-hot-toast";
import { MdHistory, MdDownload } from "react-icons/md";
import { getActivityLogs } from "../../api/activityLogs";
import {
  ACTIVITY_ACTIONS,
  ACTIVITY_MODULES,
  ACTIVITY_SOURCES,
} from "../../constants/activityLog";
import "../ApiUsageDashboard/ApiUsageDashboard.scss";

const formatUser = (userIdField) => {
  if (!userIdField) return "—";
  if (typeof userIdField === "object" && userIdField.email) {
    const name = [userIdField.fname, userIdField.lname]
      .filter(Boolean)
      .join(" ")
      .trim();
    return name ? `${name} (${userIdField.email})` : userIdField.email;
  }
  // Populated user was deleted or hydration failed — don't expose raw ObjectId.
  return "Unknown user";
};

const formatDate = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
};

const csvEscape = (value) => {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
};

const buildCsv = (rows) => {
  const header = [
    "createdAt",
    "userEmail",
    "userId",
    "action",
    "module",
    "source",
    "description",
    "ipAddress",
    "userAgent",
    "metadata",
  ];
  const lines = [header.join(",")];
  for (const r of rows) {
    const user =
      r.userId && typeof r.userId === "object" ? r.userId : null;
    lines.push(
      [
        r.createdAt || "",
        user?.email || "",
        user?._id || (typeof r.userId === "string" ? r.userId : ""),
        r.action || "",
        r.module || "",
        r.source || "",
        r.description || "",
        r.ipAddress || "",
        r.userAgent || "",
        r.metadata ? JSON.stringify(r.metadata) : "",
      ]
        .map(csvEscape)
        .join(",")
    );
  }
  return lines.join("\n");
};

const ActivityLogDashboard = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1,
  });
  const [facets, setFacets] = useState({
    modules: ACTIVITY_MODULES,
    actions: ACTIVITY_ACTIONS,
    sources: ACTIVITY_SOURCES,
  });

  const [moduleFilter, setModuleFilter] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");
  const [emailFilter, setEmailFilter] = useState("");
  const [userIdFilter, setUserIdFilter] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [filterVersion, setFilterVersion] = useState(0);
  const [expandedRow, setExpandedRow] = useState(null);

  const activeFilters = useMemo(
    () => ({
      module: moduleFilter,
      action: actionFilter,
      source: sourceFilter,
      email: emailFilter,
      userId: userIdFilter,
      startDate,
      endDate,
    }),
    [
      moduleFilter,
      actionFilter,
      sourceFilter,
      emailFilter,
      userIdFilter,
      startDate,
      endDate,
    ]
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const params = {
          page: pagination.page,
          limit: pagination.limit,
        };
        if (moduleFilter) params.module = moduleFilter;
        if (actionFilter) params.action = actionFilter;
        if (sourceFilter) params.source = sourceFilter;
        if (emailFilter.trim()) params.email = emailFilter.trim();
        if (userIdFilter.trim()) params.userId = userIdFilter.trim();
        if (startDate) params.startDate = startDate;
        if (endDate) params.endDate = endDate;

        const res = await getActivityLogs(params);
        if (cancelled) return;
        setLogs(res.data.logs || []);
        if (res.data.facets) {
          setFacets({
            modules: res.data.facets.modules || ACTIVITY_MODULES,
            actions: res.data.facets.actions || ACTIVITY_ACTIONS,
            sources: res.data.facets.sources || ACTIVITY_SOURCES,
          });
        }
        const pg = res.data.pagination;
        if (pg) {
          setPagination((prev) => ({
            ...prev,
            total: pg.total,
            totalPages: pg.totalPages,
            page: pg.page,
            limit: pg.limit,
          }));
        }
      } catch (err) {
        if (!cancelled) {
          console.error(err);
          toast.error("Failed to load activity logs");
          setLogs([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination.page, pagination.limit, filterVersion]);

  const applyFilters = (e) => {
    e.preventDefault();
    setPagination((p) => ({ ...p, page: 1 }));
    setFilterVersion((v) => v + 1);
  };

  const resetFilters = () => {
    setModuleFilter("");
    setActionFilter("");
    setSourceFilter("");
    setEmailFilter("");
    setUserIdFilter("");
    setStartDate("");
    setEndDate("");
    setPagination((p) => ({ ...p, page: 1 }));
    setFilterVersion((v) => v + 1);
  };

  const exportCsv = async () => {
    // Pull up to 1000 matching rows in pages of 100 — enough for ad-hoc audits
    // without timing out on huge collections.
    try {
      toast.loading("Preparing CSV…", { id: "csv" });
      const all = [];
      const params = {};
      if (moduleFilter) params.module = moduleFilter;
      if (actionFilter) params.action = actionFilter;
      if (sourceFilter) params.source = sourceFilter;
      if (emailFilter.trim()) params.email = emailFilter.trim();
      if (userIdFilter.trim()) params.userId = userIdFilter.trim();
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const pageSize = 100;
      const maxRows = 1000;
      for (let p = 1; all.length < maxRows; p += 1) {
        const res = await getActivityLogs({
          ...params,
          page: p,
          limit: pageSize,
        });
        const rows = res.data?.logs || [];
        all.push(...rows);
        const totalPages = res.data?.pagination?.totalPages || 1;
        if (p >= totalPages || rows.length === 0) break;
      }

      const csv = buildCsv(all.slice(0, maxRows));
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `activity-logs-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success(`Exported ${all.length} rows`, { id: "csv" });
    } catch (err) {
      console.error(err);
      toast.error("CSV export failed", { id: "csv" });
    }
  };

  const hasActiveFilters = Object.values(activeFilters).some(Boolean);

  return (
    <div className="api-usage-dashboard activity-log-dashboard p-3 p-md-4">
      <Toaster position="top-right" />
      <div className="d-flex align-items-center gap-2 mb-4">
        <MdHistory size={28} className="text-secondary" />
        <div className="flex-grow-1">
          <h1 className="h4 mb-0" style={{ fontFamily: "Domine, serif" }}>
            Activity log
          </h1>
          <p className="section-subtext mb-0">Superadmin audit trail</p>
        </div>
        <Button
          size="sm"
          variant="outline-secondary"
          onClick={exportCsv}
          disabled={loading || logs.length === 0}
          title="Export current filter to CSV (up to 1000 rows)"
        >
          <MdDownload className="me-1" /> Export CSV
        </Button>
      </div>

      <div className="section-panel mb-4">
        <Form onSubmit={applyFilters}>
          <Row className="g-3 align-items-end">
            <Col xs={12} md={6} lg={2}>
              <Form.Label className="small text-muted">Module</Form.Label>
              <Form.Select
                size="sm"
                value={moduleFilter}
                onChange={(e) => setModuleFilter(e.target.value)}
              >
                <option value="">All</option>
                {facets.modules.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </Form.Select>
            </Col>
            <Col xs={12} md={6} lg={2}>
              <Form.Label className="small text-muted">Action</Form.Label>
              <Form.Select
                size="sm"
                value={actionFilter}
                onChange={(e) => setActionFilter(e.target.value)}
              >
                <option value="">All</option>
                {facets.actions.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </Form.Select>
            </Col>
            <Col xs={12} md={6} lg={2}>
              <Form.Label className="small text-muted">Source</Form.Label>
              <Form.Select
                size="sm"
                value={sourceFilter}
                onChange={(e) => setSourceFilter(e.target.value)}
              >
                <option value="">All</option>
                {facets.sources.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </Form.Select>
            </Col>
            <Col xs={12} md={6} lg={3}>
              <Form.Label className="small text-muted">User email</Form.Label>
              <Form.Control
                size="sm"
                value={emailFilter}
                onChange={(e) => setEmailFilter(e.target.value)}
                placeholder="partial match"
              />
            </Col>
            <Col xs={12} md={6} lg={3}>
              <Form.Label className="small text-muted">User ID</Form.Label>
              <Form.Control
                size="sm"
                value={userIdFilter}
                onChange={(e) => setUserIdFilter(e.target.value)}
                placeholder="Mongo ObjectId"
              />
            </Col>
            <Col xs={12} md={6} lg={3}>
              <Form.Label className="small text-muted">From</Form.Label>
              <Form.Control
                size="sm"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </Col>
            <Col xs={12} md={6} lg={3}>
              <Form.Label className="small text-muted">To</Form.Label>
              <Form.Control
                size="sm"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </Col>
            <Col xs={12} md={6} lg={3} className="d-flex gap-2">
              <Button type="submit" size="sm" variant="primary">
                Apply
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline-secondary"
                onClick={resetFilters}
                disabled={!hasActiveFilters}
              >
                Clear
              </Button>
            </Col>
          </Row>
        </Form>
      </div>

      <div className="section-panel">
        {loading ? (
          <div className="text-center py-5">
            <Spinner animation="border" />
          </div>
        ) : (
          <>
            <div className="table-responsive">
              <Table hover size="sm" className="mb-0 align-middle">
                <thead>
                  <tr>
                    <th style={{ width: 32 }}></th>
                    <th>Date &amp; time</th>
                    <th>User</th>
                    <th>Action</th>
                    <th>Module</th>
                    <th>Source</th>
                    <th>Description</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center text-muted py-4">
                        No logs found
                      </td>
                    </tr>
                  ) : (
                    logs.map((row) => {
                      const isOpen = expandedRow === row._id;
                      const hasDetails =
                        (row.metadata &&
                          Object.keys(row.metadata).length > 0) ||
                        row.ipAddress ||
                        row.userAgent;
                      return (
                        <React.Fragment key={row._id}>
                          <tr>
                            <td>
                              {hasDetails && (
                                <Button
                                  size="sm"
                                  variant="link"
                                  className="p-0"
                                  onClick={() =>
                                    setExpandedRow(isOpen ? null : row._id)
                                  }
                                  aria-label={isOpen ? "Collapse" : "Expand"}
                                >
                                  {isOpen ? "▾" : "▸"}
                                </Button>
                              )}
                            </td>
                            <td className="text-nowrap">
                              {formatDate(row.createdAt)}
                            </td>
                            <td>{formatUser(row.userId)}</td>
                            <td>
                              <Badge bg="light" text="dark">
                                {row.action}
                              </Badge>
                            </td>
                            <td>{row.module}</td>
                            <td className="small text-muted">
                              {row.source || "—"}
                            </td>
                            <td style={{ maxWidth: 360 }}>
                              {row.description}
                            </td>
                          </tr>
                          {hasDetails && (
                            <tr className="border-0">
                              <td colSpan={7} className="p-0 border-0">
                                <Collapse in={isOpen}>
                                  <div className="px-3 pb-3">
                                    <div className="bg-light rounded p-3 small">
                                      {row.ipAddress && (
                                        <div>
                                          <strong>IP:</strong>{" "}
                                          <code>{row.ipAddress}</code>
                                        </div>
                                      )}
                                      {row.userAgent && (
                                        <div className="text-truncate">
                                          <strong>User agent:</strong>{" "}
                                          <code>{row.userAgent}</code>
                                        </div>
                                      )}
                                      {row.metadata &&
                                        Object.keys(row.metadata).length >
                                          0 && (
                                          <div className="mt-2">
                                            <strong>Metadata:</strong>
                                            <pre
                                              className="mb-0 mt-1"
                                              style={{
                                                whiteSpace: "pre-wrap",
                                                wordBreak: "break-word",
                                                maxHeight: 240,
                                                overflowY: "auto",
                                              }}
                                            >
                                              {JSON.stringify(
                                                row.metadata,
                                                null,
                                                2
                                              )}
                                            </pre>
                                          </div>
                                        )}
                                    </div>
                                  </div>
                                </Collapse>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })
                  )}
                </tbody>
              </Table>
            </div>
            {pagination.totalPages > 1 && (
              <div className="d-flex justify-content-between align-items-center mt-3 pt-3 border-top">
                <span className="small text-muted">
                  Page {pagination.page} of {pagination.totalPages} (
                  {pagination.total} total)
                </span>
                <div className="d-flex gap-2">
                  <Button
                    size="sm"
                    variant="outline-primary"
                    disabled={pagination.page <= 1}
                    onClick={() =>
                      setPagination((p) => ({
                        ...p,
                        page: Math.max(1, p.page - 1),
                      }))
                    }
                  >
                    Previous
                  </Button>
                  <Button
                    size="sm"
                    variant="outline-primary"
                    disabled={pagination.page >= pagination.totalPages}
                    onClick={() =>
                      setPagination((p) => ({
                        ...p,
                        page: Math.min(p.totalPages, p.page + 1),
                      }))
                    }
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ActivityLogDashboard;
