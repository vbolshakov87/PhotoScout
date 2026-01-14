import { GoogleLogin, CredentialResponse } from '@react-oauth/google';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { useState, useEffect } from 'react';

// Portfolio photos from vbolshakov.photo
const portfolioImages = [
  'https://d2xkwrs8ekvgk2.cloudfront.net/w_1200,h_856,f_webp,q_90,t_r/germany/DSC_4697-Edit.jpg',
  'https://d2xkwrs8ekvgk2.cloudfront.net/w_1200,h_800,f_webp,q_90,t_r/norway/_DSC5882-Pano-Edit.jpg',
  'https://d2xkwrs8ekvgk2.cloudfront.net/w_1200,h_800,f_webp,q_90,t_r/japan/DSC_6100.jpg',
  'https://d2xkwrs8ekvgk2.cloudfront.net/w_1200,h_869,f_webp,q_90,t_r/norway/_DSC6030-Edit.jpg',
  'https://d2xkwrs8ekvgk2.cloudfront.net/w_1200,h_800,f_webp,q_90,t_r/germany/DSC_4744-Edit.jpg',
];

export function LoginPage() {
  const { login, loginAsGuest } = useAuth();
  const navigate = useNavigate();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % portfolioImages.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleSuccess = (credentialResponse: CredentialResponse) => {
    if (credentialResponse.credential) {
      login(credentialResponse.credential);
      navigate('/');
    }
  };

  const handleGuestMode = () => {
    loginAsGuest();
    navigate('/');
  };

  return (
    <div className="min-h-screen relative flex flex-col items-center justify-between py-12 px-6 overflow-hidden">
      {/* Background photo carousel */}
      {portfolioImages.map((img, index) => (
        <div
          key={img}
          className={`absolute inset-0 transition-opacity duration-1000 ${
            index === currentImageIndex ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <img
            src={img}
            alt=""
            className="w-full h-full object-cover"
          />
        </div>
      ))}

      {/* Dark gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/90" />

      {/* Top - Logo & Tagline */}
      <div className="relative z-10 text-center pt-4">
        <div className="flex items-center justify-center gap-3 mb-2">
          <img
            src="https://aiscout.photo/city-images/appicon.png"
            alt="PhotoScout"
            className="w-12 h-12 rounded-xl shadow-lg"
          />
          <h1 className="text-3xl font-semibold text-white">PhotoScout</h1>
        </div>
        <p className="text-white/80 text-sm">Plan your perfect photo trip</p>
      </div>

      {/* Middle spacer */}
      <div className="flex-1" />

      {/* Bottom - Login Form */}
      <div className="relative z-10 w-full max-w-sm text-center">
        {/* Login Card - Compact */}
        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-4 mb-4">
          <div className="flex flex-col items-center gap-3">
            <GoogleLogin
              onSuccess={handleSuccess}
              onError={() => console.error('Login failed')}
              theme="outline"
              size="large"
              text="signin_with"
              shape="rectangular"
              use_fedcm_for_prompt={false}
            />

            <div className="flex items-center gap-3 w-full">
              <div className="flex-1 h-px bg-white/20" />
              <span className="text-xs text-white/50">or</span>
              <div className="flex-1 h-px bg-white/20" />
            </div>

            <button
              onClick={handleGuestMode}
              className="w-full py-2.5 px-4 rounded-lg border border-white/30 text-white/90 hover:bg-white/10 transition-colors text-sm font-medium"
            >
              Continue as guest
            </button>
          </div>
        </div>

        <p className="text-xs text-white/60">
          By signing in, you agree to our{' '}
          <Link to="/terms" className="text-white/90 hover:text-white underline">Terms</Link>
          {' '}and{' '}
          <Link to="/privacy" className="text-white/90 hover:text-white underline">Privacy Policy</Link>
        </p>

        {/* About and Examples links */}
        <div className="flex items-center justify-center gap-4 mt-4">
          <Link to="/about" className="text-sm text-white/70 hover:text-white transition-colors">
            About
          </Link>
          <span className="text-white/30">·</span>
          <Link to="/examples" className="text-sm text-white/70 hover:text-white transition-colors">
            Examples
          </Link>
        </div>

        {/* Photo credit */}
        <p className="text-xs text-white/40 mt-4">
          Photos by Vladimir Bolshakov
        </p>
      </div>
    </div>
  );
}
