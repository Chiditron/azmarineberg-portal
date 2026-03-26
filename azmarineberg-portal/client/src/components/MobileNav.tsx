import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { NavLink } from 'react-router-dom';
import type { AppNavItem } from '../navigation/appNav';

/** Solid brand green — used on the drawer so it stays opaque even if `bg-primary` is affected by stacking contexts. */
const DRAWER_BG_CLASS = 'bg-[#0d5c2e]';

type MobileNavProps = {
  navItems: AppNavItem[];
  userEmail?: string | null;
  userRoleLabel?: string;
  onLogoutClick: () => void;
};

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';

/**
 * Hamburger (visible &lt; lg) opens a right slide-out with the same links as desktop horizontal nav.
 * ARIA, Escape, focus trap, backdrop click, and 250ms ease-in-out transitions.
 */
export default function MobileNav({ navItems, userEmail, userRoleLabel, onLogoutClick }: MobileNavProps) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => {
    setOpen(false);
    requestAnimationFrame(() => triggerRef.current?.focus());
  }, []);

  useEffect(() => {
    if (!open) return;
    const panel = panelRef.current;
    if (!panel) return;
    const focusables = panel.querySelectorAll<HTMLElement>(FOCUSABLE);
    const first = focusables[0];
    first?.focus();

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault();
        close();
        return;
      }
      if (e.key !== 'Tab' || focusables.length === 0) return;
      const last = focusables[focusables.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else if (document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, close]);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent | TouchEvent) {
      const target = e.target as Node;
      if (panelRef.current?.contains(target)) return;
      if (triggerRef.current?.contains(target)) return;
      close();
    }
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('touchstart', onPointerDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('touchstart', onPointerDown);
    };
  }, [open, close]);

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 min-h-[44px] px-4 py-3 mx-2 rounded-lg text-sm font-medium text-white transition-colors [&_svg]:text-white ${
      isActive ? 'bg-white/25' : 'hover:bg-white/15'
    }`;

  const overlay =
    typeof document !== 'undefined'
      ? createPortal(
          <>
            {/* Portaled to body so fixed positioning is not trapped by header backdrop-blur / containing blocks */}
            <div
              className={`fixed inset-0 z-[100] bg-black/45 transition-opacity duration-300 ease-in-out lg:hidden ${
                open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
              }`}
              style={{ top: '3.5rem' }}
              aria-hidden
            />

            <div
              ref={panelRef}
              id={panelId}
              role="dialog"
              aria-modal="true"
              aria-label="Main navigation"
              className={`fixed top-0 right-0 z-[110] flex h-[100dvh] w-full max-w-[85vw] sm:max-w-sm flex-col ${DRAWER_BG_CLASS} text-white shadow-2xl ring-1 ring-black/20 transition-transform duration-300 ease-in-out lg:hidden ${
                open ? 'translate-x-0 pointer-events-auto' : 'translate-x-full pointer-events-none'
              }`}
            >
              <div
                className={`flex h-16 shrink-0 items-center justify-between border-b border-white/25 px-4 ${DRAWER_BG_CLASS}`}
              >
                <span className="text-lg font-semibold text-white">Menu</span>
                <button
                  type="button"
                  onClick={close}
                  className="min-h-[44px] min-w-[44px] rounded-md text-white hover:bg-white/20 flex items-center justify-center"
                  aria-label="Close menu"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <nav
                className={`flex-1 overflow-y-auto py-4 min-h-0 ${DRAWER_BG_CLASS}`}
                aria-label="Primary"
              >
                {navItems.map((item) => (
                  <NavLink
                    key={item.id}
                    to={item.to}
                    end={item.end}
                    className={linkClass}
                    onClick={close}
                  >
                    {item.icon}
                    <span className="text-white">{item.label}</span>
                  </NavLink>
                ))}
              </nav>

              <div className={`shrink-0 border-t border-white/25 p-4 ${DRAWER_BG_CLASS}`}>
                {userEmail && (
                  <div className="mb-3 px-2">
                    <p className="text-sm text-white break-all" title={userEmail}>
                      {userEmail}
                    </p>
                    {userRoleLabel && (
                      <p className="text-xs text-white/90 capitalize">{userRoleLabel}</p>
                    )}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => {
                    close();
                    onLogoutClick();
                  }}
                  className="flex min-h-[44px] w-full items-center justify-center gap-3 rounded-lg bg-white/25 px-4 py-2 text-sm font-medium text-white hover:bg-white/35 transition-colors"
                >
                  <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  <span>Logout</span>
                </button>
              </div>
            </div>
          </>,
          document.body
        )
      : null;

  return (
    <div className="lg:hidden">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md text-gray-700 hover:bg-gray-100 transition-colors"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={open ? 'Close menu' : 'Open menu'}
      >
        {open ? (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        )}
      </button>
      {overlay}
    </div>
  );
}

/** Desktop horizontal primary nav (lg+). */
export function DesktopNavBar({ navItems }: { navItems: AppNavItem[] }) {
  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `shrink-0 whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition-colors ${
      isActive ? 'bg-white/25 text-white' : 'text-white/90 hover:bg-white/15'
    }`;

  return (
    <nav
      className="hidden min-w-0 flex-1 items-center gap-1 overflow-x-auto scroll-smooth px-2 lg:flex"
      aria-label="Primary"
    >
      {navItems.map((item) => (
        <NavLink key={item.id} to={item.to} end={item.end} className={linkClass}>
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}
