import { type ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { Activity, Circle, LogOut } from 'lucide-react';
import { cn } from '@/shadecn/lib/utils';
import { Button } from '@UI/index';
import { useAuth } from '@hooks/useAuth';
import { useSocket } from '@hooks/useSocket';
import { ERoutes } from '@constants/routes';

interface Props {
  sidebar: ReactNode;
  children: ReactNode;
}

function DashboardLayout({ sidebar, children }: Props) {
  const { user, signOut } = useAuth();
  const { isConnected } = useSocket();
  const navigate = useNavigate();

  const onLogout = () => {
    signOut();
    navigate(ERoutes.LOGIN, { replace: true });
  };

  return (
    <div className="flex min-h-screen flex-col bg-bg text-text">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-border bg-bg/80 backdrop-blur">
        <div className="flex h-14 items-center justify-between px-4 lg:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded bg-accent-soft">
              <Activity className="h-4 w-4 text-accent" />
            </div>
            <span className="text-lg font-semibold tracking-tight">
              Trading<span className="text-accent">Term</span>
            </span>
            <span className="ml-3 hidden items-center gap-1.5 text-xs text-text-dim sm:flex">
              <Circle
                className={cn(
                  'h-2 w-2',
                  isConnected
                    ? 'fill-up text-up'
                    : 'fill-text-dim text-text-dim',
                )}
              />
              {isConnected ? 'Live' : 'Disconnected'}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="num hidden text-xs text-text-dim md:inline">
              {user?.email}
            </span>
            <Button variant="outline" size="sm" onClick={onLogout}>
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Logout</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Body — sidebar + main */}
      <div className="flex flex-1 flex-col lg:flex-row">
        <aside className="w-full shrink-0 border-r border-border bg-surface lg:w-80 lg:max-w-80">
          {sidebar}
        </aside>
        <main className="flex-1 overflow-hidden">{children}</main>
      </div>
    </div>
  );
}

export default DashboardLayout;
