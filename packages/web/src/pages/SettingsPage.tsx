import { useAuth } from '../contexts/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import { User, Info, FileText, Shield, LogOut, ExternalLink, Camera, LogIn } from 'lucide-react';
import { GoogleLogin, CredentialResponse } from '@react-oauth/google';

export function SettingsPage() {
  const { user, logout, isGuest, login } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = () => {
    if (confirm('Are you sure you want to sign out?')) {
      logout();
      navigate('/login');
    }
  };

  const handleGoogleSuccess = (credentialResponse: CredentialResponse) => {
    if (credentialResponse.credential) {
      login(credentialResponse.credential);
    }
  };

  return (
    <div className="flex flex-col h-full glass-bg morphing-blobs">
      {/* Header */}
      <div className="relative px-4 py-3 liquid-glass glass-reflection border-b border-white/10 z-10 flex items-center gap-3">
        <img
          src="https://aiscout.photo/city-images/appicon.png"
          alt="PhotoScout"
          className="w-10 h-10 rounded-xl shadow-lg shadow-amber-500/20"
        />
        <h1 className="text-lg font-semibold text-white tracking-tight">Settings</h1>
      </div>

      <div className="flex-1 overflow-y-auto glass-scrollbar relative z-10">
        {/* Account Section */}
        <div className="p-4">
          <h2 className="text-xs font-medium text-white/50 uppercase tracking-wide mb-3">
            Account
          </h2>
          <div className="liquid-glass rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-violet-500/20 to-indigo-600/20 border border-white/10 flex items-center justify-center">
                <User className="w-6 h-6 text-violet-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-white truncate">{isGuest ? 'Guest' : user?.name}</p>
                <p className="text-sm text-white/50 truncate">
                  {isGuest ? 'Not signed in' : user?.email}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* About Section */}
        <div className="p-4 pt-0">
          <h2 className="text-xs font-medium text-white/50 uppercase tracking-wide mb-3">About</h2>
          <div className="liquid-glass rounded-xl divide-y divide-white/10">
            <Link
              to="/about"
              className="flex items-center gap-3 p-4 hover:bg-white/5 transition-colors"
            >
              <Info className="w-5 h-5 text-white/60" />
              <span className="flex-1 text-white">About PhotoScout</span>
              <ExternalLink className="w-4 h-4 text-white/40" />
            </Link>

            <a
              href="https://vbolshakov.photo"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-4 hover:bg-white/5 transition-colors"
            >
              <Camera className="w-5 h-5 text-white/60" />
              <span className="flex-1 text-white">Photography Portfolio</span>
              <ExternalLink className="w-4 h-4 text-white/40" />
            </a>
          </div>
        </div>

        {/* Legal Section */}
        <div className="p-4 pt-0">
          <h2 className="text-xs font-medium text-white/50 uppercase tracking-wide mb-3">Legal</h2>
          <div className="liquid-glass rounded-xl divide-y divide-white/10">
            <Link
              to="/terms"
              className="flex items-center gap-3 p-4 hover:bg-white/5 transition-colors"
            >
              <FileText className="w-5 h-5 text-white/60" />
              <span className="flex-1 text-white">Terms of Service</span>
              <ExternalLink className="w-4 h-4 text-white/40" />
            </Link>

            <Link
              to="/privacy"
              className="flex items-center gap-3 p-4 hover:bg-white/5 transition-colors"
            >
              <Shield className="w-5 h-5 text-white/60" />
              <span className="flex-1 text-white">Privacy Policy</span>
              <ExternalLink className="w-4 h-4 text-white/40" />
            </Link>
          </div>
        </div>

        {/* Sign Out / Sign In */}
        <div className="p-4 pt-0">
          {isGuest ? (
            <div className="liquid-glass rounded-xl p-4">
              <div className="flex items-center gap-3 mb-3">
                <LogIn className="w-5 h-5 text-violet-400" />
                <span className="text-white">Sign in to save your data</span>
              </div>
              <div className="flex justify-center">
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={() => console.error('Login failed')}
                  theme="outline"
                  size="large"
                  text="signin_with"
                  shape="rectangular"
                  use_fedcm_for_prompt={false}
                />
              </div>
            </div>
          ) : (
            <button
              onClick={handleSignOut}
              className="w-full liquid-glass rounded-xl p-4 flex items-center gap-3 hover:bg-red-500/10 transition-colors"
            >
              <LogOut className="w-5 h-5 text-red-400" />
              <span className="text-red-400">Sign Out</span>
            </button>
          )}
        </div>

        {/* App Info */}
        <div className="p-4 pt-0 pb-8">
          <h2 className="text-xs font-medium text-white/50 uppercase tracking-wide mb-3">
            App Info
          </h2>
          <div className="liquid-glass rounded-xl divide-y divide-white/10">
            <div className="flex items-center justify-between p-4">
              <span className="text-white">Version</span>
              <span className="text-white/50">1.0.0</span>
            </div>
          </div>
          <p className="text-xs text-white/30 text-center mt-4">Made with love for photographers</p>
        </div>
      </div>
    </div>
  );
}
