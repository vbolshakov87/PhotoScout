import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function TermsPage() {
  const navigate = useNavigate();

  return (
    <div className="h-full overflow-y-auto bg-background">
      {/* Header */}
      <header className="flex items-center gap-3 px-4 py-3 border-b border-border bg-surface sticky top-0 z-10">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 press">
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <h1 className="text-lg font-semibold text-foreground">Terms of Service</h1>
      </header>

      <div className="p-4 prose prose-invert prose-sm max-w-none">
        <p className="text-muted text-sm">Last updated: January 2024</p>

        <h2 className="text-foreground text-lg font-semibold mt-6 mb-3">1. Acceptance of Terms</h2>
        <p className="text-foreground/80 text-sm leading-relaxed">
          By accessing or using PhotoScout ("the Service"), you agree to be bound by these Terms
          of Service. If you do not agree to these terms, please do not use the Service.
        </p>

        <h2 className="text-foreground text-lg font-semibold mt-6 mb-3">2. Description of Service</h2>
        <p className="text-foreground/80 text-sm leading-relaxed">
          PhotoScout is an AI-powered photography trip planning application that helps users
          discover photography locations, plan itineraries, and create interactive travel guides.
        </p>

        <h2 className="text-foreground text-lg font-semibold mt-6 mb-3">3. User Accounts</h2>
        <p className="text-foreground/80 text-sm leading-relaxed">
          To use certain features of the Service, you must sign in with your Google account.
          You are responsible for maintaining the confidentiality of your account and for all
          activities that occur under your account.
        </p>

        <h2 className="text-foreground text-lg font-semibold mt-6 mb-3">4. Acceptable Use</h2>
        <p className="text-foreground/80 text-sm leading-relaxed">
          You agree not to:
        </p>
        <ul className="text-foreground/80 text-sm list-disc pl-5 space-y-1">
          <li>Use the Service for any unlawful purpose</li>
          <li>Attempt to gain unauthorized access to any part of the Service</li>
          <li>Interfere with or disrupt the Service</li>
          <li>Upload malicious code or content</li>
          <li>Impersonate any person or entity</li>
          <li>Use the Service to generate harmful or misleading content</li>
        </ul>

        <h2 className="text-foreground text-lg font-semibold mt-6 mb-3">5. AI-Generated Content</h2>
        <p className="text-foreground/80 text-sm leading-relaxed">
          PhotoScout uses artificial intelligence to generate travel recommendations and plans.
          While we strive for accuracy, AI-generated content may contain errors or inaccuracies.
          You should verify important information independently before making travel decisions.
        </p>

        <h2 className="text-foreground text-lg font-semibold mt-6 mb-3">6. Intellectual Property</h2>
        <p className="text-foreground/80 text-sm leading-relaxed">
          The Service and its original content, features, and functionality are owned by
          PhotoScout and are protected by international copyright, trademark, and other
          intellectual property laws.
        </p>

        <h2 className="text-foreground text-lg font-semibold mt-6 mb-3">7. User Content</h2>
        <p className="text-foreground/80 text-sm leading-relaxed">
          You retain ownership of any content you submit through the Service. By submitting
          content, you grant us a license to use, store, and process that content to provide
          and improve the Service.
        </p>

        <h2 className="text-foreground text-lg font-semibold mt-6 mb-3">8. Disclaimer of Warranties</h2>
        <p className="text-foreground/80 text-sm leading-relaxed">
          THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND,
          EITHER EXPRESS OR IMPLIED. WE DO NOT GUARANTEE THAT THE SERVICE WILL BE UNINTERRUPTED,
          SECURE, OR ERROR-FREE.
        </p>

        <h2 className="text-foreground text-lg font-semibold mt-6 mb-3">9. Limitation of Liability</h2>
        <p className="text-foreground/80 text-sm leading-relaxed">
          TO THE MAXIMUM EXTENT PERMITTED BY LAW, PHOTOSCOUT SHALL NOT BE LIABLE FOR ANY INDIRECT,
          INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES ARISING FROM YOUR USE OF THE SERVICE.
        </p>

        <h2 className="text-foreground text-lg font-semibold mt-6 mb-3">10. Travel Safety</h2>
        <p className="text-foreground/80 text-sm leading-relaxed">
          PhotoScout provides travel recommendations for informational purposes only. You are
          solely responsible for your safety while traveling. Always check local conditions,
          weather, and safety advisories before visiting any location.
        </p>

        <h2 className="text-foreground text-lg font-semibold mt-6 mb-3">11. Modifications</h2>
        <p className="text-foreground/80 text-sm leading-relaxed">
          We reserve the right to modify or terminate the Service at any time without notice.
          We may also update these Terms from time to time. Continued use of the Service after
          changes constitutes acceptance of the new Terms.
        </p>

        <h2 className="text-foreground text-lg font-semibold mt-6 mb-3">12. Governing Law</h2>
        <p className="text-foreground/80 text-sm leading-relaxed">
          These Terms shall be governed by and construed in accordance with applicable laws,
          without regard to conflict of law principles.
        </p>

        <h2 className="text-foreground text-lg font-semibold mt-6 mb-3">13. Contact</h2>
        <p className="text-foreground/80 text-sm leading-relaxed">
          For questions about these Terms of Service, please contact us at:
        </p>
        <p className="text-primary text-sm mt-2">
          <a href="mailto:legal@photoscout.app">legal@photoscout.app</a>
        </p>

        <div className="h-8" />
      </div>
    </div>
  );
}
