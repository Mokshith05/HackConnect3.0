import { useState } from 'react';
import { useAuthStore } from '../../stores/useAuthStore';
import { useNetworkingStore } from '../../stores/useNetworkingStore';
import { Inbox, Send, Check, X } from 'lucide-react';
import toast from 'react-hot-toast';

export default function RequestsPage() {
  const { user, profile } = useAuthStore();
  const { 
    sentRequests, 
    receivedRequests, 
    respondRequest, 
    cancelRequest 
  } = useNetworkingStore();

  const [activeTab, setActiveTab] = useState<'incoming' | 'outgoing'>('incoming');

  const handleAccept = async (requestId: string) => {
    if (!user || !profile?.event_id) return;
    try {
      await respondRequest(requestId, 'accepted', user.id, profile.event_id);
      toast.success("✅ You're now connected!");
    } catch (err) {
      toast.error('Failed to accept request');
    }
  };

  const handleDecline = async (requestId: string) => {
    if (!user || !profile?.event_id) return;
    try {
      await respondRequest(requestId, 'rejected', user.id, profile.event_id);
      toast.success('Request declined');
    } catch (err) {
      toast.error('Failed to decline request');
    }
  };

  const handleCancel = async (requestId: string) => {
    if (!user || !profile?.event_id) return;
    try {
      await cancelRequest(requestId, user.id, profile.event_id);
      toast.success('Request cancelled');
    } catch (err) {
      toast.error('Failed to cancel request');
    }
  };

  return (
    <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6 pb-24 md:pb-12">
      
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white mb-1">Connection Requests</h1>
        <p className="text-sm text-zinc-400">Manage incoming matching invitations and outbound connections requests.</p>
      </div>

      {/* Tabs list */}
      <div className="flex bg-zinc-950 p-1 rounded-xl border border-zinc-900 w-full max-w-sm">
        <button
          onClick={() => setActiveTab('incoming')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all ${
            activeTab === 'incoming'
              ? 'bg-brand-indigo text-white shadow'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          <Inbox size={14} />
          <span>Incoming ({receivedRequests.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('outgoing')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all ${
            activeTab === 'outgoing'
              ? 'bg-brand-indigo text-white shadow'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          <Send size={14} />
          <span>Outgoing ({sentRequests.length})</span>
        </button>
      </div>

      {/* Active Tab View */}
      {activeTab === 'incoming' ? (
        <div className="space-y-4 max-w-3xl">
          {receivedRequests.length === 0 ? (
            <div className="text-center py-16 border border-dashed border-zinc-850 rounded-2xl bg-zinc-950/20 text-zinc-500 text-sm">
              No pending incoming requests. Check back later or use AI matches to discover partners.
            </div>
          ) : (
            receivedRequests.map((req) => (
              <div
                key={req.id}
                className="glass-panel p-5 rounded-2xl border border-zinc-850 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="flex items-start gap-4">
                  <img
                    src={req.sender?.avatar_url || `https://api.dicebear.com/7.x/adventurer/svg?seed=${req.sender?.full_name}`}
                    alt={req.sender?.full_name}
                    className="w-12 h-12 rounded-full border border-zinc-800 object-cover flex-shrink-0"
                  />
                  <div className="space-y-1">
                    <h3 className="font-bold text-sm text-white">{req.sender?.full_name}</h3>
                    <p className="text-xs text-zinc-400 font-semibold">{req.sender?.looking_for ? `Looking for ${req.sender?.looking_for}` : 'Networking'}</p>
                    
                    {/* Skills pills */}
                    <div className="flex flex-wrap gap-1 pt-1">
                      {req.sender?.skills.slice(0, 3).map(skill => (
                        <span key={skill} className="text-[9px] bg-brand-indigo/10 text-brand-indigo px-2 py-0.5 rounded-full">
                          {skill}
                        </span>
                      ))}
                    </div>

                    {/* Intro message */}
                    {req.message && (
                      <div className="bg-zinc-950/60 border border-zinc-900 rounded-xl p-3 mt-2 text-xs text-zinc-305 max-w-md">
                        <span className="text-brand-indigo font-bold text-[10px] block uppercase tracking-wider mb-1">Intro Message:</span>
                        "{req.message}"
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex sm:flex-col gap-2 w-full sm:w-auto self-end sm:self-center">
                  <button
                    onClick={() => handleAccept(req.id)}
                    className="flex-1 sm:flex-initial text-xs bg-brand-emerald hover:opacity-90 text-white font-bold px-4 py-2.5 rounded-lg flex items-center justify-center gap-1.5"
                  >
                    <Check size={14} />
                    <span>Accept Connection</span>
                  </button>
                  <button
                    onClick={() => handleDecline(req.id)}
                    className="flex-1 sm:flex-initial text-xs bg-zinc-900 border border-zinc-805 hover:bg-zinc-800 text-zinc-400 font-semibold px-4 py-2.5 rounded-lg flex items-center justify-center gap-1.5"
                  >
                    <X size={14} />
                    <span>Decline Invitation</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        <div className="space-y-4 max-w-3xl">
          {sentRequests.length === 0 ? (
            <div className="text-center py-16 border border-dashed border-zinc-850 rounded-2xl bg-zinc-950/20 text-zinc-500 text-sm">
              No outgoing requests. Explore the directory or AI match boards to make connections.
            </div>
          ) : (
            sentRequests.map((req) => (
              <div
                key={req.id}
                className="glass-panel p-5 rounded-2xl border border-zinc-850 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="flex items-start gap-4">
                  <img
                    src={req.receiver?.avatar_url || `https://api.dicebear.com/7.x/adventurer/svg?seed=${req.receiver?.full_name}`}
                    alt={req.receiver?.full_name}
                    className="w-12 h-12 rounded-full border border-zinc-800 object-cover flex-shrink-0"
                  />
                  <div className="space-y-1">
                    <h3 className="font-bold text-sm text-white">{req.receiver?.full_name}</h3>
                    <p className="text-xs text-zinc-400 font-semibold">{req.receiver?.looking_for ? `Looking for ${req.receiver?.looking_for}` : 'Networking'}</p>
                    
                    {/* Skills pills */}
                    <div className="flex flex-wrap gap-1 pt-1">
                      {req.receiver?.skills.slice(0, 3).map(skill => (
                        <span key={skill} className="text-[9px] bg-brand-indigo/10 text-brand-indigo px-2 py-0.5 rounded-full">
                          {skill}
                        </span>
                      ))}
                    </div>

                    {req.message && (
                      <div className="bg-zinc-950/30 border border-zinc-900/60 rounded-xl p-2.5 mt-2 text-[11px] text-zinc-400 max-w-md italic">
                        "{req.message}"
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-zinc-450 font-bold">
                    <span className="w-1.5 h-1.5 rounded-full bg-brand-amber animate-pulse" />
                    <span>Pending Approval</span>
                  </div>
                  <button
                    onClick={() => handleCancel(req.id)}
                    className="text-xs bg-zinc-950 border border-zinc-900 hover:bg-brand-rose/10 hover:border-brand-rose/30 text-zinc-500 hover:text-brand-rose px-3 py-2 rounded-lg font-semibold transition-all"
                  >
                    Cancel Request
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

    </div>
  );
}
