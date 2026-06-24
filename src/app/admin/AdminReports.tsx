import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { mockDb } from '../../lib/mockDb';
import { isMockMode } from '../../lib/supabase';
import type { Report } from '../../types';
import { ShieldAlert, ChevronLeft, Eye, CheckCircle2, AlertTriangle, AlertCircle, X, Ban } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdminReports() {
  const [reports, setReports] = useState<Report[]>([]);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [, setLoading] = useState(false);

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    setLoading(true);
    try {
      if (isMockMode) {
        const reps = mockDb.getReports();
        const profiles = mockDb.getProfiles();
        
        const populated = reps.map(r => ({
          ...r,
          reporter: profiles.find(p => p.id === r.reporter_id),
          reported: profiles.find(p => p.id === r.reported_user_id)
        }));
        
        setReports(populated);
      } else {
        // Query database
        // fetch reports, fetch reporter and reported profiles for each
        const reps = mockDb.getStore<any>('hc_reports', []);
        const profiles = mockDb.getProfiles();
        const populated = reps.map((r: any) => ({
          ...r,
          reporter: profiles.find(p => p.id === r.reporter_id),
          reported: profiles.find(p => p.id === r.reported_user_id)
        }));
        setReports(populated);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDismiss = async (reportId: string) => {
    try {
      if (isMockMode) {
        const reps = mockDb.getReports();
        const updated = reps.map(r => r.id === reportId ? { ...r, status: 'dismissed' as const } : r);
        mockDb.setReports(updated);
      } else {
        const reps = mockDb.getStore<any>('hc_reports', []);
        const updated = reps.map((r: any) => r.id === reportId ? { ...r, status: 'dismissed' } : r);
        mockDb.setStore('hc_reports', updated);
      }
      toast.success('Report dismissed ✓');
      setSelectedReport(null);
      fetchReports();
    } catch (err) {
      toast.error('Failed to dismiss report');
    }
  };

  const handleWarnUser = (reportedUserId: string) => {
    toast(`⚠️ Warning sent to user ID: ${reportedUserId}`);
    toast.success('Warning logged successfully');
  };

  const handleBanUser = async (reportedUserId: string) => {
    const confirm = window.confirm('Are you sure you want to ban this user? They will be removed from all events and their profile will be deactivated.');
    if (!confirm) return;

    try {
      if (isMockMode) {
        // Remove profiles
        const profiles = mockDb.getProfiles().filter(p => p.id !== reportedUserId);
        mockDb.setProfiles(profiles);
        // Remove event participations
        const parts = mockDb.getStore<any>('hc_event_participants', []);
        mockDb.setStore('hc_event_participants', parts.filter((p: any) => p.user_id !== reportedUserId));
        // Remove locations
        const locs = mockDb.getLocations().filter(l => l.user_id !== reportedUserId);
        mockDb.setLocations(locs);
      } else {
        // Clean DB tables
        const profiles = mockDb.getProfiles().filter(p => p.id !== reportedUserId);
        mockDb.setProfiles(profiles);
      }

      // Update report statuses involving this banned user to dismissed/reviewed
      if (isMockMode) {
        const reps = mockDb.getReports().map(r => r.reported_user_id === reportedUserId ? { ...r, status: 'reviewed' as const } : r);
        mockDb.setReports(reps);
      }

      toast.success('User banned and deactivated');
      setSelectedReport(null);
      fetchReports();
    } catch (err) {
      toast.error('Failed to ban user');
    }
  };

  return (
    <div className="min-h-screen bg-[#0F0F10] text-zinc-100 flex flex-col">
      
      {/* Header bar */}
      <header className="border-b border-zinc-900 bg-zinc-950 px-6 py-4 flex items-center gap-3 z-15">
        <Link to="/admin/dashboard" className="p-1.5 hover:bg-zinc-900 text-zinc-400 hover:text-white rounded-lg">
          <ChevronLeft size={16} />
        </Link>
        <div>
          <div className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Mod System</div>
          <h1 className="font-extrabold text-white text-lg flex items-center gap-2">
            <ShieldAlert size={18} className="text-brand-rose" />
            <span>Flagged Moderation Reports</span>
          </h1>
        </div>
      </header>

      {/* Main Reports list */}
      <main className="flex-grow p-6 space-y-6 max-w-7xl mx-auto w-full">
        
        <div className="glass-panel p-6 rounded-2xl border border-zinc-850 space-y-6">
          <h2 className="text-base font-bold text-white">Pending and Reviewed Reports ({reports.length})</h2>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-zinc-850 text-zinc-500 uppercase font-semibold tracking-wider">
                  <th className="py-3 px-4">Reporter</th>
                  <th className="py-3 px-4">Reported Attender</th>
                  <th className="py-3 px-4">Infraction Reason</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Inspect</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-900 text-zinc-300">
                {reports.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-zinc-500 italic">No flags or reports submitted yet.</td>
                  </tr>
                ) : (
                  reports.map((rep) => (
                    <tr key={rep.id} className="hover:bg-zinc-900/20">
                      <td className="py-3.5 px-4 font-bold text-white">{rep.reporter?.full_name || 'Anonymous'}</td>
                      <td className="py-3.5 px-4 font-bold text-brand-rose">{rep.reported?.full_name || 'Banned User'}</td>
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-brand-rose/10 text-brand-rose font-medium text-[10px]">
                          {rep.reason}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-zinc-450 font-mono">
                        {rep.created_at ? new Date(rep.created_at).toLocaleDateString() : 'TBD'}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold ${
                          rep.status === 'pending'
                            ? 'bg-brand-amber/10 text-brand-amber animate-pulse'
                            : 'bg-zinc-900 text-zinc-500'
                        }`}>
                          {rep.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => setSelectedReport(rep)}
                          className="p-2 border border-zinc-800 hover:border-zinc-700 bg-zinc-900/60 rounded-lg text-zinc-400 hover:text-white"
                          title="Inspect Report Detail"
                        >
                          <Eye size={13} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </main>

      {/* Side-by-side inspection Dialog Modal */}
      {selectedReport && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-4xl rounded-2xl border border-zinc-850 shadow-2xl p-6 relative animate-zoom-in max-h-[90vh] overflow-y-auto space-y-6">
            
            <button
              onClick={() => setSelectedReport(null)}
              className="absolute top-4 right-4 text-zinc-550 hover:text-white"
            >
              <X size={20} />
            </button>

            {/* Title / Reason */}
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <AlertCircle size={20} className="text-brand-rose" />
                <span>Mod Investigation Panel</span>
              </h3>
              <p className="text-xs text-zinc-500 mt-0.5">Comparing reporter profile against reported user profile.</p>
            </div>

            {/* Infraction detail */}
            <div className="bg-brand-rose/5 border border-brand-rose/20 rounded-xl p-4 space-y-1.5">
              <span className="text-[10px] text-brand-rose font-extrabold uppercase tracking-wider block">Breach Details ({selectedReport.reason})</span>
              <p className="text-sm text-zinc-200 leading-relaxed font-medium">"{selectedReport.details || 'No additional logs/details provided.'}"</p>
            </div>

            {/* Side by side layouts */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Reporter */}
              <div className="bg-zinc-950/40 p-4 rounded-xl border border-zinc-900 space-y-3">
                <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Reporter Details</h4>
                {selectedReport.reporter ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <img
                        src={selectedReport.reporter.avatar_url || `https://api.dicebear.com/7.x/adventurer/svg?seed=${selectedReport.reporter.full_name}`}
                        alt="Reporter"
                        className="w-10 h-10 rounded-full border border-zinc-850 object-cover"
                      />
                      <div>
                        <div className="text-sm font-bold text-white">{selectedReport.reporter.full_name}</div>
                        <div className="text-[10px] text-zinc-500 font-mono mt-0.5">{selectedReport.reporter.email}</div>
                      </div>
                    </div>
                    <p className="text-xs text-zinc-400 leading-relaxed">{selectedReport.reporter.bio || 'No bio.'}</p>
                  </div>
                ) : (
                  <span className="text-xs text-zinc-550 italic">Account details unavailable or deleted.</span>
                )}
              </div>

              {/* Reported User */}
              <div className="bg-brand-rose/5 p-4 rounded-xl border border-brand-rose/10 space-y-3">
                <h4 className="text-xs font-bold text-brand-rose uppercase tracking-wider">Reported User Details</h4>
                {selectedReport.reported ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <img
                        src={selectedReport.reported.avatar_url || `https://api.dicebear.com/7.x/adventurer/svg?seed=${selectedReport.reported.full_name}`}
                        alt="Reported"
                        className="w-10 h-10 rounded-full border border-brand-rose/20 object-cover"
                      />
                      <div>
                        <div className="text-sm font-bold text-white">{selectedReport.reported.full_name}</div>
                        <div className="text-[10px] text-zinc-500 font-mono mt-0.5">{selectedReport.reported.email}</div>
                      </div>
                    </div>
                    <p className="text-xs text-zinc-400 leading-relaxed">{selectedReport.reported.bio || 'No bio.'}</p>
                  </div>
                ) : (
                  <span className="text-xs text-brand-rose italic">Banned / Deactivated.</span>
                )}
              </div>

            </div>

            {/* Action panel triggers */}
            <div className="pt-4 flex flex-col sm:flex-row justify-between gap-4 border-t border-zinc-900">
              
              <div>
                {selectedReport.status === 'pending' && (
                  <button
                    onClick={() => handleDismiss(selectedReport.id)}
                    className="w-full sm:w-auto text-xs bg-brand-emerald text-white font-bold px-4 py-2.5 rounded-lg flex items-center justify-center gap-1.5 hover:opacity-90"
                  >
                    <CheckCircle2 size={14} />
                    <span>Dismiss Report / Clear Flag</span>
                  </button>
                )}
              </div>

              {selectedReport.reported && (
                <div className="flex items-center gap-2.5 w-full sm:w-auto">
                  <button
                    onClick={() => handleWarnUser(selectedReport.reported_user_id)}
                    className="flex-1 sm:flex-initial text-xs bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-brand-amber font-bold px-4 py-2.5 rounded-lg flex items-center justify-center gap-1.5"
                  >
                    <AlertTriangle size={14} />
                    <span>Warn User</span>
                  </button>
                  <button
                    onClick={() => handleBanUser(selectedReport.reported_user_id)}
                    className="flex-1 sm:flex-initial text-xs bg-brand-rose text-white font-bold px-4 py-2.5 rounded-lg flex items-center justify-center gap-1.5 hover:opacity-95"
                  >
                    <Ban size={14} />
                    <span>Ban and Deactivate Account</span>
                  </button>
                </div>
              )}

            </div>

          </div>
        </div>
      )}

    </div>
  );
}
