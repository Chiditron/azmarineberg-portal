import type { ReactNode } from 'react';

/** Mirrors AuthContext user.role */
export type AppNavRole = 'client' | 'staff' | 'admin' | 'super_admin' | string | undefined;

export type AppNavItem = {
  /** Stable key for React lists */
  id: string;
  to: string;
  label: string;
  /** NavLink `end` prop */
  end?: boolean;
  icon: ReactNode;
  /** Return true when this item should appear for the given role context */
  visible: (ctx: AppNavContext) => boolean;
};

export type AppNavContext = {
  role: AppNavRole;
  isClient: boolean;
  isStaff: boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
};

export function buildNavContext(role: AppNavRole): AppNavContext {
  return {
    role,
    isClient: role === 'client',
    isStaff: role === 'staff',
    isAdmin: role === 'admin',
    isSuperAdmin: role === 'super_admin',
  };
}

function IconDashboard() {
  return (
    <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2z" />
    </svg>
  );
}

function IconProfile() {
  return (
    <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  );
}

function IconServices() {
  return (
    <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
    </svg>
  );
}

function IconMessage() {
  return (
    <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  );
}

function IconClients() {
  return (
    <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  );
}

function IconRegulators() {
  return (
    <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  );
}

function IconIndustrySectors() {
  return (
    <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
  );
}

function IconUsers() {
  return (
    <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  );
}

function IconReport() {
  return (
    <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l2.414 2.414a1 1 0 001.414 0l2.414-2.414a1 1 0 01.707-.293H17a2 2 0 012 2v19a2 2 0 01-2 2z" />
    </svg>
  );
}

function IconAuditLog() {
  return (
    <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
    </svg>
  );
}

/** Ordered nav definitions; visibility matches legacy SidebarLayout. */
const APP_NAV_ITEMS: AppNavItem[] = [
  { id: 'c-dash', to: '/dashboard', label: 'Dashboard', end: true, icon: <IconDashboard />, visible: (c) => c.isClient },
  { id: 'c-profile', to: '/profile', label: 'Profile', icon: <IconProfile />, visible: (c) => c.isClient },
  { id: 'c-svc', to: '/services', label: 'Services', end: false, icon: <IconServices />, visible: (c) => c.isClient },
  { id: 'c-msg', to: '/messages', label: 'Message', icon: <IconMessage />, visible: (c) => c.isClient },

  { id: 'a-dash', to: '/admin', label: 'Dashboard', end: true, icon: <IconDashboard />, visible: (c) => !c.isClient },
  {
    id: 'a-clients',
    to: '/admin/clients',
    label: 'Clients',
    icon: <IconClients />,
    visible: (c) => !c.isClient && (c.isStaff || c.isSuperAdmin),
  },
  {
    id: 'a-reg',
    to: '/admin/regulators',
    label: 'Regulators',
    icon: <IconRegulators />,
    visible: (c) => !c.isClient && (c.isAdmin || c.isSuperAdmin),
  },
  {
    id: 'a-st',
    to: '/admin/service-types',
    label: 'Service Types',
    icon: <IconServices />,
    visible: (c) => !c.isClient && (c.isAdmin || c.isSuperAdmin),
  },
  {
    id: 'a-is',
    to: '/admin/industry-sectors',
    label: 'Industry Sectors',
    icon: <IconIndustrySectors />,
    visible: (c) => !c.isClient && c.isSuperAdmin,
  },
  {
    id: 'a-users',
    to: '/admin/users',
    label: 'Users',
    icon: <IconUsers />,
    visible: (c) => !c.isClient && c.isSuperAdmin,
  },
  { id: 'a-msg', to: '/messages', label: 'Message', icon: <IconMessage />, visible: (c) => !c.isClient },
  {
    id: 'a-report',
    to: '/admin/report',
    label: 'Report',
    icon: <IconReport />,
    visible: (c) => !c.isClient && (c.isAdmin || c.isSuperAdmin),
  },
  {
    id: 'a-audit',
    to: '/admin/audit-log',
    label: 'Audit Log',
    icon: <IconAuditLog />,
    visible: (c) => !c.isClient && c.isSuperAdmin,
  },
];

/**
 * Returns nav items for the current user (client vs staff/admin/super_admin), preserving order.
 */
export function getAppNavItems(role: AppNavRole): AppNavItem[] {
  const ctx = buildNavContext(role);
  return APP_NAV_ITEMS.filter((item) => item.visible(ctx));
}
