import {
  ArrowLeftRight,
  BarChart3,
  ChevronDown,
  Diamond,
  Eye,
  Filter,
  Globe,
  Layers,
  LogOut,
  Menu,
  Newspaper,
  Search,
  Settings,
  Star,
  Upload,
  Wallet,
} from "lucide-react";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { RollingTicker } from "./terminal/RollingTicker";

interface LayoutProps {
  children: ReactNode;
}

const marketTabs = [
  { href: "/overview", label: "Overview", icon: Globe },
  { href: "/sets", label: "Sets & Eras", icon: Layers },
  { href: "/news", label: "News", icon: Newspaper },
  { href: "/cards", label: "Cards", icon: Search },
  { href: "/graded", label: "Graded", icon: Diamond },
  { href: "/watchlist", label: "Watchlist", icon: Star },
  { href: "/screener", label: "Screener", icon: Filter },
];

const portfolioTabs = [
  { href: "/portfolio", label: "Portfolio", icon: Wallet },
  { href: "/transactions", label: "Trades", icon: ArrowLeftRight },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/import", label: "Import", icon: Upload },
  { href: "/settings", label: "Settings", icon: Settings },
];

// All twelve destinations, for the narrow-width collapsed menu.
const allTabs = [...marketTabs, ...portfolioTabs];

// Pages that use full-width layout (market terminal pages)
const fullWidthPaths = ["/overview", "/sets", "/news", "/graded", "/watchlist", "/screener"];

function useTheme() {
  const [isDark, setIsDark] = useState(() => {
    const stored = localStorage.getItem("arca-theme");
    return stored ? stored === "diamond" : true;
  });

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
    localStorage.setItem("arca-theme", isDark ? "diamond" : "pearl");
  }, [isDark]);

  return { isDark, toggle: () => setIsDark((d) => !d), themeName: isDark ? "Diamond" : "Pearl" };
}

function isActive(href: string): boolean {
  const path = window.location.pathname;
  if (href === "/cards") return path === "/cards" || path.startsWith("/cards/");
  return path.startsWith(href);
}

