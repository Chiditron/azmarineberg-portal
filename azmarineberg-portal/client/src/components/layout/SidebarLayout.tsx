import { useState, useRef, useEffect } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../services/api';
import SignOutConfirmDialog from '../SignOutConfirmDialog';

const SIDEBAR_WIDTH_EXPANDED = 256;
const SIDEBAR_WIDTH_COLLAPSED = 72;

function NotificationBell() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const { data: unreadData, refetch: refetchCount } = useQuery({
    queryKey: ['notifications-unread'],
    queryFn: () => api.notifications.getUnreadCount(),
  });
  const { data: list = [], refetch: refetchList } = useQuery({
    queryKey: ['notifications-list'],
    queryFn: () => api.notifications.list(),
    enabled: open,
  });

  useEffect(() => {
    if (!open) return;
    refetchList();
    refetchCount();
  }, [open, refetchList, refetchCount]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const unreadCount = unreadData?.count ?? 0;

  const handleItemClick = async (n: { id: string; type: string; entity_type: string | null; entity_id: string | null }) => {
    setOpen(false);
    try {
      await api.notifications.markRead(n.id);
      refetchCount();
      refetchList();
    } catch {
      // ignore
    }
    if (n.type === 'message' && n.entity_type === 'message' && n.entity_id) {
      navigate(`/messages?open=${n.entity_id}`);
    } else if (n.entity_type === 'service' && n.entity_id) {
      navigate(`/services/${n.entity_id}`);
    } else if (n.entity_type === 'document' && n.entity_id) {
      navigate('/messages');
    } else {
      navigate('/messages');
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.notifications.markAllRead();
      refetchCount();
      refetchList();
      setOpen(false);
    } catch {
      // ignore
    }
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="relative p-2 rounded-md text-gray-600 hover:bg-gray-100 transition-colors"
        aria-label={unreadCount > 0 ? `${unreadCount} unread notifications` : 'Notifications'}
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 00-6-6 6 6 0 00-6 6v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-medium text-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 w-80 max-h-96 overflow-auto rounded-lg border border-gray-200 bg-white shadow-lg z-50">
          <div className="p-2 border-b border-gray-100 flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Notifications</span>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="text-xs text-primary hover:underline"
              >
                Mark all read
              </button>
            )}
          </div>
          <ul className="divide-y divide-gray-100">
            {list.length === 0 ? (
              <li className="p-4 text-sm text-gray-500">No notifications</li>
            ) : (
              list.slice(0, 20).map((n) => (
                <li key={n.id}>
                  <button
                    type="button"
                    onClick={() => handleItemClick(n)}
                    className={`w-full text-left px-3 py-2.5 text-sm hover:bg-gray-50 ${n.read_at ? 'text-gray-600' : 'font-medium text-gray-900'}`}
                  >
                    <span className="line-clamp-2">{n.title}</span>
                    <span className="text-xs text-gray-400 mt-0.5 block">{new Date(n.created_at).toLocaleDateString()}</span>
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

export default function SidebarLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);

  const handleLogoutClick = () => setShowSignOutConfirm(true);

  const handleSignOutConfirm = () => {
    logout();
    const isStaff = user?.role === 'staff' || user?.role === 'admin' || user?.role === 'super_admin';
    navigate(isStaff ? '/admin/login' : '/login');
  };

  const isClient = user?.role === 'client';
  const isSuperAdmin = user?.role === 'super_admin';
  const isAdmin = user?.role === 'admin';
  const isStaff = user?.role === 'staff';

  const displayName = isClient
    ? (user?.companyName || user?.email || '')
    : [user?.firstName, user?.lastName].filter(Boolean).join(' ') || user?.email || '';

  const sidebarWidth = collapsed ? SIDEBAR_WIDTH_COLLAPSED : SIDEBAR_WIDTH_EXPANDED;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar - fixed so it stays put; only main content scrolls */}
      <aside
        className="fixed left-0 top-0 bottom-0 z-30 bg-primary text-white flex flex-col transition-all duration-300 ease-in-out"
        style={{ width: sidebarWidth }}
      >
        <div className="flex items-center justify-between h-16 px-4 border-b border-white/20 shrink-0 gap-2 bg-primary">
          <div className="flex items-center flex-1 min-w-0 h-full">
            <img
              src="/azmarineberg-logo.png"
              alt="Azmarineberg"
              className="h-11 w-auto object-contain max-h-full transition-all duration-300"
              style={{
                maxWidth: collapsed ? 44 : 220,
                // Let logo background match sidebar: same green so it blends
                backgroundColor: 'transparent',
              }}
            />
          </div>
          <button
            onClick={() => setCollapsed((c) => !c)}
            className="p-2 rounded-md hover:bg-white/20 transition-colors"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <svg
              className={`w-5 h-5 transition-transform ${collapsed ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        </div>

        <nav className="flex-1 py-4 overflow-y-auto min-h-0">
          {isClient ? (
            <>
              <NavLink
                to="/dashboard"
                end
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 mx-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive ? 'bg-white/25' : 'hover:bg-white/15'
                  }`
                }
              >
                <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2z" />
                </svg>
                {!collapsed && <span>Dashboard</span>}
              </NavLink>
              <NavLink
                to="/profile"
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 mx-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive ? 'bg-white/25' : 'hover:bg-white/15'
                  }`
                }
              >
                <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                {!collapsed && <span>Profile</span>}
              </NavLink>
              <NavLink
                to="/services"
                end={false}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 mx-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive ? 'bg-white/25' : 'hover:bg-white/15'
                  }`
                }
              >
                <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                {!collapsed && <span>Services</span>}
              </NavLink>
              <NavLink
                to="/messages"
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 mx-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive ? 'bg-white/25' : 'hover:bg-white/15'
                  }`
                }
              >
                <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                {!collapsed && <span>Message</span>}
              </NavLink>
            </>
          ) : (
            <>
              <NavLink
                to="/admin"
                end
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 mx-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive ? 'bg-white/25' : 'hover:bg-white/15'
                  }`
                }
              >
                <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2z" />
                </svg>
                {!collapsed && <span>Dashboard</span>}
              </NavLink>
              {(isStaff || isSuperAdmin) && (
                <NavLink
                  to="/admin/clients"
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-3 mx-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive ? 'bg-white/25' : 'hover:bg-white/15'
                    }`
                  }
                >
                  <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  {!collapsed && <span>Clients</span>}
                </NavLink>
              )}
              {(isAdmin || isSuperAdmin) && (
                <>
                  <NavLink
                    to="/admin/regulators"
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-4 py-3 mx-2 rounded-lg text-sm font-medium transition-colors ${
                        isActive ? 'bg-white/25' : 'hover:bg-white/15'
                      }`
                    }
                  >
                    <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    {!collapsed && <span>Regulators</span>}
                  </NavLink>
                  <NavLink
                    to="/admin/service-types"
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-4 py-3 mx-2 rounded-lg text-sm font-medium transition-colors ${
                        isActive ? 'bg-white/25' : 'hover:bg-white/15'
                      }`
                    }
                  >
                    <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                    {!collapsed && <span>Service Types</span>}
                  </NavLink>
                </>
              )}
              {isSuperAdmin && (
                <>
                  <NavLink
                    to="/admin/industry-sectors"
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-4 py-3 mx-2 rounded-lg text-sm font-medium transition-colors ${
                        isActive ? 'bg-white/25' : 'hover:bg-white/15'
                      }`
                    }
                  >
                    <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    {!collapsed && <span>Industry Sectors</span>}
                  </NavLink>
                  <NavLink
                    to="/admin/users"
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-4 py-3 mx-2 rounded-lg text-sm font-medium transition-colors ${
                        isActive ? 'bg-white/25' : 'hover:bg-white/15'
                      }`
                    }
                  >
                    <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                    {!collapsed && <span>Users</span>}
                  </NavLink>
                </>
              )}
              <NavLink
                to="/messages"
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 mx-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive ? 'bg-white/25' : 'hover:bg-white/15'
                  }`
                }
              >
                <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                {!collapsed && <span>Message</span>}
              </NavLink>
              {(isAdmin || isSuperAdmin) && (
                <NavLink
                  to="/admin/report"
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-3 mx-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive ? 'bg-white/25' : 'hover:bg-white/15'
                    }`
                  }
                >
                  <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l2.414 2.414a1 1 0 001.414 0l2.414-2.414a1 1 0 01.707-.293H17a2 2 0 012 2v19a2 2 0 01-2 2z" />
                  </svg>
                  {!collapsed && <span>Report</span>}
                </NavLink>
              )}
              {isSuperAdmin && (
                <NavLink
                  to="/admin/audit-log"
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-3 mx-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive ? 'bg-white/25' : 'hover:bg-white/15'
                    }`
                  }
                >
                  <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                  </svg>
                  {!collapsed && <span>Audit Log</span>}
                </NavLink>
              )}
            </>
          )}
        </nav>

        <div className="p-4 border-t border-white/20 shrink-0">
          {!collapsed && (
            <div className="mb-3 px-2">
              <p className="text-sm truncate" title={user?.email}>
                {user?.email}
              </p>
              <p className="text-xs opacity-80 capitalize">{user?.role?.replace('_', ' ')}</p>
            </div>
          )}
          <button
            onClick={handleLogoutClick}
            className="w-full flex items-center justify-center gap-3 px-4 py-2 rounded-lg bg-white/20 hover:bg-white/30 text-sm font-medium transition-colors"
          >
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            {!collapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main content area - offset by sidebar width; only this area scrolls */}
      <main
        className="min-h-screen overflow-y-auto min-w-0 flex flex-col"
        style={{ marginLeft: sidebarWidth }}
      >
        {/* Horizontal header: portal name (left), notification bell + user display name (right) */}
        <header className="flex items-center justify-between shrink-0 py-4 px-6 sm:px-8 lg:px-12 border-b border-gray-200 bg-white/80">
          <span className="text-lg font-semibold text-primary">Azmarineberg Portal</span>
          <div className="flex items-center gap-3">
            <NotificationBell />
            <span className="text-sm font-medium text-gray-700 truncate max-w-[200px] sm:max-w-xs" title={displayName}>
              {displayName}
            </span>
          </div>
        </header>
        <div className="flex-1 pt-6 pb-16 px-6 sm:px-8 lg:px-12">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </div>
      </main>
      <SignOutConfirmDialog
        open={showSignOutConfirm}
        onClose={() => setShowSignOutConfirm(false)}
        onConfirm={handleSignOutConfirm}
      />
    </div>
  );
}
