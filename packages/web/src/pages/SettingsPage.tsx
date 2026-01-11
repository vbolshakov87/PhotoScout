import { useAuth } from '../contexts/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import { User, Info, FileText, Shield, LogOut, ExternalLink, Camera } from 'lucide-react';

export function SettingsPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = () => {
    if (confirm('Are you sure you want to sign out?')) {
      logout();
      navigate('/login');
    }
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border">
        <h1 className="text-lg font-semibold text-foreground">Settings</h1>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Account Section */}
        <div className="p-4">
          <h2 className="text-xs font-medium text-muted uppercase tracking-wide mb-3">Account</h2>
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center gap-3">
              {user?.picture ? (
                <img
                  src={user.picture}
                  alt={user.name}
                  className="w-12 h-12 rounded-full"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-muted/30 flex items-center justify-center">
                  <User className="w-6 h-6 text-muted" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground truncate">{user?.name}</p>
                <p className="text-sm text-muted truncate">{user?.email}</p>
              </div>
            </div>
          </div>
        </div>

        {/* About Section */}
        <div className="p-4 pt-0">
          <h2 className="text-xs font-medium text-muted uppercase tracking-wide mb-3">About</h2>
          <div className="bg-card border border-border rounded-xl divide-y divide-border">
            <Link
              to="/about"
              className="flex items-center gap-3 p-4 hover:bg-muted/10 transition-colors"
            >
              <Info className="w-5 h-5 text-muted" />
              <span className="flex-1 text-foreground">About PhotoScout</span>
              <ExternalLink className="w-4 h-4 text-muted" />
            </Link>

            <a
              href="https://vbolshakov.photo"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-4 hover:bg-muted/10 transition-colors"
            >
              <Camera className="w-5 h-5 text-muted" />
              <span className="flex-1 text-foreground">Photography Portfolio</span>
              <ExternalLink className="w-4 h-4 text-muted" />
            </a>
          </div>
        </div>

        {/* Legal Section */}
        <div className="p-4 pt-0">
          <h2 className="text-xs font-medium text-muted uppercase tracking-wide mb-3">Legal</h2>
          <div className="bg-card border border-border rounded-xl divide-y divide-border">
            <Link
              to="/terms"
              className="flex items-center gap-3 p-4 hover:bg-muted/10 transition-colors"
            >
              <FileText className="w-5 h-5 text-muted" />
              <span className="flex-1 text-foreground">Terms of Service</span>
              <ExternalLink className="w-4 h-4 text-muted" />
            </Link>

            <Link
              to="/privacy"
              className="flex items-center gap-3 p-4 hover:bg-muted/10 transition-colors"
            >
              <Shield className="w-5 h-5 text-muted" />
              <span className="flex-1 text-foreground">Privacy Policy</span>
              <ExternalLink className="w-4 h-4 text-muted" />
            </Link>
          </div>
        </div>

        {/* Sign Out */}
        <div className="p-4 pt-0">
          <button
            onClick={handleSignOut}
            className="w-full bg-card border border-border rounded-xl p-4 flex items-center gap-3 hover:bg-red-500/10 transition-colors"
          >
            <LogOut className="w-5 h-5 text-red-500" />
            <span className="text-red-500">Sign Out</span>
          </button>
        </div>

        {/* App Info */}
        <div className="p-4 pt-0 pb-8">
          <h2 className="text-xs font-medium text-muted uppercase tracking-wide mb-3">App Info</h2>
          <div className="bg-card border border-border rounded-xl divide-y divide-border">
            <div className="flex items-center justify-between p-4">
              <span className="text-foreground">Version</span>
              <span className="text-muted">1.0.0</span>
            </div>
          </div>
          <p className="text-xs text-muted/60 text-center mt-4">
            Made with love for photographers
          </p>
        </div>
      </div>
    </div>
  );
}
