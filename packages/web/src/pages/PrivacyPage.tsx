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
        <p className="text-muted text-sm">Last updated: January 2024</p>

        <h2 className="text-foreground text-lg font-semibold mt-6 mb-3">1. Introduction</h2>
        <p className="text-foreground/80 text-sm leading-relaxed">
          PhotoScout ("we", "our", or "us") is committed to protecting your privacy. This Privacy
          Policy explains how we collect, use, and safeguard your information when you use our
          mobile application and website.
        </p>

        <h2 className="text-foreground text-lg font-semibold mt-6 mb-3">2. Information We Collect</h2>

        <h3 className="text-foreground text-base font-medium mt-4 mb-2">Account Information</h3>
        <p className="text-foreground/80 text-sm leading-relaxed">
          When you sign in with Google, we receive your name, email address, and profile picture.
          We use this information to create and manage your account.
        </p>

        <h3 className="text-foreground text-base font-medium mt-4 mb-2">Usage Data</h3>
        <p className="text-foreground/80 text-sm leading-relaxed">
          We collect information about your interactions with the app, including:
        </p>
        <ul className="text-foreground/80 text-sm list-disc pl-5 space-y-1">
          <li>Travel destinations you search for</li>
          <li>Photography plans you create</li>
          <li>Conversations with our AI assistant</li>
        </ul>

        <h2 className="text-foreground text-lg font-semibold mt-6 mb-3">3. How We Use Your Information</h2>
        <p className="text-foreground/80 text-sm leading-relaxed">
          We use your information to:
        </p>
        <ul className="text-foreground/80 text-sm list-disc pl-5 space-y-1">
          <li>Provide and improve our photography trip planning service</li>
          <li>Generate personalized travel recommendations</li>
          <li>Save your plans and conversation history</li>
          <li>Communicate with you about your account</li>
        </ul>

        <h2 className="text-foreground text-lg font-semibold mt-6 mb-3">4. Data Storage and Security</h2>
        <p className="text-foreground/80 text-sm leading-relaxed">
          Your data is stored securely on Amazon Web Services (AWS) infrastructure. We implement
          industry-standard security measures to protect your information from unauthorized access,
          alteration, or destruction.
        </p>

        <h2 className="text-foreground text-lg font-semibold mt-6 mb-3">5. Third-Party Services</h2>
        <p className="text-foreground/80 text-sm leading-relaxed">
          We use the following third-party services:
        </p>
        <ul className="text-foreground/80 text-sm list-disc pl-5 space-y-1">
          <li><strong>Google Sign-In:</strong> For authentication</li>
          <li><strong>Anthropic Claude:</strong> For AI-powered trip planning</li>
          <li><strong>Google Maps:</strong> For location and mapping services</li>
        </ul>

        <h2 className="text-foreground text-lg font-semibold mt-6 mb-3">6. Data Retention</h2>
        <p className="text-foreground/80 text-sm leading-relaxed">
          We retain your data for as long as your account is active. Conversation history and plans
          are automatically deleted after 90 days of inactivity. You can request deletion of your
          data at any time by contacting us.
        </p>

        <h2 className="text-foreground text-lg font-semibold mt-6 mb-3">7. Your Rights</h2>
        <p className="text-foreground/80 text-sm leading-relaxed">
          You have the right to:
        </p>
        <ul className="text-foreground/80 text-sm list-disc pl-5 space-y-1">
          <li>Access your personal data</li>
          <li>Request correction of inaccurate data</li>
          <li>Request deletion of your data</li>
          <li>Export your data</li>
        </ul>

        <h2 className="text-foreground text-lg font-semibold mt-6 mb-3">8. Children's Privacy</h2>
        <p className="text-foreground/80 text-sm leading-relaxed">
          PhotoScout is not intended for children under 13 years of age. We do not knowingly
          collect personal information from children.
        </p>

        <h2 className="text-foreground text-lg font-semibold mt-6 mb-3">9. Changes to This Policy</h2>
        <p className="text-foreground/80 text-sm leading-relaxed">
          We may update this Privacy Policy from time to time. We will notify you of any changes
          by posting the new policy on this page and updating the "Last updated" date.
        </p>

        <h2 className="text-foreground text-lg font-semibold mt-6 mb-3">10. Contact Us</h2>
        <p className="text-foreground/80 text-sm leading-relaxed">
          If you have any questions about this Privacy Policy, please contact us at:
        </p>
        <p className="text-primary text-sm mt-2">
          <a href="mailto:privacy@photoscout.app">privacy@photoscout.app</a>
        </p>

        <div className="h-8" />
      </div>
    </div>
  );
}
