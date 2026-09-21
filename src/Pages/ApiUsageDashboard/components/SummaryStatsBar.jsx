import React from "react";
import { Row, Col } from "react-bootstrap";
import {
  FiUsers,
  FiActivity,
  FiSlash,
  FiAlertTriangle,
  FiDollarSign,
  FiTrendingUp,
} from "react-icons/fi";

const formatUSD = (value) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value ?? 0);

const formatNumber = (value) => (value ?? 0).toLocaleString();

const secondaryCards = [
  {
    key: "totalActiveUsers",
    label: "Active Users",
    icon: <FiUsers size={20} />,
    accent: "blue",
    format: formatNumber,
  },
  {
    key: "totalPrompts",
    label: "Requests · This Month",
    icon: <FiActivity size={20} />,
    accent: "teal",
    format: formatNumber,
  },
  {
    key: "totalBlockedUsers",
    label: "Blocked Users",
    icon: <FiSlash size={20} />,
    accent: "red",
    format: formatNumber,
  },
  {
    key: "rateLimitHitsToday",
    label: "Rate Limit Hits · Today",
    icon: <FiAlertTriangle size={20} />,
    accent: "amber",
    format: formatNumber,
  },
];

const currentMonthLabel = () =>
  new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" });

const SummaryStatsBar = ({ stats, loading }) => {
  if (loading) {
    return (
      <>
        <div className="cost-hero-card cost-hero-skeleton mb-3">
          <div className="cost-hero-left">
            <div className="skeleton-line skeleton-label" />
            <div className="skeleton-line skeleton-hero-value" />
            <div className="skeleton-line skeleton-help" />
          </div>
          <div className="cost-hero-icon skeleton-rect" />
        </div>
        <Row className="g-3 mb-4">
          {Array.from({ length: 4 }).map((_, idx) => (
            <Col key={idx} xs={12} sm={6} lg={3}>
              <div className="stat-card stat-card-modern stat-card-skeleton">
                <div className="stat-card-header">
                  <div className="stat-icon-skeleton skeleton-rect" />
                </div>
                <div className="skeleton-line skeleton-label" />
                <div className="skeleton-line skeleton-value" />
              </div>
            </Col>
          ))}
        </Row>
      </>
    );
  }

  if (!stats) return null;

  const totalCost = stats.totalCostThisMonth ?? 0;
  const totalPrompts = stats.totalPrompts ?? 0;
  const avgPerRequest = totalPrompts > 0 ? totalCost / totalPrompts : 0;

  return (
    <>
      <div className="cost-hero-card mb-3">
        <div className="cost-hero-left">
          <div className="cost-hero-label">
            <FiDollarSign size={14} />
            Estimated Cost · {currentMonthLabel()}
          </div>
          <div className="cost-hero-value">{formatUSD(totalCost)}</div>
          <div className="cost-hero-help">
            <FiTrendingUp size={13} />
            <span>
              {formatNumber(totalPrompts)} request
              {totalPrompts === 1 ? "" : "s"} · avg{" "}
              {formatUSD(avgPerRequest)} per request
            </span>
          </div>
        </div>
        <div className="cost-hero-icon">
          <FiDollarSign size={28} />
        </div>
      </div>

      <Row className="g-3 mb-4">
        {secondaryCards.map((card) => (
          <Col key={card.key} xs={12} sm={6} lg={3}>
            <div
              className={`stat-card stat-card-modern accent-${card.accent}`}
            >
              <div className="stat-card-header">
                <div className="stat-card-icon">{card.icon}</div>
                <div className="stat-card-label">{card.label}</div>
              </div>
              <div className="stat-card-value">
                {card.format(stats[card.key] ?? 0)}
              </div>
            </div>
          </Col>
        ))}
      </Row>
    </>
  );
};

export default SummaryStatsBar;
