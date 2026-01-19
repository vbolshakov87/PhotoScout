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
    <div className="relative liquid-glass glass-reflection border-t border-white/10 pb-safe z-10">
      <div className="flex items-center justify-around max-w-md mx-auto py-2.5 px-4">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive =
            location.pathname === tab.path ||
            (tab.path === '/trips' && location.pathname.startsWith('/trips'));

          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              className={`flex flex-col items-center gap-1.5 relative transition-all duration-300 ${
                isActive ? 'text-white scale-105' : 'text-white/40 hover:text-white/60'
              }`}
            >
              <div className="relative">
                {isActive && (
                  <div className="absolute -inset-1.5 bg-violet-500/20 rounded-xl blur-sm" />
                )}
                <div
                  className={`relative w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-300 ${
                    isActive
                      ? 'bg-gradient-to-br from-violet-500 to-indigo-600 shadow-md shadow-violet-500/30'
                      : 'hover:bg-white/5'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                </div>
              </div>
              <span
                className={`text-xs font-medium transition-all duration-300 ${
                  isActive ? 'opacity-100' : 'opacity-70'
                }`}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
