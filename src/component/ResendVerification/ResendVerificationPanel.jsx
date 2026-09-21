import React, { useState } from "react";
import { Button, Form } from "react-bootstrap";
import { resendVerificationEmail } from "../../api/user";

const SUPPORT_EMAIL = "support@storygroove.ai";

const ResendVerificationPanel = ({
  initialEmail = "",
  compact = false,
  onSuccess,
}) => {
  const [email, setEmail] = useState(initialEmail);
  const [status, setStatus] = useState({ type: null, text: "" });
  const [submitting, setSubmitting] = useState(false);

  const handleResend = async (e) => {
    e?.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) {
      setStatus({ type: "error", text: "Please enter your email address." });
      return;
    }

    setSubmitting(true);
    setStatus({ type: null, text: "" });

    const result = await resendVerificationEmail(trimmed);
    setSubmitting(false);

    if (result.success) {
      const text =
        result.message ||
        "If this email is registered, a new verification link has been sent.";
      setStatus({ type: "success", text });
      onSuccess?.(trimmed);
      return;
    }

    if (result.code === "EMAIL_COOLDOWN") {
      setStatus({
        type: "warning",
        text: result.message || "Please wait before requesting another email.",
      });
      return;
    }

    if (result.code === "EMAIL_DELIVERY_FAILED") {
      setStatus({
        type: "error",
        text:
          result.message ||
          `We could not send the email. Please try again later or contact ${SUPPORT_EMAIL}.`,
      });
      return;
    }

    setStatus({
      type: "error",
      text: result.message || "Could not resend verification email.",
    });
  };

  return (
    <div className={compact ? "mt-3" : ""}>
      {!compact && (
        <p className="mb-2">
          Didn&apos;t get the email? Check spam, then resend the verification link
          below.
        </p>
      )}
      <Form onSubmit={handleResend}>
        <Form.Group className="mb-2">
          <Form.Label className={compact ? "text-white" : ""}>Email</Form.Label>
          <Form.Control
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
            disabled={submitting}
          />
        </Form.Group>
        <Button
          type="submit"
          variant="primary"
          className="w-100 mb-2"
          disabled={submitting}
        >
          {submitting ? "Sending…" : "Resend verification email"}
        </Button>
      </Form>
      {status.text && (
        <p
          className={`small mb-2 ${
            status.type === "success"
              ? "text-success"
              : status.type === "warning"
                ? "text-warning"
                : "text-danger"
          }`}
        >
          {status.text}
        </p>
      )}
      <p className="small mb-0">
        Still stuck?{" "}
        <a href={`mailto:${SUPPORT_EMAIL}`}>Contact {SUPPORT_EMAIL}</a>
      </p>
    </div>
  );
};

export default ResendVerificationPanel;
