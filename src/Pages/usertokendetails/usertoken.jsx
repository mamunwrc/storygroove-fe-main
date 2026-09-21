import { useState, useEffect } from 'react';
import { Tabs, Tab } from 'react-bootstrap';
import { toast, Toaster } from 'react-hot-toast';
import { useSearchParams } from 'react-router-dom';

import Subscription from '../Subscription';
import Profile from './Profile';
import AgentPrompts from './AgentPrompts';
import MethodologyAdmin from './MethodologyAdmin';
import ManualInvites from './ManualInvites';
import { GoBook } from "react-icons/go";
import './tabs.css';

const Userprofile = () => {
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchParams] = useSearchParams();
  const tabToShow = searchParams.get('tab');
  const userRole = localStorage.getItem('role') || 'user';
  const isAdminOrSuperAdmin = userRole === 'admin' || userRole === 'superadmin';
  const isSuperAdmin = userRole === 'superadmin';

  useEffect(() => {
    if (error) {
      toast.error(error, {
        duration: 1000,
        position: 'top-right',
        icon: '❌',
        className: 'bg-danger text-white',
      });
      setError('');
    }
  }, [error]);

  useEffect(() => {
    if (success) {
      toast.success(success, {
        duration: 1000,
        position: 'top-right',
        icon: '✅',
        id: 'removeprofilepic',
        className: 'bg-success text-white',
      });

      setSuccess('');
    }
  }, [success]);

  return (
    <>
      <div className="border-bottom p-4 page-heading">
        <div className="d-flex align-items-center gap-2">
          <GoBook />
          My Account
        </div>
      </div>
      <div className="card-box">
        <Tabs
          defaultActiveKey={tabToShow ? tabToShow : "profile"}
          id="uncontrolled-tab-example"
          style={{ justifyContent: "center" }}
        >
          <Tab eventKey="profile" title="General">
            <Profile setError={setError} setSuccess={setSuccess} />
          </Tab>

          <Tab eventKey="subscription" title="Subscription">
            <Subscription />
          </Tab>

          {isAdminOrSuperAdmin && (
            <Tab eventKey="agent-prompts" title="Agent Prompts">
              <AgentPrompts />
            </Tab>
          )}

          {isAdminOrSuperAdmin && (
            <Tab eventKey="methodology" title="Methodology">
              <MethodologyAdmin />
            </Tab>
          )}

          {isSuperAdmin && (
            <Tab eventKey="manual-invites" title="Manual Invites">
              <ManualInvites />
            </Tab>
          )}
        </Tabs>
        <Toaster maxCount={1} position="top-right" />
      </div>
    </>
  );
};

export default Userprofile;
