import React, { useState, useEffect, useCallback } from "react";
import { Tabs, Tab } from "react-bootstrap";
import toast, { Toaster } from "react-hot-toast";
import { MdAdminPanelSettings } from "react-icons/md";
import SummaryStatsBar from "./components/SummaryStatsBar";
import UserUsageTable from "./components/UserUsageTable";
import UserDetailPanel from "./components/UserDetailPanel";
import GlobalSettingsPanel from "./components/GlobalSettingsPanel";
import RateLimitHitLog from "./components/RateLimitHitLog";
import {
  getSummaryStats,
  getUserUsageList,
  getUserCostHistory,
  getRateLimitEvents,
  blockUser,
  unblockUser,
  updateUserLimit,
  getGlobalSettings,
  updateGlobalSettings,
  unlockUserLoginAPI,
} from "../../api/apiUsage";
import "../../Pages/usertokendetails/tabs.css";
import "./ApiUsageDashboard.scss";

const ApiUsageDashboard = () => {
  const [summaryStats, setSummaryStats] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(true);

  const [users, setUsers] = useState([]);
  const [usersPagination, setUsersPagination] = useState(null);
  const [usersLoading, setUsersLoading] = useState(true);
  const [sortField, setSortField] = useState("totalCost");
  const [sortOrder, setSortOrder] = useState("desc");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const [selectedUser, setSelectedUser] = useState(null);
  const [historyData, setHistoryData] = useState(null);
  const [historyLoading, setHistoryLoading] = useState(false);

  const [globalSettings, setGlobalSettings] = useState(null);
  const [availablePlans, setAvailablePlans] = useState([]);
  const [settingsLoading, setSettingsLoading] = useState(true);

  const [rateLimitEvents, setRateLimitEvents] = useState([]);
  const [eventsLoading, setEventsLoading] = useState(true);

  const fetchSummary = useCallback(async () => {
    setSummaryLoading(true);
    try {
      const res = await getSummaryStats();
      setSummaryStats(res.data);
    } catch (err) {
      console.error("Failed to fetch summary:", err);
      toast.error("Failed to load summary stats");
    } finally {
      setSummaryLoading(false);
    }
  }, []);

  const fetchUsers = useCallback(async () => {
    setUsersLoading(true);
    try {
      const res = await getUserUsageList({
        page: currentPage,
        sort: sortField,
        order: sortOrder,
        search: searchQuery,
      });
      setUsers(res.data.users);
      setUsersPagination(res.data.pagination);
      return res.data.users;
    } catch (err) {
      console.error("Failed to fetch users:", err);
      toast.error("Failed to load user usage data");
      return [];
    } finally {
      setUsersLoading(false);
    }
  }, [currentPage, sortField, sortOrder, searchQuery]);

  const fetchSettings = useCallback(async () => {
    setSettingsLoading(true);
    try {
      const res = await getGlobalSettings();
      setGlobalSettings(res.data.settings);
      setAvailablePlans(res.data.availablePlans || []);
    } catch (err) {
      console.error("Failed to fetch settings:", err);
    } finally {
      setSettingsLoading(false);
    }
  }, []);

  const fetchEvents = useCallback(async () => {
    setEventsLoading(true);
    try {
      const res = await getRateLimitEvents();
      setRateLimitEvents(res.data.events);
    } catch (err) {
      console.error("Failed to fetch events:", err);
    } finally {
      setEventsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSummary();
    fetchSettings();
    fetchEvents();
  }, [fetchSummary, fetchSettings, fetchEvents]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleSelectUser = async (user) => {
    setSelectedUser(user);
    setHistoryLoading(true);
    setHistoryData(null);
    try {
      const res = await getUserCostHistory(user._id);
      setHistoryData(res.data);
    } catch (err) {
      console.error("Failed to fetch history:", err);
      toast.error("Failed to load user history");
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleBackToList = () => {
    setSelectedUser(null);
    setHistoryData(null);
    setHistoryLoading(false);
  };

  const handleBlockToggle = async (user) => {
    try {
      if (user.apiUsageStatus === "blocked") {
        await unblockUser(user._id);
        toast.success(`${user.email} unblocked`);
      } else {
        await blockUser(user._id);
        toast.success(`${user.email} blocked`);
      }
      fetchUsers();
      fetchSummary();
      if (selectedUser && selectedUser._id === user._id) {
        setSelectedUser({
          ...user,
          apiUsageStatus:
            user.apiUsageStatus === "blocked" ? "active" : "blocked",
        });
      }
    } catch (err) {
      console.error("Block/unblock failed:", err);
      toast.error("Failed to update user status");
    }
  };

  const handleUpdateLimit = async (userId, limits) => {
    try {
      await updateUserLimit(userId, limits);
      toast.success("User limits updated");
      const usersList = await fetchUsers();
      if (selectedUser && selectedUser._id === userId) {
        setHistoryLoading(true);
        try {
          const historyRes = await getUserCostHistory(userId);
          setHistoryData(historyRes.data);
          const updatedUser = usersList.find((u) => u._id === userId);
          if (updatedUser) setSelectedUser(updatedUser);
        } finally {
          setHistoryLoading(false);
        }
      }
    } catch (err) {
      console.error("Update limit failed:", err);
      toast.error("Failed to update limits");
    }
  };

  const handleUnlockLogin = async (user) => {
    try {
      await unlockUserLoginAPI(user._id);
      toast.success(`${user.email} login unlocked`);
      fetchUsers();
      if (selectedUser && selectedUser._id === user._id) {
        setSelectedUser({ ...user, failedLoginAttempts: 0, lockUntil: null });
      }
    } catch (err) {
      console.error("Unlock login failed:", err);
      toast.error("Failed to unlock account");
    }
  };

  const handleSaveGlobalSettings = async (newSettings, options = {}) => {
    try {
      const res = await updateGlobalSettings(newSettings);
      setGlobalSettings(res.data.settings || res.data);
      if (!options.silent) {
        toast.success("Global settings updated");
      }
      fetchSummary();
    } catch (err) {
      console.error("Update settings failed:", err);
      toast.error("Failed to update global settings");
      throw err;
    }
  };

  const handleSearch = (query) => {
    setSearchQuery(query);
    setCurrentPage(1);
  };

  const handleSort = (field, order) => {
    setSortField(field);
    setSortOrder(order);
    setCurrentPage(1);
  };

  return (
    <div className="storygroove-theme api-usage-dashboard">
      <div className="border-bottom p-4 page-heading">
        <div className="d-flex align-items-center gap-2">
          <MdAdminPanelSettings size={22} />
          API Usage Management
        </div>
      </div>

      <div className="card-box">
        <Tabs defaultActiveKey="overview" id="api-usage-tabs">
          <Tab eventKey="overview" title="Overview">
            <SummaryStatsBar stats={summaryStats} loading={summaryLoading} />
            <p className="section-subtext mt-2 mb-0">
              Dollar amounts are estimates based on how many AI requests were
              made and today&apos;s price per model. Open the{" "}
              <strong>Users</strong> tab to see usage by person, or{" "}
              <strong>Settings</strong> to change default limits.
            </p>
          </Tab>

          <Tab eventKey="users" title="Users">
            {selectedUser ? (
              <UserDetailPanel
                user={selectedUser}
                historyData={historyData}
                loading={historyLoading}
                onBack={handleBackToList}
                onBlockToggle={handleBlockToggle}
                onIncreaseLimitClick={handleUpdateLimit}
              />
            ) : (
              <UserUsageTable
                users={users}
                pagination={usersPagination}
                loading={usersLoading}
                onSelectUser={handleSelectUser}
                onBlockToggle={handleBlockToggle}
                onIncreaseLimitClick={handleUpdateLimit}
                onUnlockLogin={handleUnlockLogin}
                onSearch={handleSearch}
                onSort={handleSort}
                sortField={sortField}
                sortOrder={sortOrder}
                onPageChange={setCurrentPage}
              />
            )}
          </Tab>

          <Tab eventKey="rate-limit-log" title="Rate Limit Log">
            <RateLimitHitLog events={rateLimitEvents} loading={eventsLoading} />
          </Tab>

          <Tab eventKey="settings" title="Settings">
            <GlobalSettingsPanel
              settings={globalSettings}
              availablePlans={availablePlans}
              loading={settingsLoading}
              onSave={handleSaveGlobalSettings}
            />
          </Tab>
        </Tabs>
        <Toaster maxCount={1} position="top-right" />
      </div>
    </div>
  );
};

export default ApiUsageDashboard;
