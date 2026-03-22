import { useState, useRef, useEffect } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../services/api';
import SignOutConfirmDialog from '../SignOutConfirmDialog';
import MobileNav from '../MobileNav';
import { getAppNavItems } from '../../navigation/appNav';

const SIDEBAR_WIDTH_EXPANDED = 256;
const SIDEBAR_WIDTH_COLLAPSED = 72;

type BellTone = 'default' | 'onPrimary';

function NotificationBell({ tone = 'default' }: { tone?: BellTone }) {
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
  const btnTone =
    tone === 'onPrimary'
      ? 'text-white/90 hover:bg-white/15'
      : 'text-gray-600 hover:bg-gray-100';

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
        className={`relative min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-md transition-colors ${btnTone}`}
        aria-label={unreadCount > 0 ? `${unreadCount} unread notifications` : 'Notifications'}
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 00-6-6 6 6 0 00-6 6v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-white px-1 text-[10px] font-medium text-primary">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 max-h-96 w-80 overflow-auto rounded-lg border border-gray-200 bg-white shadow-lg">
          <div className="flex items-center justify-between border-b border-gray-100 p-2">
            <span className="text-sm font-medium text-gray-700">Notifications</span>
            {unreadCount > 0 && (
              <button type="button" onClick={handleMarkAllRead} className="text-xs text-primary hover:underline">
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
                    className={`w-full px-3 py-2.5 text-left text-sm hover:bg-gray-50 ${n.read_at ? 'text-gray-600' : 'font-medium text-gray-900'}`}
                  >
                    <span className="line-clamp-2">{n.title}</span>
                    <span className="mt-0.5 block text-xs text-gray-400">{new Date(n.created_at).toLocaleDateString()}</span>
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

  const displayName = isClient
    ? (user?.companyName || user?.email || '')
    : [user?.firstName, user?.lastName].filter(Boolean).join(' ') || user?.email || '';

  const navItems = getAppNavItems(user?.role);
  const roleLabel = user?.role?.replace('_', ' ') ?? '';

  const sidebarWidth = collapsed ? SIDEBAR_WIDTH_COLLAPSED : SIDEBAR_WIDTH_EXPANDED;

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 px-4 py-3 mx-2 rounded-lg text-sm font-medium transition-colors ${
      isActive ? 'bg-white/25' : 'hover:bg-white/15'
    }`;

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      {/* Desktop: fixed left sidebar (lg+) */}
      <aside
        className="fixed left-0 top-0 z-30 hidden h-full flex-col bg-primary text-white transition-all duration-300 ease-in-out lg:flex"
        style={{ width: sidebarWidth }}
      >
        <div className="flex h-16 shrink-0 items-center justify-between gap-2 border-b border-white/20 bg-primary px-4">
          <div className="flex min-w-0 flex-1 items-center">
            {!collapsed && (
              <img
                src="/azmarineberg-logo.png"
                alt="Azmarineberg"
                className="h-11 max-h-full w-auto max-w-[220px] object-contain"
              />
            )}
          </div>
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            className="shrink-0 rounded-md p-2 transition-colors hover:bg-white/20"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <svg
              className={`h-5 w-5 transition-transform ${collapsed ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        </div>

        <nav className="min-h-0 flex-1 overflow-y-auto py-4" aria-label="Primary">
          {navItems.map((item) => (
            <NavLink key={item.id} to={item.to} end={item.end} className={navLinkClass}>
              {item.icon}
              {!collapsed && <span>{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        <div className="shrink-0 border-t border-white/20 p-4">
          {!collapsed && (
            <div className="mb-3 px-2">
              <p className="truncate text-sm" title={user?.email}>
                {user?.email}
              </p>
              <p className="text-xs capitalize opacity-80">{roleLabel}</p>
            </div>
          )}
          <button
            type="button"
            onClick={handleLogoutClick}
            className="flex w-full items-center justify-center gap-3 rounded-lg bg-white/20 px-4 py-2 text-sm font-medium transition-colors hover:bg-white/30"
          >
            <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            {!collapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* Mobile / tablet: top bar + hamburger menu */}
      <header className="relative z-50 flex shrink-0 items-center justify-between border-b border-gray-200 bg-white/90 py-3 px-4 backdrop-blur-sm lg:hidden">
        <span className="text-lg font-semibold text-primary">Azmarineberg Portal</span>
        <div className="flex min-w-0 items-center gap-2">
          <NotificationBell tone="default" />
          <span
            className="hidden max-w-[120px] truncate text-sm font-medium text-gray-700 sm:inline"
            title={displayName}
          >
            {displayName}
          </span>
          <MobileNav
            navItems={navItems}
            userEmail={user?.email}
            userRoleLabel={roleLabel}
            onLogoutClick={handleLogoutClick}
          />
        </div>
      </header>

      {/* Main: offset by sidebar on desktop */}
      <main
        className={`flex min-h-0 min-w-0 flex-1 flex-col overflow-x-hidden transition-[margin] duration-300 ease-in-out ${
          collapsed ? 'lg:ml-[72px]' : 'lg:ml-64'
        }`}
      >
        {/* Desktop-only content header (bell + user) — logout stays in sidebar */}
        <header className="hidden shrink-0 items-center justify-between border-b border-gray-200 bg-white/80 px-6 py-4 sm:px-8 lg:flex lg:px-12">
          <span className="text-lg font-semibold text-primary">Azmarineberg Portal</span>
          <div className="flex items-center gap-3">
            <NotificationBell tone="default" />
            <span className="max-w-[200px] truncate text-sm font-medium text-gray-700 sm:max-w-xs" title={displayName}>
              {displayName}
            </span>
          </div>
        </header>
        <div className="flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-10 lg:py-8">
          <div className="mx-auto min-w-0 max-w-7xl">
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
