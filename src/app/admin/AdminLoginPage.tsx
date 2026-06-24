import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../../stores/useAuthStore';
import { ShieldAlert, LogIn, ChevronLeft } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdminLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const { signIn } = useAuthStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    try {
      await signIn(email, password, true); // true indicates admin portal check
      toast.success('Access granted. Welcome to Admin Panel!');
      navigate('/admin/dashboard');
    } catch (err: any) {
      setErrorMsg(err.message || 'Access Denied: Invalid credentials or role credentials');
      toast.error(err.message || 'Access Denied');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-[#0F0F10] flex items-center justify-center p-6 overflow-hidden">
      
      {/* Ambient background colors */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-brand-rose/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-brand-amber/5 blur-[120px] pointer-events-none" />

      <div className="max-w-md w-full z-10 space-y-6">
        
        {/* Back navigation */}
        <Link to="/" className="inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-white transition-colors">
          <ChevronLeft size={14} />
          <span>Back to Landing Page</span>
        </Link>

        {/* Header */}
        <div className="text-center">
          <span className="inline-flex items-center justify-center w-12 h-12 bg-brand-rose/15 border border-brand-rose/30 text-brand-rose rounded-xl mb-4">
            <ShieldAlert size={24} />
          </span>
          <h2 className="text-2xl font-bold tracking-tight text-white mb-2">Admin Portal Login</h2>
          <p className="text-sm text-zinc-400">Authenticated access for HackConnect event administrators.</p>
        </div>

        {/* Card Form */}
        <div className="glass-panel p-8 rounded-2xl border border-zinc-850 shadow-2xl">
          
          {errorMsg && (
            <div className="bg-brand-rose/10 border border-brand-rose/30 text-brand-rose text-xs rounded-xl p-4 mb-6 flex items-start gap-2">
              <AlertCircle className="mt-0.5 flex-shrink-0" size={16} />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[10px] font-semibold text-zinc-405 uppercase tracking-wider mb-2">Admin Email</label>
              <input
                type="email"
                required
                placeholder="admin@hackconnect.app"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full text-sm rounded-xl border border-zinc-800 bg-zinc-900/60 px-4 py-3 text-zinc-200 focus:outline-none focus:border-brand-rose transition-all"
              />
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-zinc-405 uppercase tracking-wider mb-2">Admin Password</label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full text-sm rounded-xl border border-zinc-800 bg-zinc-900/60 px-4 py-3 text-zinc-200 focus:outline-none focus:border-brand-rose transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-br from-brand-rose to-brand-amber text-white font-bold py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 shadow-lg mt-6 hover:opacity-95 transition-all"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-t-transparent border-white rounded-full animate-spin"></div>
              ) : (
                <>
                  <LogIn size={18} />
                  <span>Authorize Console Access</span>
                </>
              )}
            </button>
          </form>

        </div>

      </div>
    </div>
  );
}
export function AlertCircle({ className, size }: { className?: string; size?: number }) {
  return <ShieldAlert className={className} size={size} />;
}
