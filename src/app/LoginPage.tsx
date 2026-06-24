import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../stores/useAuthStore';
import { LogIn, UserPlus, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const { signIn, signUp, signInWithGoogle } = useAuthStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    try {
      if (isSignUp) {
        if (!fullName.trim()) throw new Error('Full name is required');
        await signUp(email, password, fullName);
        toast.success('Account created! Let\'s setup your profile.');
        navigate('/onboarding');
      } else {
        await signIn(email, password);
        toast.success('Welcome back!');
        
        // Check if onboarding is complete
        const profile = useAuthStore.getState().profile;
        if (profile && profile.looking_for && profile.event_id) {
          navigate('/app/home');
        } else {
          navigate('/onboarding');
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Authentication failed');
      toast.error(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setErrorMsg('');
    try {
      await signInWithGoogle();
      toast.success('Logged in with Google');
      
      const profile = useAuthStore.getState().profile;
      if (profile && profile.looking_for && profile.event_id) {
        navigate('/app/home');
      } else {
        navigate('/onboarding');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Google login failed');
    }
  };

  return (
    <div className="relative min-h-screen bg-[#0F0F10] flex items-center justify-center p-6 overflow-hidden">
      
      {/* Background ambient glows */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-brand-indigo/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-brand-purple/10 blur-[120px] pointer-events-none" />

      <div className="max-w-md w-full z-10">
        
        {/* Logo Header */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-indigo to-brand-purple flex items-center justify-center font-bold text-lg text-white shadow-lg">
              H
            </div>
            <span className="font-bold text-2xl tracking-tight text-white">HackConnect</span>
          </Link>
          <p className="text-sm text-zinc-400">
            {isSignUp ? 'Join the event and connect with peers' : 'Log in to connect with your event partners'}
          </p>
        </div>

        {/* Card Panel */}
        <div className="glass-panel p-8 rounded-2xl glow-indigo border border-zinc-800 shadow-xl">
          
          {errorMsg && (
            <div className="bg-brand-rose/10 border border-brand-rose/30 text-brand-rose text-sm rounded-lg p-4 mb-6 flex items-start gap-2">
              <AlertCircle size={18} className="mt-0.5 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Google Button */}
          <button
            onClick={handleGoogleLogin}
            type="button"
            className="w-full flex items-center justify-center gap-3 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-200 font-semibold py-3 px-4 rounded-xl transition-all mb-6"
          >
            <svg className="w-4.5 h-4.5" viewBox="0 0 24 24" width="18" height="18">
              <path
                fill="#4285F4"
                d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v3.9h6.69c-.29 1.5-1.14 2.76-2.4 3.61v3h3.84c2.25-2.07 3.61-5.11 3.61-8.74z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.24 0 5.97-1.08 7.96-2.91l-3.84-3c-1.08.72-2.46 1.16-4.12 1.16-3.17 0-5.85-2.14-6.81-5.02H1.23v3.1C3.21 21.9 7.32 24 12 24z"
              />
              <path
                fill="#FBBC05"
                d="M5.19 14.23c-.25-.72-.39-1.5-.39-2.31s.14-1.59.39-2.31V6.51H1.23C.45 8.09 0 9.87 0 11.75s.45 3.66 1.23 5.24l3.96-3.1.2-1.66z"
              />
              <path
                fill="#EA4335"
                d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.96 1.19 15.24 0 12 0 7.32 0 3.21 2.1 1.23 6.51l3.96 3.1c.96-2.88 3.64-5.02 6.81-5.02z"
              />
            </svg>
            <span>Continue with Google</span>
          </button>

          <div className="relative flex py-2 items-center mb-6">
            <div className="flex-grow border-t border-zinc-800"></div>
            <span className="flex-shrink mx-4 text-xs text-zinc-500 font-semibold uppercase tracking-wider">Or email</span>
            <div className="flex-grow border-t border-zinc-800"></div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            
            {isSignUp && (
              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="Alex Rivera"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-900/60 px-4 py-3 text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-brand-indigo focus:ring-1 focus:ring-brand-indigo transition-all"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Email Address</label>
              <input
                type="email"
                required
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900/60 px-4 py-3 text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-brand-indigo focus:ring-1 focus:ring-brand-indigo transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Password</label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900/60 px-4 py-3 text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-brand-indigo focus:ring-1 focus:ring-brand-indigo transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary-gradient py-3.5 px-4 rounded-xl font-bold flex items-center justify-center gap-2 text-white shadow-lg mt-6"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-t-transparent border-white rounded-full animate-spin"></div>
              ) : isSignUp ? (
                <>
                  <UserPlus size={18} />
                  <span>Create Account</span>
                </>
              ) : (
                <>
                  <LogIn size={18} />
                  <span>Sign In</span>
                </>
              )}
            </button>
          </form>

          {/* Form Toggle */}
          <div className="text-center mt-6">
            <button
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-sm text-zinc-400 hover:text-brand-indigo transition-colors"
            >
              {isSignUp ? 'Already have an account? Sign In' : 'New to HackConnect? Create Account'}
            </button>
          </div>

        </div>

      </div>
    </div>
  );
}
