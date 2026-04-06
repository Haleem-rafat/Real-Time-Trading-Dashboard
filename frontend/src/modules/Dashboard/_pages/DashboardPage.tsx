import { Activity, LogOut } from 'lucide-react';
import { Button } from '@UI/index';
import { useAuth } from '@hooks/useAuth';
import { useNavigate } from 'react-router';
import { ERoutes } from '@constants/routes';

/**
 * Step 10 placeholder — proves the auth flow works end-to-end.
 * Will be expanded with the live ticker list + chart in Steps 12-13.
 */
function DashboardPage() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const onLogout = () => {
    signOut();
    navigate(ERoutes.LOGIN, { replace: true });
  };

  return (
    <div className="min-h-screen bg-bg text-text">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded bg-accent-soft">
              <Activity className="h-4 w-4 text-accent" />
            </div>
            <span className="text-lg font-semibold tracking-tight">
              Trading<span className="text-accent">Term</span>
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span className="num text-xs text-text-dim">{user?.email}</span>
            <Button variant="outline" size="sm" onClick={onLogout}>
              <LogOut className="h-3.5 w-3.5" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-12">
        <h1 className="mb-2 text-3xl font-semibold tracking-tight">
          Welcome back{user?.first_name ? `, ${user.first_name}` : ''}
        </h1>
        <p className="mb-10 text-text-dim">
          Step 10 / 14 — auth flow complete. The live ticker list and chart
          arrive in Steps 12 & 13.
        </p>

        <div className="rounded-lg border border-border bg-surface p-6">
          <p className="text-sm text-text-muted">
            You are signed in as{' '}
            <span className="text-accent">{user?.email}</span>. Your JWT
            persists across reloads.
          </p>
        </div>
      </main>
    </div>
  );
}

export default DashboardPage;