export function Layout({ children }: LayoutProps) {
  const { user, logout } = useAuth();
  const theme = useTheme();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [hasOverflow, setHasOverflow] = useState(false);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);
  const tabScrollRef = useRef<HTMLDivElement>(null);
  const path = window.location.pathname;
  const isFullWidth = fullWidthPaths.some((p) => path.startsWith(p));

  // ARCA-58: scroll the active tab into view on load/navigation, and track whether the tab bar
  // overflows so the edge-fade scroll affordance only shows when there's actually more to see.
  useEffect(() => {
    const container = tabScrollRef.current;
    if (!container) return;

    const activeLink = container.querySelector<HTMLAnchorElement>('a[data-active="true"]');
    activeLink?.scrollIntoView({ block: "nearest", inline: "center" });

    const updateScrollState = () => {
      setHasOverflow(container.scrollWidth > container.clientWidth + 1);
      setAtStart(container.scrollLeft <= 0);
      setAtEnd(container.scrollLeft + container.clientWidth >= container.scrollWidth - 1);
    };
    updateScrollState();

    container.addEventListener("scroll", updateScrollState);
    window.addEventListener("resize", updateScrollState);
    return () => {
      container.removeEventListener("scroll", updateScrollState);
      window.removeEventListener("resize", updateScrollState);
    };
    // Navigation here is always a full page load (plain <a href> tags, no client router), so this
    // only needs to run on mount — there's no "path changed but Layout stayed mounted" case.
  }, []);

  return (
    <div className="min-h-screen bg-[var(--color-background)]">
      {/* Header bar */}
      <header className="sticky top-0 z-50 flex items-center border-b border-[var(--color-border)] bg-[var(--color-card)] px-3 py-0">
        {/* Logo */}
        <a href="/overview" className="flex shrink-0 items-center gap-1.5 py-2 pr-3">
          <span className="text-base font-bold tracking-tight text-[var(--color-foreground)]">
            ARCA
          </span>
          <span className="rounded bg-[var(--color-primary)] px-1 py-0.5 text-[8px] font-bold text-white">
            BETA
          </span>
        </a>

        {/* Rolling ticker — fills center */}
        <div className="min-w-0 flex-1 border-l border-r border-[var(--color-border)]">
          <RollingTicker />
        </div>

        {/* Right controls */}
        <div className="flex shrink-0 items-center gap-2 pl-3">
          <button
            onClick={theme.toggle}
            className="flex items-center gap-1 rounded px-2 py-1 text-[11px] text-[var(--color-muted-foreground)] transition-colors hover:bg-[var(--color-muted)] hover:text-[var(--color-foreground)]"
            title={`Switch to ${theme.isDark ? "Pearl" : "Diamond"} theme`}
          >
            <Diamond size={12} />
            {theme.themeName}
          </button>

          {/* User menu */}
          <div className="relative">
            <button
              onClick={() => {
                setShowUserMenu((v) => !v);
                setShowMobileMenu(false);
              }}
              className="flex items-center gap-1 rounded px-2 py-1 text-[11px] text-[var(--color-muted-foreground)] transition-colors hover:bg-[var(--color-muted)] hover:text-[var(--color-foreground)]"
            >
              <Eye size={12} />
              <span className="hidden sm:inline">{user?.name || user?.email}</span>
              <ChevronDown size={10} />
            </button>
            {showUserMenu && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowUserMenu(false)}
                  onKeyDown={() => {}}
                />
                <div className="absolute right-0 top-full z-50 mt-1 w-44 rounded-lg border border-[var(--color-border)] bg-[var(--color-popover)] p-1 shadow-lg">
                  <div className="border-b border-[var(--color-border)] px-3 py-2">
                    <p className="truncate text-xs font-medium">{user?.name}</p>
                    <p className="truncate text-[10px] text-[var(--color-muted-foreground)]">
                      {user?.email}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      logout();
                    }}
                    className="mt-1 flex w-full items-center gap-2 rounded px-3 py-1.5 text-xs text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)] hover:text-[var(--color-foreground)]"
                  >
                    <LogOut size={12} />
                    Sign out
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Tab bar */}
      <nav className="relative border-b border-[var(--color-border)] bg-[var(--color-card)]">
        <div className="flex items-center">
          {/* Mobile nav menu button — sub-1024px only, lists all twelve destinations */}
          <button
            type="button"
            onClick={() => {
              setShowMobileMenu((v) => !v);
              setShowUserMenu(false);
            }}
            className="flex shrink-0 items-center gap-1 border-r border-[var(--color-border)] px-2.5 py-2 text-[var(--color-muted-foreground)] transition-colors hover:bg-[var(--color-muted)] hover:text-[var(--color-foreground)] lg:hidden"
            aria-label="Open navigation menu"
            aria-expanded={showMobileMenu}
            data-testid="mobile-nav-menu-button"
          >
            <Menu size={16} />
          </button>

          <div className="relative min-w-0 flex-1">
            <div ref={tabScrollRef} className="overflow-x-auto">
              <div className="flex items-center px-2">
                {/* Market tabs */}
                {marketTabs.map((tab) => {
                  const Icon = tab.icon;
                  const active = isActive(tab.href);
                  return (
                    <a
                      key={tab.href}
                      href={tab.href}
                      data-active={active}
                      className={`flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2 text-[11px] font-medium transition-colors ${
                        active
                          ? "border-[var(--color-primary)] text-[var(--color-primary)]"
                          : "border-transparent text-[var(--color-muted-foreground)] hover:border-[var(--color-border)] hover:text-[var(--color-foreground)]"
                      }`}
                    >
                      <Icon size={13} />
                      {tab.label}
                    </a>
                  );
                })}

                {/* Divider */}
                <div className="mx-2 h-5 w-px shrink-0 bg-[var(--color-border)]" />

                {/* Portfolio tabs */}
                {portfolioTabs.map((tab) => {
                  const Icon = tab.icon;
                  const active = isActive(tab.href);
                  return (
                    <a
                      key={tab.href}
                      href={tab.href}
                      data-active={active}
                      className={`flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2 text-[11px] font-medium transition-colors ${
                        active
                          ? "border-[var(--color-primary)] text-[var(--color-primary)]"
                          : "border-transparent text-[var(--color-muted-foreground)] hover:border-[var(--color-border)] hover:text-[var(--color-foreground)]"
                      }`}
                    >
                      <Icon size={13} />
                      {tab.label}
                    </a>
                  );
                })}
              </div>
            </div>

            {/* Scroll affordance — narrow widths only, shown only when there's more to scroll to */}
            {hasOverflow && !atEnd && (
              <div
                className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-[var(--color-card)] to-transparent lg:hidden"
                aria-hidden="true"
              />
            )}
            {hasOverflow && !atStart && (
              <div
                className="pointer-events-none absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-[var(--color-card)] to-transparent lg:hidden"
                aria-hidden="true"
              />
            )}
          </div>
        </div>

        {/* Mobile nav menu dropdown */}
        {showMobileMenu && (
          <>
            <div
              className="fixed inset-0 z-40 lg:hidden"
              onClick={() => setShowMobileMenu(false)}
              onKeyDown={() => {}}
            />
            <div className="absolute left-0 top-full z-50 max-h-[70vh] w-64 overflow-y-auto rounded-b-lg border border-t-0 border-[var(--color-border)] bg-[var(--color-popover)] p-1 shadow-lg lg:hidden">
              {allTabs.map((tab) => {
                const Icon = tab.icon;
                const active = isActive(tab.href);
                return (
                  <a
                    key={tab.href}
                    href={tab.href}
                    className={`flex items-center gap-2 rounded px-3 py-2 text-xs font-medium transition-colors ${
                      active
                        ? "bg-[var(--color-muted)] text-[var(--color-primary)]"
                        : "text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)] hover:text-[var(--color-foreground)]"
                    }`}
                  >
                    <Icon size={14} />
                    {tab.label}
                  </a>
                );
              })}
            </div>
          </>
        )}
      </nav>

      {/* Main content */}
      <main className="overflow-auto">
        {isFullWidth ? (
          <div className="p-3 md:p-4">{children}</div>
        ) : (
          <div className="mx-auto max-w-7xl p-4 md:p-6">{children}</div>
        )}
      </main>
    </div>
  );
}
