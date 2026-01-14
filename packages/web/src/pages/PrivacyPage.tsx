import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function PrivacyPage() {
  const navigate = useNavigate();

  return (
    <div className="h-full overflow-y-auto bg-background">
      {/* Header */}
      <header className="flex items-center gap-3 px-4 py-3 border-b border-border bg-surface sticky top-0 z-10">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 press">
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <h1 className="text-lg font-semibold text-foreground">Privacy Policy</h1>
      </header>

      <div className="p-4 prose prose-invert prose-sm max-w-none">
        <p className="text-muted text-sm">Last updated: January 2026</p>

        <h2 className="text-foreground text-lg font-semibold mt-6 mb-3">1. Introduction</h2>
        <p className="text-foreground/80 text-sm leading-relaxed">
          PhotoScout ("we", "our", or "us") is committed to protecting your privacy. This Privacy
          Policy explains how we collect, use, and safeguard your information when you use our
          application and website (the "Service").
        </p>

        <h2 className="text-foreground text-lg font-semibold mt-6 mb-3">2. Information We Collect</h2>

        <h3 className="text-foreground text-base font-medium mt-4 mb-2">Account Information</h3>
        <p className="text-foreground/80 text-sm leading-relaxed">
          When you sign in with Google, we receive:
        </p>
        <ul className="text-foreground/80 text-sm list-disc pl-5 space-y-1">
          <li>Your name and email address</li>
          <li>Profile picture (if provided)</li>
          <li>Google user ID (for account identification)</li>
        </ul>

        <h3 className="text-foreground text-base font-medium mt-4 mb-2">Usage Data</h3>
        <p className="text-foreground/80 text-sm leading-relaxed">
          We collect information about your interactions with the Service:
        </p>
        <ul className="text-foreground/80 text-sm list-disc pl-5 space-y-1">
          <li>Travel destinations you search for</li>
          <li>Photography plans you create</li>
          <li>Conversations with our AI assistant</li>
          <li>Features you use and how you use them</li>
        </ul>

        <h3 className="text-foreground text-base font-medium mt-4 mb-2">Technical Data</h3>
        <p className="text-foreground/80 text-sm leading-relaxed">
          We automatically collect certain technical information:
        </p>
        <ul className="text-foreground/80 text-sm list-disc pl-5 space-y-1">
          <li>Device type and operating system</li>
          <li>Browser type (for web users)</li>
          <li>General location (country/region, not precise location)</li>
        </ul>

        <h2 className="text-foreground text-lg font-semibold mt-6 mb-3">3. How We Use Your Information</h2>
        <p className="text-foreground/80 text-sm leading-relaxed">
          We use your information to:
        </p>
        <ul className="text-foreground/80 text-sm list-disc pl-5 space-y-1">
          <li>Provide personalized photography trip recommendations</li>
          <li>Save your plans and conversation history</li>
          <li>Improve our AI recommendations over time</li>
          <li>Communicate with you about your account and the Service</li>
          <li>Analyze usage patterns to improve the Service</li>
          <li>Prevent abuse and ensure security</li>
        </ul>

        <h2 className="text-foreground text-lg font-semibold mt-6 mb-3">4. Third-Party Services</h2>
        <p className="text-foreground/80 text-sm leading-relaxed">
          We use the following third-party services to provide the Service:
        </p>
        <ul className="text-foreground/80 text-sm list-disc pl-5 space-y-1">
          <li><strong>Google Sign-In:</strong> For secure authentication</li>
          <li><strong>Anthropic (Claude AI):</strong> For AI-powered trip planning and recommendations</li>
          <li><strong>Google Imagen:</strong> For generating destination images</li>
          <li><strong>Amazon Web Services (AWS):</strong> For hosting and data storage</li>
        </ul>
        <p className="text-foreground/80 text-sm leading-relaxed mt-2">
          These services have their own privacy policies. Your conversations may be processed by
          AI providers to generate recommendations, but we do not share your personal information
          with these providers beyond what is necessary to provide the Service.
        </p>

        <h2 className="text-foreground text-lg font-semibold mt-6 mb-3">5. Data Storage and Security</h2>
        <p className="text-foreground/80 text-sm leading-relaxed">
          Your data is stored securely on Amazon Web Services (AWS) infrastructure in the EU (Frankfurt).
          We implement industry-standard security measures including encryption in transit and at rest
          to protect your information from unauthorized access.
        </p>

        <h2 className="text-foreground text-lg font-semibold mt-6 mb-3">6. Data Retention</h2>
        <p className="text-foreground/80 text-sm leading-relaxed">
          We retain your data as follows:
        </p>
        <ul className="text-foreground/80 text-sm list-disc pl-5 space-y-1">
          <li>Account information: While your account is active</li>
          <li>Conversation history and plans: Automatically deleted after 90 days of inactivity</li>
          <li>You can request deletion of your data at any time</li>
        </ul>

        <h2 className="text-foreground text-lg font-semibold mt-6 mb-3">7. Your Rights (GDPR)</h2>
        <p className="text-foreground/80 text-sm leading-relaxed">
          Under GDPR and similar regulations, you have the following rights:
        </p>
        <ul className="text-foreground/80 text-sm list-disc pl-5 space-y-1">
          <li><strong>Access:</strong> Request a copy of your personal data</li>
          <li><strong>Rectification:</strong> Request correction of inaccurate data</li>
          <li><strong>Erasure:</strong> Request deletion of your data ("right to be forgotten")</li>
          <li><strong>Portability:</strong> Request your data in a portable format</li>
          <li><strong>Objection:</strong> Object to certain processing of your data</li>
          <li><strong>Restriction:</strong> Request limitation of processing</li>
        </ul>
        <p className="text-foreground/80 text-sm leading-relaxed mt-2">
          To exercise these rights, contact us at the email below.
        </p>

        <h2 className="text-foreground text-lg font-semibold mt-6 mb-3">8. Cookies and Local Storage</h2>
        <p className="text-foreground/80 text-sm leading-relaxed">
          We use essential cookies and local storage to:
        </p>
        <ul className="text-foreground/80 text-sm list-disc pl-5 space-y-1">
          <li>Keep you signed in to your account</li>
          <li>Remember your preferences</li>
          <li>Store conversation state temporarily</li>
        </ul>
        <p className="text-foreground/80 text-sm leading-relaxed mt-2">
          We do not use third-party tracking cookies or analytics cookies. We do not sell your
          data to advertisers.
        </p>

        <h2 className="text-foreground text-lg font-semibold mt-6 mb-3">9. Children's Privacy</h2>
        <p className="text-foreground/80 text-sm leading-relaxed">
          PhotoScout is not intended for children under 16 years of age. We do not knowingly
          collect personal information from children. If you believe we have collected data from
          a child, please contact us.
        </p>

        <h2 className="text-foreground text-lg font-semibold mt-6 mb-3">10. International Transfers</h2>
        <p className="text-foreground/80 text-sm leading-relaxed">
          Your data is primarily stored in the EU. Some third-party services (like AI providers)
          may process data in other regions. We ensure appropriate safeguards are in place for
          any international data transfers.
        </p>

        <h2 className="text-foreground text-lg font-semibold mt-6 mb-3">11. Changes to This Policy</h2>
        <p className="text-foreground/80 text-sm leading-relaxed">
          We may update this Privacy Policy from time to time. We will notify you of significant
          changes by posting a notice in the app or sending you an email. Continued use of the
          Service after changes constitutes acceptance of the updated policy.
        </p>

        <h2 className="text-foreground text-lg font-semibold mt-6 mb-3">12. Contact Us</h2>
        <p className="text-foreground/80 text-sm leading-relaxed">
          If you have any questions about this Privacy Policy or wish to exercise your rights,
          please contact us at:
        </p>
        <p className="text-primary text-sm mt-2">
          <a href="mailto:privacy@aiscout.photo">privacy@aiscout.photo</a>
        </p>

        <div className="h-8" />
      </div>
    </div>
  );
}
