import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button, Form, Spinner } from "react-bootstrap";
import { toast } from "react-hot-toast";
import {
  MdContentCopy,
  MdEmail,
  MdLink,
  MdPersonSearch,
  MdSend,
} from "react-icons/md";

import {
  createManualInviteCheckoutAPI,
  getPriceListFromStripeAPI,
  sendManualInviteCheckoutEmailAPI,
} from "../../api/subscriptions";
import { getAllUsersAdminAPI } from "../../api/user";
import "./ManualInvites.css";

const formatPriceLabel = (price) => {
  if (!price) return "";
  const amount =
    typeof price.unit_amount === "number"
      ? (price.unit_amount / 100).toLocaleString(undefined, {
          style: "currency",
          currency: (price.currency || "USD").toUpperCase(),
        })
      : "";
  const interval = price.recurring?.interval
    ? `/${price.recurring.interval}`
    : "";
  // Prefer BE-derived clean name (e.g. "Builder · Monthly"); never render the raw price id.
  const name =
    price.displayName ||
    price.nickname ||
    (price.tier && price.intervalLabel
      ? `${price.tier} · ${price.intervalLabel}`
      : "Subscription plan");
  return amount ? `${name} — ${amount}${interval}` : name;
};

const formatUserLabel = (user) => {
  if (!user) return "";
  const name = `${user.fname || ""} ${user.lname || ""}`.trim();
  return name ? `${name} <${user.email}>` : user.email;
};

