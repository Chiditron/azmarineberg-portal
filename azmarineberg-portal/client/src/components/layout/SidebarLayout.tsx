import { useState, useRef, useEffect, Fragment } from "react";
import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { Dialog, Transition } from "@headlessui/react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../../contexts/AuthContext";
import { api } from "../../services/api";
import SignOutConfirmDialog from "../SignOutConfirmDialog";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faTachometerAlt,
  faUser,
  faBriefcase,
  faEnvelope,
  faUsers,
  faShieldAlt,
  faBuilding,
  faFileAlt,
  faHistory,
  faSignOutAlt,
  faChevronLeft,
  faBell,
  faBars,
  faTimes,
} from "@fortawesome/free-solid-svg-icons";

const SIDEBAR_WIDTH_EXPANDED = 240;
const SIDEBAR_WIDTH_COLLAPSED = 80;

// type BellTone = "default" | "onPrimary";

function NotificationBell() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const { data: unreadData, refetch: refetchCount } = useQuery({
    queryKey: ["notifications-unread"],
    queryFn: () => api.notifications.getUnreadCount(),
  });
  const { data: list = [], refetch: refetchList } = useQuery({
    queryKey: ["notifications-list"],
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
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const unreadCount = unreadData?.count ?? 0;

  const handleItemClick = async (n: {
    id: string;
    type: string;
    entity_type: string | null;
    entity_id: string | null;
  }) => {
    setOpen(false);
    try {
      await api.notifications.markRead(n.id);
      refetchCount();
      refetchList();
    } catch {
      // ignore
    }
    if (n.type === "message" && n.entity_type === "message" && n.entity_id) {
      navigate(`/messages?open=${n.entity_id}`);
    } else if (n.entity_type === "service" && n.entity_id) {
      navigate(`/services/${n.entity_id}`);
    } else if (n.entity_type === "document" && n.entity_id) {
      navigate("/messages");
    } else {
      navigate("/messages");
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
        className="relative p- rounded-xl text-gray-500 hover:bg-gray-100 hover:text-primary transition-all active:scale-95"
      >
        <FontAwesomeIcon icon={faBell} className="w-8 h-8" />
        {unreadCount > 0 && (
          <span className="absolute -top-1.5 -right-2 flex h-4.5 min-w-[1.125rem] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white ring-2 ring-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>
      {open && (
        <div className="fixed md:absolute right-5 md:right-0 top-20 md:top-full mt-2 max-h-[400px] overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-xl z-50 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="p-4 border-b border-gray-50 flex items-center justify-between bg-gray-50/50 w-80">
            <span className="font-semibold text-gray-900 font-outfit">
              Notifications
            </span>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="text-xs text-primary font-semibold hover:underline"
              >
                Mark all read
              </button>
            )}
          </div>
          <ul className="divide-y divide-gray-50 overflow-y-auto max-h-[340px]">
            {list.length === 0 ? (
              <li className="p-8 text-center">
                <p className="text-sm text-gray-400">No new notifications</p>
              </li>
            ) : (
              list.slice(0, 20).map((n) => (
                <li key={n.id}>
                  <button
                    type="button"
                    onClick={() => handleItemClick(n)}
                    className={`w-full text-left p-4 text-sm hover:bg-blue-50/50 transition-colors group ${n.read_at ? "text-gray-500" : "bg-blue-50/20 font-medium text-gray-900"}`}
                  >
                    <span className="block mb-1 group-hover:text-primary transition-colors line-clamp-2">
                      {n.title}
                    </span>
                    <span className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">
                      {new Date(n.created_at).toLocaleDateString()}
                    </span>
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

const NavItem = ({
  to,
  icon,
  label,
  collapsed,
  end = false,
}: {
  to: string;
  icon: any;
  label: string;
  collapsed: boolean;
  end?: boolean;
}) => (
  <NavLink
    to={to}
    end={end}
    className={({ isActive }) =>
      `flex items-center gap-3.5 px-4 py-3.5 mx-3 rounded-xl font-medium transition-all group duration-200 ${isActive
        ? "bg-white text-primary shadow-sm ring-1 ring-gray-200"
        : "text-gray-600 hover:bg-gray-100/80 hover:text-primary"
      }`
    }
  >
    <div
      className={`w-5 h-5 flex items-center justify-center transition-transform group-hover:scale-110 duration-200`}
    >
      <FontAwesomeIcon icon={icon} className="w-full h-full" />
    </div>
    {!collapsed && <span className="truncate">{label}</span>}
  </NavLink>
);

export default function SidebarLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  // const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);

  const handleLogoutClick = () => setShowSignOutConfirm(true);

  const handleSignOutConfirm = () => {
    logout();
    const isStaff =
      user?.role === "staff" ||
      user?.role === "admin" ||
      user?.role === "super_admin";
    navigate(isStaff ? "/admin/login" : "/login");
  };

  const isClient = user?.role === "client";
  const isSuperAdmin = user?.role === "super_admin";
  const isAdmin = user?.role === "admin";
  const isStaff = user?.role === "staff";

  const displayName = isClient
    ? user?.companyName || user?.email || ""
    : [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
    user?.email ||
    "";

  const sidebarWidth = collapsed
    ? SIDEBAR_WIDTH_COLLAPSED
    : SIDEBAR_WIDTH_EXPANDED;

  const renderNavItems = (isMobile = false) => {
    const isCollapsed = isMobile ? false : collapsed;
    return (
      <nav className="space-y-1">
        {isClient ? (
          <>
            <NavItem
              to="/dashboard"
              icon={faTachometerAlt}
              label="Dashboard"
              collapsed={isCollapsed}
              end
            />
            <NavItem
              to="/profile"
              icon={faUser}
              label="Profile"
              collapsed={isCollapsed}
            />
            <NavItem
              to="/services"
              icon={faBriefcase}
              label="Services"
              collapsed={isCollapsed}
            />
            <NavItem
              to="/messages"
              icon={faEnvelope}
              label="Messages"
              collapsed={isCollapsed}
            />
          </>
        ) : (
          <>
            <NavItem
              to="/admin"
              icon={faTachometerAlt}
              label="Dashboard"
              collapsed={isCollapsed}
              end
            />
            {(isStaff || isSuperAdmin) && (
              <NavItem
                to="/admin/clients"
                icon={faUsers}
                label="Clients"
                collapsed={isCollapsed}
              />
            )}
            {(isAdmin || isSuperAdmin) && (
              <>
                {(isAdmin || isSuperAdmin) && (
                  <NavItem
                    to="/admin/report"
                    icon={faFileAlt}
                    label="Reports"
                    collapsed={isCollapsed}
                  />
                )}
                <NavItem
                  to="/admin/regulators"
                  icon={faShieldAlt}
                  label="Regulators"
                  collapsed={isCollapsed}
                />
                <NavItem
                  to="/admin/service-types"
                  icon={faBriefcase}
                  label="Services"
                  collapsed={isCollapsed}
                />
              </>
            )}
            {isSuperAdmin && (
              <>
                <NavItem
                  to="/admin/industry-sectors"
                  icon={faBuilding}
                  label="Sectors"
                  collapsed={isCollapsed}
                />
                <NavItem
                  to="/admin/users"
                  icon={faUsers}
                  label="Users"
                  collapsed={isCollapsed}
                />
              </>
            )}
            {isSuperAdmin && (
              <NavItem
                to="/admin/audit-log"
                icon={faHistory}
                label="Audit Log"
                collapsed={isCollapsed}
              />
            )}
            <NavItem
              to="/messages"
              icon={faEnvelope}
              label="Messages"
              collapsed={isCollapsed}
            />
          </>
        )}
      </nav>
    );
  };

  return (
    <div className="min-h-screen bg-gray-100 flex font-inter">
      {/* Mobile Sidebar (Slide-in) */}
      <Transition.Root show={isMobileMenuOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50 xl:hidden" onClose={setIsMobileMenuOpen}>
          <Transition.Child
            as={Fragment}
            enter="transition-opacity ease-linear duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="transition-opacity ease-linear duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" />
          </Transition.Child>

          <div className="fixed inset-0 flex">
            <Transition.Child
              as={Fragment}
              enter="transition ease-in-out duration-300 transform"
              enterFrom="-translate-x-full"
              enterTo="translate-x-0"
              leave="transition ease-in-out duration-300 transform"
              leaveFrom="translate-x-0"
              leaveTo="-translate-x-full"
            >
              <Dialog.Panel className="relative flex w-full max-w-[280px] flex-1 flex-col bg-white shadow-2xl">
                <div className="absolute right-0 top-0 -mr-12 pt-2">
                  <button
                    type="button"
                    className="ml-1 flex h-10 w-10 items-center justify-center rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <span className="sr-only">Close sidebar</span>
                    <FontAwesomeIcon icon={faTimes} className="h-6 w-6 text-white" />
                  </button>
                </div>

                <div className="flex h-20 items-center justify-between px-6 shrink-0 bg-white border-b border-gray-100">
                  <div className="flex items-center gap-2">
                    <img src="/logo.png" alt="az logo" className="w-8 h-8 object-cover" />
                    <span className="font-bold text-gray-900 text-lg tracking-tight font-outfit">
                      Azmarineberg
                    </span>
                  </div>
                </div>

                <div className="flex-1 py-4 overflow-y-auto" onClick={() => setIsMobileMenuOpen(false)}>
                  <div className="px-5 mb-4">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-2 mb-2">
                      Main Menu
                    </p>
                  </div>
                  {renderNavItems(true)}
                </div>

                <div className="p-4 border-t border-gray-100 bg-gray-50/50">
                  <button
                    type="button"
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      handleLogoutClick();
                    }}
                    className="w-full flex items-center gap-3.5 px-4 py-3.5 rounded-xl text-red-500 hover:bg-red-50 font-medium transition-all active:scale-[0.98]"
                  >
                    <FontAwesomeIcon icon={faSignOutAlt} className="w-5 h-5 flex-shrink-0" />
                    <span>Logout</span>
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </Dialog>
      </Transition.Root>

      {/* Desktop Sidebar */}
      <aside
        className="fixed left-0 top-0 bottom-0 z-40 bg-white border-r border-gray-200 hidden xl:flex flex-col transition-all duration-300 ease-in-out shadow-[4px_0_24px_rgba(0,0,0,0.02)]"
        style={{ width: sidebarWidth }}
      >
        <div className="flex items-center justify-between h-20 px-6 shrink-0 bg-white">
          {!collapsed ? (
            <div className="flex items-center gap-2">
              <div>
                <img src="/logo.png" alt="az logo" className="w-8 h-8 object-cover" />
              </div>
              <span className="font-bold text-gray-900 text-lg tracking-tight font-outfit">
                Azmarineberg
              </span>
            </div>
          ) : (
            <div>
              <img src="/logo.png" alt="az logo" className="w-8 h-8 object-cover" />
            </div>
          )}
        </div>

        <div className="flex-1 py-4 overflow-y-scroll scroll-smooth hide_scrollbar">
          <div className="px-5 mb-4">
            {!collapsed && (
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-2 mb-2">
                Main Menu
              </p>
            )}
          </div>
          {renderNavItems()}
        </div>

        <div className="p-4 border-t border-gray-100 bg-gray-50/50">
          <button
            type="button"
            onClick={handleLogoutClick}
            className={`w-full flex items-center gap-3.5 px-4 py-3.5 rounded-xl text-red-500 hover:bg-red-50 font-medium transition-all active:scale-[0.98] ${collapsed ? "justify-center" : ""}`}
          >
            <FontAwesomeIcon
              icon={faSignOutAlt}
              className="w-5 h-5 flex-shrink-0"
            />
            {!collapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main
        className={`flex-1 min-h-screen flex flex-col transition-all duration-300 ease-in-out relative overflow-y-scroll pt-5 ${collapsed ? "xl:pl-20" : "xl:pl-60"}`}
      >
        <div className="xl:hidden h-2.5" /> {/* Spacer for top header overlap on mobile */}

        {/* Toggle Button for Sidebar - Floating style (Desktop only) */}
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="fixed z-50 left-0 top-[22px] transform -translate-x-1/2 p-2 rounded-full bg-white border border-gray-200 text-gray-400 hover:text-primary hover:border-primary shadow-sm hidden xl:block transition-all duration-300"
          style={{ left: collapsed ? SIDEBAR_WIDTH_COLLAPSED : SIDEBAR_WIDTH_EXPANDED }}
        >
          <FontAwesomeIcon
            icon={faChevronLeft}
            className={`w-3 h-3 transition-transform ${collapsed ? "rotate-180" : ""}`}
          />
        </button>

        {/* Header */}
        <header className={`fixed w-full left-0 top-0 z-30 flex items-center justify-between py-5 wrap bg-white border-b border-gray-200 ${collapsed ? "xl:pl-28" : "xl:pl-72"}`}>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="xl:hidden rounded-xl text-gray-500 hover:bg-gray-100 hover:text-primary transition-all active:scale-95"
            >
              <FontAwesomeIcon icon={faBars} className="w-5 h-5" />
            </button>
            {/* <h2 className="text-xl font-semibold text-gray-900 capitalize hidden sm:block">
              {location.pathname
                .split("/")
                .filter(Boolean)
                .pop()
                ?.replace(/-/g, " ") || "Dashboard"}
            </h2> */}
            <div className="sm:hidden xl:hidden">
              <img src="/logo.png" alt="az logo" className="w-10 h-10 object-cover" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <NotificationBell />
            <div className="h-8 w-[1px] bg-gray-200 mx-1"></div>
            <div className="flex items-center gap-3 pl-1">
              <div className="text-right hidden sm:block">
                <p className="font-semibold text-gray-900 truncate max-w-[150px]">
                  {displayName}
                </p>
                <p className="text-xs font-semibold text-primary uppercase tracking-wider">
                  {user?.role?.replace("_", " ")}
                </p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold shadow-sm ring-1 ring-primary/20 text-xl">
                {displayName.charAt(0).toUpperCase()}
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 pt-20 md:pt-24 pb-16">
          <div className="wrap">
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
