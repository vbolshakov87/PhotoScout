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

  const handleError = () => {
    console.error('Google Login Failed');
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
      <div className="max-w-md w-full text-center">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <Camera className="w-12 h-12 text-primary" />
          <h1 className="text-4xl font-bold">PhotoScout</h1>
        </div>

        {/* Subtitle */}
        <p className="text-lg text-gray-400 mb-8">
          Plan your perfect photography trip with AI
        </p>

        {/* Login Card */}
        <div className="bg-card border border-white/10 rounded-xl p-8 mb-6">
          <h2 className="text-2xl font-semibold mb-4">Welcome</h2>
          <p className="text-gray-400 mb-6">
            Sign in with Google to save your trips and chat history
          </p>

          <div className="flex justify-center">
            <GoogleLogin
              onSuccess={handleSuccess}
              onError={handleError}
              theme="filled_black"
              size="large"
              text="signin_with"
              shape="rectangular"
            />
          </div>
        </div>

        {/* Features */}
        <div className="text-left space-y-3">
          <div className="flex items-start gap-3 text-sm text-gray-400">
            <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2" />
            <p>AI-powered photography location recommendations</p>
          </div>
          <div className="flex items-start gap-3 text-sm text-gray-400">
            <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2" />
            <p>Interactive maps with best shooting times</p>
          </div>
          <div className="flex items-start gap-3 text-sm text-gray-400">
            <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2" />
            <p>Save and organize all your photo trips</p>
          </div>
        </div>
      </div>
    </div>
  );
}
