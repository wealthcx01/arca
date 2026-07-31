import { ErrorBoundary } from "./components/ErrorBoundary";
import { Layout } from "./components/Layout";
import { ToastProvider } from "./components/ui/Toaster";
import { AuthProvider, useAuth } from "./hooks/useAuth";
import { AnalyticsPage } from "./pages/AnalyticsPage";
import { CardDetailPage } from "./pages/CardDetailPage";
import { CardsPage } from "./pages/CardsPage";
import { DashboardPage } from "./pages/DashboardPage";
import { GradedMarketPage } from "./pages/GradedMarketPage";
import { ImportPage } from "./pages/ImportPage";
import { LoginPage } from "./pages/LoginPage";
import { MarketNewsPage } from "./pages/MarketNewsPage";
import { OverviewPage } from "./pages/OverviewPage";
import { ScreenerPage } from "./pages/ScreenerPage";
import { SetsErasPage } from "./pages/SetsErasPage";
import { SettingsPage } from "./pages/SettingsPage";
import { TransactionsPage } from "./pages/TransactionsPage";
import { WatchlistPage } from "./pages/WatchlistPage";
import "./index.css";

function Router() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--color-background)]">
        <div className="text-sm text-[var(--color-muted-foreground)]">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  // Simple path-based routing
  const path = window.location.pathname;

  let page: React.ReactNode;
  if (path === "/overview") {
    page = <OverviewPage />;
  } else if (path === "/sets") {
    page = <SetsErasPage />;
  } else if (path === "/news") {
    page = <MarketNewsPage />;
  } else if (path.startsWith("/cards/") && path.length > 7) {
    page = <CardDetailPage />;
  } else if (path === "/cards") {
    page = <CardsPage />;
  } else if (path === "/graded") {
    page = <GradedMarketPage />;
  } else if (path === "/watchlist") {
    page = <WatchlistPage />;
  } else if (path === "/screener") {
    page = <ScreenerPage />;
  } else if (path === "/portfolio" || path === "/dashboard") {
    page = <DashboardPage />;
  } else if (path === "/analytics") {
    page = <AnalyticsPage />;
  } else if (path === "/import") {
    page = <ImportPage />;
  } else if (path === "/settings") {
    page = <SettingsPage />;
  } else if (path.startsWith("/transactions")) {
    page = <TransactionsPage />;
  } else {
    // Default: redirect to overview
    window.location.pathname = "/overview";
    return null;
  }

  return (
    <Layout>
      <ErrorBoundary key={path}>{page}</ErrorBoundary>
    </Layout>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <Router />
      </ToastProvider>
    </AuthProvider>
  );
}
