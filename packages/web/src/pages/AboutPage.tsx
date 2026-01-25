import {
  ArrowLeft,
  ExternalLink,
  Mail,
  Shield,
  FileText,
  Camera,
  Sparkles,
  MapPin,
  Sun,
  Route,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

/**
 * Renders the About page for the PhotoScout application.
 *
 * @returns The About page's JSX element containing app info, beta notice, description, features, links, creator info, and credits.
 */
export function AboutPage() {
  const navigate = useNavigate();

  return (
    <div className="h-full overflow-y-auto bg-background">
      {/* Header */}
      <header className="flex items-center gap-3 px-4 py-3 border-b border-border bg-surface">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 press">
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <h1 className="text-lg font-semibold text-foreground">About</h1>
      </header>

      <div className="p-4 space-y-6">
        {/* App Info with Beta Badge */}
        <div className="flex items-center justify-center gap-4 py-4">
          <img src="/appicon.png" alt="PhotoScout" className="w-16 h-16 rounded-2xl shadow-lg" />
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-foreground">PhotoScout</h2>
              <span className="px-2 py-0.5 bg-primary/20 text-primary text-xs font-semibold rounded-full">
                BETA
              </span>
            </div>
            <p className="text-muted text-sm">AI Photo Trip Planner</p>
          </div>
        </div>

        {/* Beta Notice */}
        <div className="bg-primary/10 border border-primary/20 rounded-xl p-4">
          <p className="text-foreground text-sm leading-relaxed">
            <strong>Welcome to the PhotoScout beta!</strong> We're actively developing new features
            and improving the experience. Your feedback helps us build a better app for
            photographers.
          </p>
          <a
            href="mailto:feedback@aiscout.photo"
            className="inline-flex items-center gap-1 text-primary text-sm font-medium mt-2"
          >
            <Mail className="w-4 h-4" />
            Send Feedback
          </a>
        </div>

        {/* Description */}
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-foreground text-sm leading-relaxed">
            PhotoScout is your AI-powered photography trip planner. Tell us where you want to go,
            and we'll create a personalized itinerary with the best photography spots, optimal times
            for lighting, and interactive maps to guide your journey.
          </p>
        </div>

        {/* Key Features */}
        <div>
          <h3 className="text-sm font-medium text-muted mb-3">Key Features</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-card border border-border rounded-xl p-3">
              <MapPin className="w-5 h-5 text-primary mb-2" />
              <p className="text-foreground text-sm font-medium">Location Discovery</p>
              <p className="text-muted text-xs">Find hidden gems and iconic spots</p>
            </div>
            <div className="bg-card border border-border rounded-xl p-3">
              <Sun className="w-5 h-5 text-primary mb-2" />
              <p className="text-foreground text-sm font-medium">Optimal Timing</p>
              <p className="text-muted text-xs">Golden hour & blue hour planning</p>
            </div>
            <div className="bg-card border border-border rounded-xl p-3">
              <Route className="w-5 h-5 text-primary mb-2" />
              <p className="text-foreground text-sm font-medium">Trip Planning</p>
              <p className="text-muted text-xs">Day-by-day itineraries</p>
            </div>
            <div className="bg-card border border-border rounded-xl p-3">
              <Sparkles className="w-5 h-5 text-primary mb-2" />
              <p className="text-foreground text-sm font-medium">AI Recommendations</p>
              <p className="text-muted text-xs">Personalized for your style</p>
            </div>
          </div>
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
            href="mailto:support@aiscout.photo"
            className="flex items-center justify-between px-4 py-3 press"
          >
            <div className="flex items-center gap-3">
              <Mail className="w-5 h-5 text-muted" />
              <span className="text-foreground">Contact Support</span>
            </div>
            <ExternalLink className="w-4 h-4 text-muted" />
          </a>
        </div>

        {/* Creator */}
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-3">
            <Camera className="w-8 h-8 text-primary" />
            <div className="flex-1">
              <p className="text-foreground font-medium text-sm">
                Built by photographers, for photographers
              </p>
              <p className="text-muted text-xs">Created with passion for visual storytelling</p>
            </div>
          </div>
        </div>

        {/* Credits */}
        <div className="text-center py-4">
          <p className="text-muted text-xs">Made with care for the photography community</p>
          <p className="text-muted text-xs mt-1">© 2026 PhotoScout (Beta). All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}
