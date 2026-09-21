import React, { useState, useEffect } from "react";
import { Form, Row, Col, Spinner } from "react-bootstrap";
// import CostRecomputePanel from "./CostRecomputePanel";

const GlobalSettingsPanel = ({ settings, availablePlans = [], loading, onSave }) => {
  const coverModelOptions = [
    {
      value: "gpt-image-2",
      label: "gpt-image-2",
      description: "Highest quality for final covers",
    },
    {
      value: "gpt-image-1.5",
      label: "gpt-image-1.5",
      description: "Faster lower-cost cover generation",
    },
  ];

  const [planLimits, setPlanLimits] = useState({});
  const [trialSpendLimit, setTrialSpendLimit] = useState("");
  const [fallbackSpendLimit, setFallbackSpendLimit] = useState("");
  const [rpmLimit, setRpmLimit] = useState("");
  const [rpdLimit, setRpdLimit] = useState("");
  const [tpmLimit, setTpmLimit] = useState("");
  const [tpdLimit, setTpdLimit] = useState("");
  const [simoneSessionSpendCap, setSimoneSessionSpendCap] = useState("");
  const [coverImageModel, setCoverImageModel] = useState("gpt-image-2");
  const [coverImagePartialImages, setCoverImagePartialImages] = useState("0");
  const [coverRendersPerBillingPeriod, setCoverRendersPerBillingPeriod] =
    useState("10");
  const [modelSaveState, setModelSaveState] = useState("idle");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (settings) {
      setTrialSpendLimit(settings.trialSpendLimit ?? "");
      setFallbackSpendLimit(settings.fallbackSpendLimit ?? "");
      setRpmLimit(settings.defaultRpmLimit ?? "");
      setRpdLimit(settings.defaultRpdLimit ?? "");
      setTpmLimit(settings.defaultTpmLimit ?? "");
      setTpdLimit(settings.defaultTpdLimit ?? "");
      setSimoneSessionSpendCap(
        settings.simoneSessionSpendCap != null
          ? String(settings.simoneSessionSpendCap)
          : "3"
      );
      setCoverImageModel(settings.coverImageModel || "gpt-image-2");
      setCoverImagePartialImages(
        settings.coverImagePartialImages != null
          ? String(settings.coverImagePartialImages)
          : "0"
      );
      setCoverRendersPerBillingPeriod(
        settings.coverRendersPerBillingPeriod != null
          ? String(settings.coverRendersPerBillingPeriod)
          : "10"
      );

      const existing = {};
      (settings.planSpendLimits || []).forEach((p) => {
        existing[p.priceId] = p.monthlySpendLimit ?? "";
      });
      setPlanLimits(existing);
    }
  }, [settings]);

  const handlePlanLimitChange = (priceId, value) => {
    setPlanLimits((prev) => ({ ...prev, [priceId]: value }));
  };

  const handleCoverModelSelect = async (model) => {
    if (!model || model === coverImageModel || saving) return;
    const previousModel = coverImageModel;
    setCoverImageModel(model);
    setModelSaveState("saving");
    try {
      await onSave({ coverImageModel: model }, { silent: true });
      setModelSaveState("saved");
      setTimeout(() => setModelSaveState("idle"), 1200);
    } catch (error) {
      setCoverImageModel(previousModel);
      setModelSaveState("error");
      setTimeout(() => setModelSaveState("idle"), 1800);
    }
  };

  const handleSave = async () => {
    setSaving(true);

    const planSpendLimits = availablePlans
      .filter((p) => planLimits[p.priceId] !== "" && planLimits[p.priceId] != null)
      .map((p) => ({
        priceId: p.priceId,
        planName: p.name,
        monthlySpendLimit: Number(planLimits[p.priceId]),
      }));

    const payload = { planSpendLimits };
    if (trialSpendLimit !== "") payload.trialSpendLimit = Number(trialSpendLimit);
    if (fallbackSpendLimit !== "") payload.fallbackSpendLimit = Number(fallbackSpendLimit);
    if (rpmLimit !== "") payload.defaultRpmLimit = Number(rpmLimit);
    if (rpdLimit !== "") payload.defaultRpdLimit = Number(rpdLimit);
    if (tpmLimit !== "") payload.defaultTpmLimit = Number(tpmLimit);
    if (tpdLimit !== "") payload.defaultTpdLimit = Number(tpdLimit);

    const capRaw =
      simoneSessionSpendCap === "" ? 3 : Number(simoneSessionSpendCap);
    payload.simoneSessionSpendCap =
      Number.isFinite(capRaw) && capRaw >= 0 ? capRaw : 3;
    payload.coverImageModel = coverImageModel || "gpt-image-2";
    const partialRaw =
      coverImagePartialImages === "" ? 0 : Number(coverImagePartialImages);
    payload.coverImagePartialImages =
      Number.isFinite(partialRaw) && partialRaw >= 0
        ? Math.min(3, Math.floor(partialRaw))
        : 0;
    const coverCapRaw =
      coverRendersPerBillingPeriod === ""
        ? 10
        : Number(coverRendersPerBillingPeriod);
    payload.coverRendersPerBillingPeriod =
      Number.isFinite(coverCapRaw) && coverCapRaw >= 0 ? Math.floor(coverCapRaw) : 10;

    await onSave(payload);
    setSaving(false);
  };

  return (
    <div style={{ maxWidth: 720 }}>
      <h3 className="section-heading">Settings</h3>

      <div className={`section-panel ${loading ? "settings-skeleton" : ""}`}>
        {loading ? (
          <>
            <div className="skeleton-line skeleton-label" />
            <div className="skeleton-line skeleton-input" />
            <div className="skeleton-line skeleton-help" />
            <div className="mt-4">
              <div className="skeleton-line skeleton-label" />
              <div className="skeleton-line skeleton-input" />
            </div>
            <div className="mt-3">
              <div className="skeleton-line skeleton-input" />
            </div>
            <div className="mt-3">
              <div className="skeleton-line skeleton-input" />
            </div>
            <div className="mt-3 d-flex justify-content-end">
              <div className="skeleton-button" />
            </div>
          </>
        ) : (
          <>
            {/* ── Monthly Spend Limits by Plan ── */}
            <h3
              className="section-heading"
              style={{ fontSize: 16, marginBottom: 8 }}
            >
              Monthly Spend Limits by Plan
            </h3>
            <p style={{ fontSize: 13, color: "#999", marginBottom: 16 }}>
              Set the maximum monthly API spend for each subscription tier.
              Users on a plan inherit its limit unless a custom override is set
              on their profile.
            </p>

            {availablePlans.length > 0 ? (
              <Row className="g-3 mb-3">
                {availablePlans.map((plan) => (
                  <Col xs={12} sm={6} key={plan.priceId}>
                    <Form.Label>
                      {plan.name}{" "}
                      <span style={{ fontWeight: 400, color: "#999" }}>
                        (${plan.amount}/{plan.interval})
                      </span>
                    </Form.Label>
                    <Form.Control
                      type="number"
                      value={planLimits[plan.priceId] ?? ""}
                      onChange={(e) =>
                        handlePlanLimitChange(plan.priceId, e.target.value)
                      }
                      placeholder="$ monthly limit"
                      style={{ borderColor: "#ccd4d8" }}
                    />
                  </Col>
                ))}
              </Row>
            ) : (
              <div
                style={{
                  padding: "16px",
                  border: "1px dashed #ccd4d8",
                  borderRadius: 8,
                  color: "#999",
                  fontSize: 13,
                  marginBottom: 16,
                }}
              >
                No subscription plans found. Create plans in Stripe to
                configure per-plan spend limits.
              </div>
            )}

            <Row className="g-3">
              <Col xs={12} sm={6}>
                <Form.Label>Trial / No Plan Limit ($)</Form.Label>
                <Form.Control
                  type="number"
                  value={trialSpendLimit}
                  onChange={(e) => setTrialSpendLimit(e.target.value)}
                  placeholder="20"
                  style={{ borderColor: "#ccd4d8" }}
                />
                <Form.Text style={{ fontSize: 12, color: "#999" }}>
                  Applies to users on the 7-day free trial or with no active
                  subscription.
                </Form.Text>
              </Col>
              <Col xs={12} sm={6}>
                <Form.Label>Fallback Limit ($)</Form.Label>
                <Form.Control
                  type="number"
                  value={fallbackSpendLimit}
                  onChange={(e) => setFallbackSpendLimit(e.target.value)}
                  placeholder="50"
                  style={{ borderColor: "#ccd4d8" }}
                />
                <Form.Text style={{ fontSize: 12, color: "#999" }}>
                  Applies to subscribed users whose plan has no limit configured
                  above.
                </Form.Text>
              </Col>
            </Row>

            {/* ── Book Cover Image Model ── */}
            <h3
              className="section-heading mt-4"
              style={{ fontSize: 16, marginBottom: 8 }}
            >
              Book Cover Generation
            </h3>
            <p style={{ fontSize: 13, color: "#999", marginBottom: 16 }}>
              Choose which OpenAI image model is used for novel cover generation.
            </p>
            <Row className="g-3">
              <Col xs={12} sm={6}>
                <Form.Label>Book Cover Image Model</Form.Label>
                <div
                  style={{
                    border: "1px solid #ccd4d8",
                    borderRadius: 12,
                    padding: 6,
                    background: "#f8fafb",
                  }}
                >
                  {coverModelOptions.map((option) => {
                    const isActive = coverImageModel === option.value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => handleCoverModelSelect(option.value)}
                        style={{
                          width: "100%",
                          border: "none",
                          borderRadius: 8,
                          textAlign: "left",
                          padding: "10px 12px",
                          marginBottom:
                            option.value ===
                            coverModelOptions[coverModelOptions.length - 1].value
                              ? 0
                              : 6,
                          background: isActive ? "#ffffff" : "transparent",
                          boxShadow: isActive
                            ? "0 1px 3px rgba(16, 24, 40, 0.12)"
                            : "none",
                          outline: "none",
                          cursor: "pointer",
                        }}
                      >
                        <div
                          style={{
                            fontSize: 13,
                            fontWeight: isActive ? 600 : 500,
                            color: "#1f2937",
                          }}
                        >
                          {option.label}
                        </div>
                        <div
                          style={{
                            fontSize: 12,
                            marginTop: 2,
                            color: "#6b7280",
                          }}
                        >
                          {option.description}
                        </div>
                      </button>
                    );
                  })}
                </div>
                <Form.Text style={{ fontSize: 12, color: "#999" }}>
                  Used by backend cover generation for novels.
                </Form.Text>
                {modelSaveState === "saving" && (
                  <div style={{ fontSize: 12, color: "#6b7280", marginTop: 6 }}>
                    Saving model...
                  </div>
                )}
                {modelSaveState === "saved" && (
                  <div style={{ fontSize: 12, color: "#059669", marginTop: 6 }}>
                    Saved
                  </div>
                )}
                {modelSaveState === "error" && (
                  <div style={{ fontSize: 12, color: "#dc2626", marginTop: 6 }}>
                    Failed to save. Please try again.
                  </div>
                )}
              </Col>
              <Col xs={12} sm={6}>
                <Form.Label>
                  Partial image previews: {coverImagePartialImages}
                </Form.Label>
                <Form.Range
                  min={0}
                  max={3}
                  step={1}
                  value={Number(coverImagePartialImages) || 0}
                  onChange={(e) => setCoverImagePartialImages(e.target.value)}
                  style={{ marginTop: 4 }}
                />
                <Form.Text style={{ fontSize: 12, color: "#999" }}>
                  0 = disabled (current behavior). Each partial adds ~100 image
                  output tokens (~$0.003) per render.
                </Form.Text>
              </Col>
              <Col xs={12} sm={6}>
                <Form.Label>Cover renders per billing period</Form.Label>
                <Form.Control
                  type="number"
                  min={0}
                  step={1}
                  value={coverRendersPerBillingPeriod}
                  onChange={(e) =>
                    setCoverRendersPerBillingPeriod(e.target.value)
                  }
                  placeholder="10"
                  style={{ borderColor: "#ccd4d8" }}
                />
                <Form.Text style={{ fontSize: 12, color: "#999" }}>
                  Per user across all novels. Each successful image render counts
                  once. Chat is unlimited. Use 0 for unlimited (testing).
                </Form.Text>
              </Col>
            </Row>

            {/* ── SimoneAI® Story Starter — per-thread spend cap ── */}
            <h3
              className="section-heading mt-4"
              style={{ fontSize: 16, marginBottom: 8 }}
            >
              SimoneAI® — Story Starter session
            </h3>
            <p style={{ fontSize: 13, color: "#999", marginBottom: 16 }}>
              Cap is applied per Simone chat thread using the same estimated
              cost as API usage logs. When cumulative cost in a thread exceeds
              this amount, the session pauses with the EllisAI® scope message.
            </p>
            <Row className="g-3">
              <Col xs={12} sm={6}>
                <Form.Label>Per-session spend cap ($)</Form.Label>
                <Form.Control
                  type="number"
                  min={0}
                  step="0.01"
                  value={simoneSessionSpendCap}
                  onChange={(e) => setSimoneSessionSpendCap(e.target.value)}
                  placeholder="3"
                  style={{ borderColor: "#ccd4d8" }}
                />
                <Form.Text style={{ fontSize: 12, color: "#999" }}>
                  Default 3. Set to 0 to disable the cap (sessions never pause for
                  spend). Use a small value (e.g. 0.10) for staging tests.
                </Form.Text>
              </Col>
            </Row>

            {/* ── Default Per-User Rate Limits ── */}
            <h3
              className="section-heading mt-4"
              style={{ fontSize: 16, marginBottom: 8 }}
            >
              Default Per-User Rate Limits
            </h3>
            <p style={{ fontSize: 13, color: "#999", marginBottom: 16 }}>
              These limits apply to every user unless a custom override is set on
              their profile. Each user is rate-limited individually.
            </p>
            <Row className="g-3">
              <Col xs={12} sm={6}>
                <Form.Label>RPM Limit</Form.Label>
                <Form.Control
                  type="number"
                  value={rpmLimit}
                  onChange={(e) => setRpmLimit(e.target.value)}
                  placeholder="Requests per minute per user"
                  style={{ borderColor: "#ccd4d8" }}
                />
              </Col>
              <Col xs={12} sm={6}>
                <Form.Label>RPD Limit</Form.Label>
                <Form.Control
                  type="number"
                  value={rpdLimit}
                  onChange={(e) => setRpdLimit(e.target.value)}
                  placeholder="Requests per day per user"
                  style={{ borderColor: "#ccd4d8" }}
                />
              </Col>
              <Col xs={12} sm={6}>
                <Form.Label>TPM Limit</Form.Label>
                <Form.Control
                  type="number"
                  value={tpmLimit}
                  onChange={(e) => setTpmLimit(e.target.value)}
                  placeholder="Tokens per minute per user"
                  style={{ borderColor: "#ccd4d8" }}
                />
              </Col>
              <Col xs={12} sm={6}>
                <Form.Label>TPD Limit</Form.Label>
                <Form.Control
                  type="number"
                  value={tpdLimit}
                  onChange={(e) => setTpdLimit(e.target.value)}
                  placeholder="Tokens per day per user"
                  style={{ borderColor: "#ccd4d8" }}
                />
              </Col>
            </Row>

            <div
              className="d-flex justify-content-between align-items-center mt-4 pt-3"
              style={{ borderTop: "1px solid #e8e8e8" }}
            >
              {settings?.updatedAt && (
                <span style={{ fontSize: 12, color: "#999" }}>
                  Last updated:{" "}
                  {new Date(settings.updatedAt).toLocaleString()}
                </span>
              )}
              <button
                className="sg-btn-fill ms-auto"
                onClick={handleSave}
                disabled={saving}
                style={{ minWidth: 160 }}
              >
                {saving ? (
                  <Spinner animation="border" size="sm" />
                ) : (
                  "Save Settings"
                )}
              </button>
            </div>
          </>
        )}
      </div>

      {/* {!loading && (
        <div className="section-panel">
          <h3
            className="section-heading"
            style={{ fontSize: 16, marginBottom: 8 }}
          >
            Maintenance
          </h3>
          <p style={{ fontSize: 13, color: "#999", marginBottom: 16 }}>
            Tools to fix or refresh cost numbers on the dashboard when pricing
            changes.
          </p>
          <CostRecomputePanel />
        </div>
      )} */}
    </div>
  );
};

export default GlobalSettingsPanel;