const ManualInvites = () => {
  const [users, setUsers] = useState([]);
  const [userSearch, setUserSearch] = useState("");
  const [userPage, setUserPage] = useState(1);
  const [userHits, setUserHits] = useState(0);
  const [usersLoading, setUsersLoading] = useState(false);
  const userSearchDebounceRef = useRef(null);

  const [selectedUserId, setSelectedUserId] = useState("");
  const [prices, setPrices] = useState([]);
  const [pricesLoading, setPricesLoading] = useState(false);
  const [selectedPriceId, setSelectedPriceId] = useState("");

  const [generating, setGenerating] = useState(false);
  const [emailing, setEmailing] = useState(false);
  const [result, setResult] = useState(null);

  const fetchUsers = useCallback(
    async ({ page = 1, search = "", append = false } = {}) => {
      setUsersLoading(true);
      const res = await getAllUsersAdminAPI({ page, limit: 25, search });
      setUsersLoading(false);
      if (!res.success) {
        toast.error(res.message || "Failed to load users");
        return;
      }
      const payload = res.data || {};
      const incoming = Array.isArray(payload.user) ? payload.user : [];
      setUsers((prev) => (append ? [...prev, ...incoming] : incoming));
      setUserHits(Number(payload.nbhits) || 0);
      setUserPage(Number(payload.page) || page);
    },
    []
  );

  const fetchPrices = useCallback(async () => {
    setPricesLoading(true);
    try {
      const res = await getPriceListFromStripeAPI();
      const list = Array.isArray(res?.priceList) ? res.priceList : [];
      setPrices(list);
    } catch (err) {
      console.error("Failed to load price list:", err);
      toast.error("Failed to load subscription plans");
    } finally {
      setPricesLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchUsers({ page: 1, search: "" });
    void fetchPrices();
  }, [fetchUsers, fetchPrices]);

  // Debounced search.
  useEffect(() => {
    if (userSearchDebounceRef.current) {
      clearTimeout(userSearchDebounceRef.current);
    }
    userSearchDebounceRef.current = setTimeout(() => {
      void fetchUsers({ page: 1, search: userSearch });
    }, 350);
    return () => {
      if (userSearchDebounceRef.current) {
        clearTimeout(userSearchDebounceRef.current);
      }
    };
  }, [userSearch, fetchUsers]);

  const selectedUser = useMemo(
    () => users.find((u) => u._id === selectedUserId) || null,
    [users, selectedUserId]
  );

  const canLoadMoreUsers = users.length < userHits;

  const handleGenerate = async () => {
    if (!selectedUserId || !selectedPriceId) {
      toast.error("Select a user and a plan first");
      return;
    }
    setGenerating(true);
    setResult(null);
    try {
      const data = await createManualInviteCheckoutAPI({
        userId: selectedUserId,
        priceId: selectedPriceId,
      });
      setResult(data);
      toast.success("Checkout link generated");
    } catch (err) {
      console.error("Generate link failed:", err);
      const message =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to generate checkout link";
      toast.error(message);
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = async () => {
    if (!result?.url) return;
    try {
      await navigator.clipboard.writeText(result.url);
      toast.success("Link copied to clipboard");
    } catch {
      toast.error("Couldn't copy — please copy manually");
    }
  };

  const handleEmail = async () => {
    if (!result?.url || !selectedUserId) return;
    setEmailing(true);
    try {
      const data = await sendManualInviteCheckoutEmailAPI({
        userId: selectedUserId,
        url: result.url,
        priceId: result.priceId || selectedPriceId,
      });
      toast.success(data?.message || "Invite email sent");
    } catch (err) {
      console.error("Send invite email failed:", err);
      const message =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to send invite email";
      toast.error(message);
    } finally {
      setEmailing(false);
    }
  };

  const resetSelection = () => {
    setResult(null);
    setSelectedPriceId("");
  };

  return (
    <div className="manual-invites">
      <div className="manual-invites__shell">
        <section className="manual-invites__hero">
          <div className="manual-invites__hero-accent" aria-hidden />
          <div className="manual-invites__hero-body">
            <div className="manual-invites__hero-icon" aria-hidden>
              <MdLink />
            </div>
            <div className="manual-invites__hero-text">
              <h4 className="manual-invites__title">Manual invites</h4>
              <p className="manual-invites__subtitle">
                Generate a Stripe Checkout link on behalf of a specific user and
                share it directly — or email it from StoryGroove.
              </p>
            </div>
          </div>
        </section>

        <div className="manual-invites__card">
          <div className="manual-invites__form-row">
            <Form.Group className="manual-invites__form-group">
              <Form.Label className="manual-invites__label">
                <MdPersonSearch aria-hidden /> Find customer
              </Form.Label>
              <Form.Control
                type="search"
                placeholder="Search by email…"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="manual-invites__input"
              />
            </Form.Group>

            <Form.Group className="manual-invites__form-group">
              <Form.Label className="manual-invites__label">
                Select customer
              </Form.Label>
              <Form.Select
                value={selectedUserId}
                onChange={(e) => {
                  setSelectedUserId(e.target.value);
                  setResult(null);
                }}
                disabled={usersLoading}
                className="manual-invites__input"
              >
                <option value="">
                  {usersLoading
                    ? "Loading users…"
                    : users.length
                      ? "— pick a customer —"
                      : "No matching users"}
                </option>
                {users.map((u) => (
                  <option key={u._id} value={u._id}>
                    {formatUserLabel(u)}
                    {u.status && u.status !== "active"
                      ? ` (status: ${u.status})`
                      : ""}
                  </option>
                ))}
              </Form.Select>
              <div className="manual-invites__hint">
                Showing {users.length} of {userHits} matching user
                {userHits === 1 ? "" : "s"}.
                {canLoadMoreUsers && (
                  <Button
                    variant="link"
                    size="sm"
                    className="manual-invites__inline-action"
                    onClick={() =>
                      void fetchUsers({
                        page: userPage + 1,
                        search: userSearch,
                        append: true,
                      })
                    }
                    disabled={usersLoading}
                  >
                    Load more
                  </Button>
                )}
              </div>
            </Form.Group>

            <Form.Group className="manual-invites__form-group">
              <Form.Label className="manual-invites__label">
                Subscription plan
              </Form.Label>
              <Form.Select
                value={selectedPriceId}
                onChange={(e) => {
                  setSelectedPriceId(e.target.value);
                  setResult(null);
                }}
                disabled={pricesLoading}
                className="manual-invites__input"
              >
                <option value="">
                  {pricesLoading
                    ? "Loading plans…"
                    : prices.length
                      ? "— pick a plan —"
                      : "No plans configured"}
                </option>
                {prices.map((price) => (
                  <option key={price.id} value={price.id}>
                    {formatPriceLabel(price)}
                  </option>
                ))}
              </Form.Select>
              <div className="manual-invites__hint">
                One-time prices (Simone) are intentionally excluded from this list.
              </div>
            </Form.Group>
          </div>

          <div className="manual-invites__actions">
            <Button
              variant="outline-secondary"
              onClick={resetSelection}
              disabled={generating || emailing}
            >
              Reset
            </Button>
            <Button
              variant="primary"
              onClick={() => void handleGenerate()}
              disabled={generating || !selectedUserId || !selectedPriceId}
            >
              {generating ? (
                <>
                  <Spinner size="sm" animation="border" /> Generating…
                </>
              ) : (
                <>
                  <MdLink aria-hidden /> Generate checkout link
                </>
              )}
            </Button>
          </div>
        </div>

        {result?.url && (
          <div className="manual-invites__result">
            <div className="manual-invites__result-header">
              <h5 className="manual-invites__result-title">
                Invite link ready
              </h5>
              {selectedUser && (
                <p className="manual-invites__result-meta">
                  For: <strong>{formatUserLabel(selectedUser)}</strong>
                </p>
              )}
            </div>

            <div className="manual-invites__result-url">
              <a
                href={result.url}
                target="_blank"
                rel="noopener noreferrer"
                className="manual-invites__result-link"
              >
                {result.url}
              </a>
            </div>

            <div className="manual-invites__result-actions">
              <Button
                variant="outline-primary"
                onClick={() => void handleCopy()}
              >
                <MdContentCopy aria-hidden /> Copy link
              </Button>
              <Button
                variant="primary"
                onClick={() => void handleEmail()}
                disabled={emailing || !selectedUser?.email}
              >
                {emailing ? (
                  <>
                    <Spinner size="sm" animation="border" /> Sending…
                  </>
                ) : (
                  <>
                    <MdEmail aria-hidden /> Email link to user
                  </>
                )}
              </Button>
            </div>

            <p className="manual-invites__result-footnote">
              <MdSend aria-hidden /> Stripe Checkout sessions typically expire after 24 hours.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ManualInvites;
