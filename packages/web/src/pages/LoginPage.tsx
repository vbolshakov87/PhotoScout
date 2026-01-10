import { GoogleLogin, CredentialResponse } from '@react-oauth/google';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Camera } from 'lucide-react';

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSuccess = (credentialResponse: CredentialResponse) => {
    if (credentialResponse.credential) {
      login(credentialResponse.credential);
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm text-center">
        {/* Logo */}
        <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center mx-auto mb-6">
          <Camera className="w-8 h-8 text-white" />
        </div>

        <h1 className="text-2xl font-semibold text-foreground mb-2">PhotoScout</h1>
        <p className="text-muted text-sm mb-8">Plan your perfect photo trip</p>

        {/* Login Card */}
        <div className="bg-card border border-border rounded-xl p-6 mb-6">
          <p className="text-sm text-muted mb-6">
            Sign in to save your trips and chat history
          </p>

          <div className="flex justify-center">
            <GoogleLogin
              onSuccess={handleSuccess}
              onError={() => console.error('Login failed')}
              theme="filled_black"
              size="large"
              text="signin_with"
              shape="rectangular"
            />
          </div>
        </div>

        <p className="text-xs text-muted/70">
          By signing in, you agree to our Terms and Privacy Policy
        </p>
      </div>
    </div>
  );
}
