import { ArrowLeft, ExternalLink, Mail, Shield, FileText, Camera } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

// Portfolio photos from vbolshakov.photo
const portfolioImages = [
  'https://d2xkwrs8ekvgk2.cloudfront.net/w_600,h_400,f_webp,q_90,t_r/germany/DSC_4697-Edit.jpg',
  'https://d2xkwrs8ekvgk2.cloudfront.net/w_600,h_400,f_webp,q_90,t_r/norway/_DSC5882-Pano-Edit.jpg',
  'https://d2xkwrs8ekvgk2.cloudfront.net/w_600,h_400,f_webp,q_90,t_r/japan/DSC_6100.jpg',
  'https://d2xkwrs8ekvgk2.cloudfront.net/w_600,h_400,f_webp,q_90,t_r/norway/_DSC6030-Edit.jpg',
];

export function AboutPage() {
  const navigate = useNavigate();

  return (
    <div className="h-full overflow-y-auto bg-background">
      {/* Header */}
      <header className="flex items-center gap-3 px-4 py-3 border-b border-border bg-surface">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 press">
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <img
          src="https://aiscout.photo/city-images/appicon.png"
          alt="PhotoScout"
          className="w-8 h-8 rounded-lg"
        />
        <h1 className="text-lg font-semibold text-foreground">About</h1>
      </header>

      <div className="p-4 space-y-6">
        {/* App Info */}
        <div className="flex items-center justify-center gap-4 py-4">
          <img
            src="https://aiscout.photo/city-images/appicon.png"
            alt="PhotoScout"
            className="w-16 h-16 rounded-2xl shadow-lg"
          />
          <div>
            <h2 className="text-xl font-bold text-foreground">PhotoScout</h2>
            <p className="text-muted text-sm">Version 1.0.0</p>
          </div>
        </div>

        {/* Description */}
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-foreground text-sm leading-relaxed">
            PhotoScout is your AI-powered photography trip planner. Tell us where you want to go,
            and we'll create a personalized itinerary with the best photography spots, optimal
            times for lighting, and interactive maps to guide your journey.
          </p>
        </div>

        {/* Photo Gallery */}
        <div>
          <h3 className="text-sm font-medium text-muted mb-3">Sample Photography</h3>
          <div className="grid grid-cols-2 gap-2 rounded-xl overflow-hidden">
            {portfolioImages.map((img, index) => (
              <img
                key={index}
                src={img}
                alt={`Sample photo ${index + 1}`}
                className="w-full h-24 object-cover"
              />
            ))}
          </div>
          <p className="text-xs text-muted/60 text-center mt-2">
            Photos by Vladimir Bolshakov
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

        {/* Creator */}
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-3">
            <Camera className="w-8 h-8 text-primary" />
            <div className="flex-1">
              <p className="text-foreground font-medium text-sm">Created by Vladimir Bolshakov</p>
              <p className="text-muted text-xs">Landscape & Travel Photographer</p>
            </div>
          </div>
          <a
            href="https://vbolshakov.photo"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 flex items-center justify-center gap-2 py-2 px-4 bg-primary/10 text-primary rounded-lg text-sm font-medium"
          >
            View Portfolio
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>

        {/* Credits */}
        <div className="text-center py-4">
          <p className="text-muted text-xs">
            Made with ❤️ for photographers
          </p>
          <p className="text-muted text-xs mt-1">
            © 2026 PhotoScout. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
