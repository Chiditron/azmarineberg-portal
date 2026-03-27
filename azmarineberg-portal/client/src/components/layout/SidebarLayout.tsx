import { useState, useRef, useEffect } from "react";
import { Outlet, NavLink, useNavigate, useLocation } from "react-router-dom";
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
} from "@fortawesome/free-solid-svg-icons";

const SIDEBAR_WIDTH_EXPANDED = 240;
const SIDEBAR_WIDTH_COLLAPSED = 80;

type BellTone = "default" | "onPrimary";

function NotificationBell({ tone = "default" }: { tone?: BellTone }) {
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
  const btnTone =
    tone === "onPrimary"
      ? "text-white/90 hover:bg-white/15"
      : "text-gray-600 hover:bg-gray-100";

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
        className="relative p-2.5 rounded-xl text-gray-500 hover:bg-gray-100 hover:text-primary transition-all active:scale-95"
      >
        <FontAwesomeIcon icon={faBell} className="w-8 h-8" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 flex h-4.5 min-w-[1.125rem] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white ring-2 ring-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-2 max-h-[400px] overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-xl z-50 animate-in fade-in slide-in-from-top-2 duration-200">
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
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
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

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 px-4 py-3 mx-2 rounded-lg text-sm font-medium transition-colors ${isActive ? "bg-white/25" : "hover:bg-white/15"
    }`;

  return (
    <div className="min-h-screen bg-gray-100 flex font-inter">
      {/* Sidebar */}
      <aside
        className="fixed left-0 top-0 bottom-0 z-40 bg-white border-r border-gray-200 flex flex-col transition-all duration-300 ease-in-out shadow-[4px_0_24px_rgba(0,0,0,0.02)]"
        style={{ width: sidebarWidth }}
      >
        <div className="flex items-center justify-between h-20 px-6 shrink-0 bg-white">
          {!collapsed ? (
            <div className="flex items-center gap-2">
              {/* <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shadow-lg shadow-primary/20">
                <span className="text-white font-bold text-lg">A</span>
              </div> */}
              <div>
                <img src="/public/logo.png" alt="az logo" className="w-8 h-8 object-cover" />
              </div>
              <span className="font-bold text-gray-900 text-lg tracking-tight font-outfit">
                Azmarineberg
              </span>
            </div>
          ) : (
            // <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center mx-auto shadow-lg shadow-primary/20">
            //   <span className="text-white font-bold text-lg">A</span>
            // </div>
            <div>
              <img src="/public/logo.png" alt="az logo" className="w-8 h-8 object-cover" />
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
          <nav className="space-y-1">
            {isClient ? (
              <>
                <NavItem
                  to="/dashboard"
                  icon={faTachometerAlt}
                  label="Dashboard"
                  collapsed={collapsed}
                  end
                />
                <NavItem
                  to="/profile"
                  icon={faUser}
                  label="Profile"
                  collapsed={collapsed}
                />
                <NavItem
                  to="/services"
                  icon={faBriefcase}
                  label="Services"
                  collapsed={collapsed}
                />
                <NavItem
                  to="/messages"
                  icon={faEnvelope}
                  label="Messages"
                  collapsed={collapsed}
                />
              </>
            ) : (
              <>
                <NavItem
                  to="/admin"
                  icon={faTachometerAlt}
                  label="Dashboard"
                  collapsed={collapsed}
                  end
                />
                {(isStaff || isSuperAdmin) && (
                  <NavItem
                    to="/admin/clients"
                    icon={faUsers}
                    label="Clients"
                    collapsed={collapsed}
                  />
                )}
                {(isAdmin || isSuperAdmin) && (
                  <>
                    {(isAdmin || isSuperAdmin) && (
                      <NavItem
                        to="/admin/report"
                        icon={faFileAlt}
                        label="Reports"
                        collapsed={collapsed}
                      />
                    )}
                    <NavItem
                      to="/admin/regulators"
                      icon={faShieldAlt}
                      label="Regulators"
                      collapsed={collapsed}
                    />
                    <NavItem
                      to="/admin/service-types"
                      icon={faBriefcase}
                      label="Services"
                      collapsed={collapsed}
                    />
                  </>
                )}
                {isSuperAdmin && (
                  <>
                    <NavItem
                      to="/admin/industry-sectors"
                      icon={faBuilding}
                      label="Sectors"
                      collapsed={collapsed}
                    />
                    <NavItem
                      to="/admin/users"
                      icon={faUsers}
                      label="Users"
                      collapsed={collapsed}
                    />
                  </>
                )}
                {isSuperAdmin && (
                  <NavItem
                    to="/admin/audit-log"
                    icon={faHistory}
                    label="Audit Log"
                    collapsed={collapsed}
                  />
                )}
                <NavItem
                  to="/messages"
                  icon={faEnvelope}
                  label="Messages"
                  collapsed={collapsed}
                />
              </>
            )}
          </nav>
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
        className="flex-1 min-h-screen flex flex-col transition-all duration-300 ease-in-out relative overflow-y-scroll pt-5"
        style={{ paddingLeft: sidebarWidth }}
      >
        {/* Toggle Button for Sidebar - Floating style */}
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="fixed z-50 left-0 top-[22px] transform -translate-x-1/2 p-2 rounded-full bg-white border border-gray-200 text-gray-400 hover:text-primary hover:border-primary shadow-sm transition-all duration-300"
          style={{ left: sidebarWidth }}
        >
          <FontAwesomeIcon
            icon={faChevronLeft}
            className={`w-3 h-3 transition-transform ${collapsed ? "rotate-180" : ""}`}
          />
        </button>

        {/* Header */}
        <header className="fixed w-full left-0 top-0 z-30 flex items-center justify-between py-5 px-8 lg:px-12 bg-white border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 capitalize hidden">
              {location.pathname
                .split("/")
                .filter(Boolean)
                .pop()
                ?.replace(/-/g, " ") || "Dashboard"}
            </h2>
          </div>
          <div className="flex items-center gap-5">
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
        <div className="flex-1 pt-24 pb-16">
          <div className="px-7">
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
