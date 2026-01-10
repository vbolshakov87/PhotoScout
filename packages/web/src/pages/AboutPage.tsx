import { Camera, ArrowLeft, ExternalLink, Mail, Shield, FileText } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

export function AboutPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-full bg-background">
      {/* Header */}
      <header className="flex items-center gap-3 px-4 py-3 border-b border-border bg-surface">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 press">
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <h1 className="text-lg font-semibold text-foreground">About</h1>
      </header>

      <div className="p-4 space-y-6">
        {/* App Info */}
        <div className="flex flex-col items-center py-6">
          <div className="w-20 h-20 rounded-2xl bg-primary flex items-center justify-center mb-4">
            <Camera className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-xl font-bold text-foreground">PhotoScout</h2>
          <p className="text-muted text-sm">Version 1.0.0</p>
        </div>

        {/* Description */}
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-foreground text-sm leading-relaxed">
            PhotoScout is your AI-powered photography trip planner. Tell us where you want to go,
            and we'll create a personalized itinerary with the best photography spots, optimal
            times for lighting, and interactive maps to guide your journey.
          </p>
        </div>

        {/* Links */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <Link
            to="/privacy"
            className="flex items-center justify-between px-4 py-3 border-b border-border press"
          >
            <div className="flex items-center gap-3">
              <Shield className="w-5 h-5 text-muted" />
              <span className="text-foreground">Privacy Policy</span>
            </div>
            <ExternalLink className="w-4 h-4 text-muted" />
          </Link>

          <Link
            to="/terms"
            className="flex items-center justify-between px-4 py-3 border-b border-border press"
          >
            <div className="flex items-center gap-3">
              <FileText className="w-5 h-5 text-muted" />
              <span className="text-foreground">Terms of Service</span>
            </div>
            <ExternalLink className="w-4 h-4 text-muted" />
          </Link>

          <a
            href="mailto:support@photoscout.app"
            className="flex items-center justify-between px-4 py-3 press"
          >
            <div className="flex items-center gap-3">
              <Mail className="w-5 h-5 text-muted" />
              <span className="text-foreground">Contact Support</span>
            </div>
            <ExternalLink className="w-4 h-4 text-muted" />
          </a>
        </div>

        {/* Credits */}
        <div className="text-center py-4">
          <p className="text-muted text-xs">
            Made with ❤️ for photographers
          </p>
          <p className="text-muted text-xs mt-1">
            © 2024 PhotoScout. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
