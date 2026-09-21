import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { GrAppsRounded } from 'react-icons/gr';
import { MdAdminPanelSettings, MdHistory } from 'react-icons/md';
import { FaUsers } from 'react-icons/fa';
import clsx from 'clsx';
import { getAgentAccessAPI } from '../../../api/subscriptions';
import { hasOliviaAccess, hasEllisAccess, isSubscriptionPaused } from '../../../utils';
import CommunityModal from '../../Modal/CommunityModal';
import OliviaPurchaseModal from '../../Modal/OliviaPurchaseModal';
import EllisPurchaseModal from '../../Modal/EllisPurchaseModal';

const NavLinksContainer = ({ showMenu, triggerUpdate }) => {
  const navigate = useNavigate();
  const [subscriptionData, setSubscriptionData] = useState(null);
  const [, setLoadingSubscription] = useState(true);
  const [showCommunityModal, setShowCommunityModal] = useState(false);
  const [showOliviaPurchaseModal, setShowOliviaPurchaseModal] = useState(false);
  const [showEllisPurchaseModal, setShowEllisPurchaseModal] = useState(false);

  const refreshAgentAccess = async () => {
    try {
      const data = await getAgentAccessAPI();
      setSubscriptionData(data);
    } catch (error) {
      console.error("Error refreshing subscription:", error);
    }
  };

  useEffect(() => {
    const fetchSubscription = async () => {
      try {
        const data = await getAgentAccessAPI();
        setSubscriptionData(data);
      } catch (error) {
        console.error("Error fetching subscription:", error);
      } finally {
        setLoadingSubscription(false);
      }
    };
    fetchSubscription();
  }, [triggerUpdate]);

  const oliviaAccessible = hasOliviaAccess(subscriptionData);
  const ellisAccessible = hasEllisAccess(subscriptionData);
  const communityPaused = isSubscriptionPaused(subscriptionData);
  const showCommunityLink = oliviaAccessible || ellisAccessible || communityPaused;
  const isSuperAdmin = localStorage.getItem('role') === 'superadmin';

  useEffect(() => {
    if (communityPaused) setShowCommunityModal(false);
  }, [communityPaused]);

  const personas = [
    {
      id: 'project-list',
      name: 'Dashboard',
      icon: <GrAppsRounded />,
      path: '/dashboard',
    },
    {
      id: 'story-starter',
      name: 'Story Starter',
      image: '/assets/images/Simone-Avatar.jpg',
      path: '#',
      action: () =>
        navigate('/dashboard?view=projects&agent=simone', { replace: false }),
    },
    {
      id: 'plot-strategist',
      name: 'Plot Strategist',
      image: '/assets/images/Olivia-Avatar.jpg',
      path: '#',
      action: () => {
        if (oliviaAccessible) {
          navigate('/dashboard?view=projects&agent=olivia', { replace: false });
        } else {
          setShowOliviaPurchaseModal(true);
        }
      },
    },
    {
      id: 'developmental-editor',
      name: 'Developmental Editor',
      image: '/assets/images/Ellis-Avatar.jpg',
      path: '#',
      action: () => {
        if (ellisAccessible) {
          navigate('/dashboard?view=projects&agent=ellis', { replace: false });
        } else {
          setShowEllisPurchaseModal(true);
        }
      },
    },
  ];

  return (
    <div className="nav-links-container">
      <div className="nav-links-list">
        {personas.map((persona) => (
          <div key={persona.id} className="nav-link-wrapper">
            {persona.path === '#' || persona.disabled ? (
              <div
                className={clsx('nav-link-item', {
                  'nav-link-expanded': showMenu,
                  'nav-link-collapsed': !showMenu,
                  'nav-link-disabled': persona.disabled,
                })}
                onClick={persona.action && !persona.disabled ? persona.action : undefined}
                style={{ 
                  cursor: persona.action && !persona.disabled ? 'pointer' : 'not-allowed',
                  opacity: persona.disabled ? 0.5 : 1
                }}
              >
                {persona.image ? (
                  <img
                    src={persona.image}
                    alt={persona.name}
                    className="nav-link-avatar"
                    onError={(e) => {
                      e.target.src = '/assets/images/avatar.jpg';
                    }}
                  />
                ) : (
                  <div className="nav-link-icon">{persona.icon}</div>
                )}
                {showMenu && <span className="nav-link-text">{persona.name}</span>}
              </div>
            ) : (
              <NavLink
                to={persona.path}
                className={({ isActive }) =>
                  clsx('nav-link-item', {
                    'nav-link-active': isActive,
                    'nav-link-expanded': showMenu,
                    'nav-link-collapsed': !showMenu,
                  })
                }
              >
                {persona.image ? (
                  <img
                    src={persona.image}
                    alt={persona.name}
                    className="nav-link-avatar"
                    onError={(e) => {
                      e.target.src = '/assets/images/avatar.jpg';
                    }}
                  />
                ) : (
                  <div className="nav-link-icon">{persona.icon}</div>
                )}
                {showMenu && <span className="nav-link-text">{persona.name}</span>}
              </NavLink>
            )}
          </div>
        ))}

        {showCommunityLink && (
          <>
            <div className="nav-link-wrapper">
              <button
                type="button"
                className={clsx('nav-link-item', 'nav-link-item--button', {
                  'nav-link-expanded': showMenu,
                  'nav-link-collapsed': !showMenu,
                  'nav-link-disabled': communityPaused,
                })}
                title={
                  communityPaused
                    ? 'Community is on hold while your membership is paused'
                    : 'Join StoryGroove Writers Community'
                }
                aria-label={
                  communityPaused
                    ? 'Community is on hold while your membership is paused'
                    : 'Join StoryGroove Writers Community'
                }
                disabled={communityPaused}
                onClick={() => {
                  if (communityPaused) return;
                  setShowCommunityModal(true);
                }}
              >
                <div className="nav-link-icon">
                  <FaUsers />
                </div>
                {showMenu && <span className="nav-link-text">Community</span>}
              </button>
            </div>

            <CommunityModal
              show={showCommunityModal && !communityPaused}
              paused={communityPaused}
              onHide={() => setShowCommunityModal(false)}
            />
          </>
        )}

        {isSuperAdmin && (
          <>
            <div
              className="nav-link-divider"
              style={{
                borderTop: '1px solid rgba(255,255,255,0.15)',
                margin: showMenu ? '8px 12px' : '8px 6px',
              }}
            />
            <div className="nav-link-wrapper">
              <NavLink
                to="/dashboard/admin/api-usage"
                className={({ isActive }) =>
                  clsx('nav-link-item', {
                    'nav-link-active': isActive,
                    'nav-link-expanded': showMenu,
                    'nav-link-collapsed': !showMenu,
                  })
                }
              >
                <div className="nav-link-icon">
                  <MdAdminPanelSettings />
                </div>
                {showMenu && <span className="nav-link-text">API Usage</span>}
              </NavLink>
            </div>
            <div className="nav-link-wrapper">
              <NavLink
                to="/dashboard/admin/activity-logs"
                className={({ isActive }) =>
                  clsx('nav-link-item', {
                    'nav-link-active': isActive,
                    'nav-link-expanded': showMenu,
                    'nav-link-collapsed': !showMenu,
                  })
                }
              >
                <div className="nav-link-icon">
                  <MdHistory />
                </div>
                {showMenu && <span className="nav-link-text">Activity log</span>}
              </NavLink>
            </div>
          </>
        )}
      </div>

      <OliviaPurchaseModal
        show={showOliviaPurchaseModal}
        onHide={() => setShowOliviaPurchaseModal(false)}
      />
      <EllisPurchaseModal
        show={showEllisPurchaseModal}
        onHide={() => setShowEllisPurchaseModal(false)}
        onUpgraded={refreshAgentAccess}
      />
    </div>
  );
};

export default NavLinksContainer;
