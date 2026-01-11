import { MessageSquare, Map, History, Settings } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';

export function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();

  const tabs = [
    { path: '/', icon: MessageSquare, label: 'Chat' },
    { path: '/trips', icon: Map, label: 'Trips' },
    { path: '/history', icon: History, label: 'History' },
    { path: '/settings', icon: Settings, label: 'Settings' },
  ];

  return (
    <div className="border-t border-border bg-surface pb-safe">
      <div className="flex items-center justify-around max-w-md mx-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = location.pathname === tab.path ||
            (tab.path === '/trips' && location.pathname.startsWith('/trips'));

          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              className="flex-1 flex flex-col items-center gap-1 py-3 press"
            >
              <Icon className={`w-5 h-5 ${isActive ? 'text-primary' : 'text-muted'}`} />
              <span className={`text-xs ${isActive ? 'text-foreground font-medium' : 'text-muted'}`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
