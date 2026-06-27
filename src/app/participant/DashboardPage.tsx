import { useEffect, useState } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/useAuthStore';
import { useEventStore } from '../../stores/useEventStore';
import { useNetworkingStore } from '../../stores/useNetworkingStore';
import { useChatStore } from '../../stores/useChatStore';
import { mockDb } from '../../lib/mockDb';
import { isMockMode } from '../../lib/supabase';
import type { Profile } from '../../types';
import { Globe } from "./Globe";


import {
  Sparkles, RefreshCw, Send, X, ShieldAlert,
  Search, Users, MessageSquare,
  MapPin, Check, AlertTriangle, Inbox
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function DashboardPage() {
  const navigate = useNavigate();
  const { onlineUsers } = useOutletContext<{ onlineUsers: string[] }>();
  const { user, profile } = useAuthStore();

  const {
    currentEvent,
    participants,
    announcements,
    fetchParticipants,
    fetchAnnouncements
  } = useEventStore();

  const {
    suggestions,
    sentRequests,
    receivedRequests,
    connections,
    locations,
    isLoading: netLoading,
    fetchSuggestions,
    refreshSuggestions,
    sendConnectionRequest,
    respondRequest
  } = useNetworkingStore();

  const { blockUser, reportUser } = useChatStore();

  // State controls
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const [isMobilePeopleOpen, setIsMobilePeopleOpen] = useState(false);
  const [introMessages, setIntroMessages] = useState<Record<string, string>>({});
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [reportReason, setReportReason] = useState('Spam');
  const [reportDetails, setReportDetails] = useState('');
  const [sendingRequestIds, setSendingRequestIds] = useState<string[]>([]);
  const [refreshingSugs, setRefreshingSugs] = useState(false);
  const [showAttendees, setShowAttendees] = useState(false);

  // Fetch initial event details
  useEffect(() => {
    if (profile?.event_id) {
      fetchParticipants(profile.event_id);
      fetchAnnouncements(profile.event_id);
      fetchSuggestions(profile.id, profile.event_id);
    }
  }, [profile, fetchParticipants, fetchAnnouncements, fetchSuggestions]);

  const handleRefreshSuggestions = async () => {
    if (!profile?.event_id || !user) return;
    setRefreshingSugs(true);
    try {
      await refreshSuggestions(user.id, profile.event_id);
      toast.success('AI suggestions updated!');
    } catch (err) {
      toast.error('Failed to generate suggestions');
    } finally {
      setRefreshingSugs(false);
    }
  };

  const handleConnect = async (targetUserId: string) => {
    if (!user || !profile?.event_id) return;
    setSendingRequestIds(prev => [...prev, targetUserId]);
    try {
      const intro = introMessages[targetUserId] || `Hey! Let's connect at ${currentEvent?.name || 'the event'}.`;
      await sendConnectionRequest(user.id, targetUserId, profile.event_id, intro);
      toast.success('Connection request sent!');
      // Clear intro state
      setIntroMessages(prev => {
        const copy = { ...prev };
        delete copy[targetUserId];
        return copy;
      });
    } catch (err: any) {
      toast.error(err.message || 'Failed to send request');
    } finally {
      setSendingRequestIds(prev => prev.filter(id => id !== targetUserId));
    }
  };

  const handleAcceptRequest = async (requestId: string) => {
    if (!user || !profile?.event_id) return;
    try {
      await respondRequest(requestId, 'accepted', user.id, profile.event_id);
      toast.success("✅ You're now connected!");
    } catch (err) {
      toast.error('Failed to accept request');
    }
  };

  const handleDeclineRequest = async (requestId: string) => {
    if (!user || !profile?.event_id) return;
    try {
      await respondRequest(requestId, 'rejected', user.id, profile.event_id);
      toast.success('Request declined');
    } catch (err) {
      toast.error('Failed to decline request');
    }
  };

  const handleBlock = async (targetUserId: string) => {
    if (!user) return;
    const confirm = window.confirm('Are you sure you want to block this user? You will no longer be visible to each other.');
    if (!confirm) return;

    try {
      await blockUser(user.id, targetUserId);
      setSelectedProfile(null);
      if (profile?.event_id) {
        fetchParticipants(profile.event_id);
        fetchSuggestions(user.id, profile.event_id);
      }
      toast.success('User blocked successfully');
    } catch (err) {
      toast.error('Failed to block user');
    }
  };

  const handleReportSubmit = async () => {
    if (!user || !selectedProfile) return;
    try {
      await reportUser(user.id, selectedProfile.id, reportReason, reportDetails);
      toast.success('Report submitted. Admin will review shortly.');
      setShowReportDialog(false);
      setReportDetails('');
    } catch (err) {
      toast.error('Failed to submit report');
    }
  };

  // Helper connection checkers
  const isConnected = (targetId: string) => {
    return connections.some(c => c.user_a === targetId || c.user_b === targetId);
  };

  const isRequestPending = (targetId: string) => {
    const isSent = sentRequests.some(r => r.receiver_id === targetId);
    const isRecv = receivedRequests.some(r => r.sender_id === targetId);
    return { isSent, isRecv, pending: isSent || isRecv };
  };

  const getConnectionId = (targetId: string) => {
    const conn = connections.find(c => c.user_a === targetId || c.user_b === targetId);
    return conn ? conn.id : null;
  };

  // Filter attendees
  const filteredParticipants = participants
    .filter(p => p.id !== user?.id) // exclude current user
    .filter(p => {
      // Exclude blocked users
      if (isMockMode) {
        const blocks = mockDb.getBlocks();
        const isBlocked = blocks.some(b =>
          (b.blocker_id === user?.id && b.blocked_id === p.id) ||
          (b.blocker_id === p.id && b.blocked_id === user?.id)
        );
        if (isBlocked) return false;
      }
      return true;
    })
    .filter(p => {
      const query = searchQuery.toLowerCase();
      const nameMatch = p.full_name.toLowerCase().includes(query);
      const skillMatch = p.skills.some(s => s.toLowerCase().includes(query));
      return nameMatch || skillMatch;
    });

  return (
    <div className="flex flex-1 overflow-hidden h-full">

      {/* ======================================================== */}
      {/* CENTER PANEL — Main Home Feed                            */}
      {/* ======================================================== */}
      <div className="flex-1 flex flex-col h-full overflow-y-auto px-6 py-6 space-y-8 pb-24 md:pb-12 border-r border-zinc-900">

        {/* Mobile Header indicator */}
        <div className="flex md:hidden justify-between items-center bg-zinc-950/80 backdrop-blur border border-zinc-900 px-4 py-3 rounded-2xl">
          <div className="font-extrabold text-brand-indigo">HackConnect</div>
          <button
            onClick={() => setIsMobilePeopleOpen(true)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-semibold hover:border-zinc-700"
          >
            <Users size={14} />
            <span>People ({filteredParticipants.length})</span>
          </button>
        </div>

        {/* SECTION A: AI SUGGESTED MATCHES */}
        <section className="space-y-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Sparkles className="text-brand-indigo" size={20} />
              <h2 className="text-lg font-bold tracking-tight">Lobby Universe</h2>
            </div>
            <button
              onClick={handleRefreshSuggestions}
              disabled={refreshingSugs || netLoading}
              className="text-xs flex items-center gap-1.5 px-3 py-1.5 border border-zinc-800 hover:border-zinc-750 bg-zinc-950 rounded-lg text-zinc-400 hover:text-white transition-all disabled:opacity-40"
            >
              <RefreshCw size={12} className={refreshingSugs ? 'animate-spin' : ''} />
              <span>Refresh</span>
            </button>
          </div>

          <Globe participants={participants} onlineUsers={onlineUsers} onSelectProfile={setSelectedProfile} />

          {refreshingSugs || netLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2].map(n => (
                <div key={n} className="glass-panel p-5 rounded-2xl animate-pulse space-y-4 border border-zinc-900">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-zinc-800" />
                    <div className="space-y-2 flex-1">
                      <div className="h-4 bg-zinc-800 rounded w-1/3" />
                      <div className="h-3 bg-zinc-800 rounded w-1/4" />
                    </div>
                  </div>
                  <div className="h-3 bg-zinc-800 rounded w-full" />
                  <div className="h-8 bg-zinc-800 rounded w-full" />
                </div>
              ))}
            </div>
          ) : suggestions.length === 0 ? (
            <div className="text-center py-8 border border-dashed border-zinc-850 bg-zinc-950/20 rounded-2xl text-zinc-500 text-sm">
              No recommendations generated yet. Try adding more skills or click Refresh.
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {suggestions.slice(0, 4).map((sug) => {
                const isOnline = sug.suggested_profile && onlineUsers.includes(sug.suggested_profile.id);
                const isSentPending = sug.suggested_profile && isRequestPending(sug.suggested_profile.id).isSent;

                if (!sug.suggested_profile) return null;

                return (
                  <div key={sug.id} className="glass-panel p-5 rounded-2xl flex flex-col justify-between border border-zinc-850 hover:border-brand-indigo/20 transition-all">
                    <div>
                      {/* Avatar header */}
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <img
                              src={sug.suggested_profile.avatar_url || `https://api.dicebear.com/7.x/adventurer/svg?seed=${sug.suggested_profile.full_name}`}
                              alt={sug.suggested_profile.full_name}
                              className="w-12 h-12 rounded-full border border-zinc-800 object-cover"
                            />
                            <span className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-[#0F0F10] ${isOnline ? 'bg-brand-emerald' : 'bg-zinc-650'
                              }`} />
                          </div>
                          <div>
                            <h3 className="font-bold text-sm text-white hover:text-brand-indigo cursor-pointer truncate max-w-[140px]" onClick={() => setSelectedProfile(sug.suggested_profile!)}>
                              {sug.suggested_profile.full_name}
                            </h3>
                            <div className="text-xs text-zinc-500 font-semibold">{sug.suggested_profile.looking_for || 'Networking'}</div>
                          </div>
                        </div>

                        {/* Score Indicator */}
                        <div className="px-2.5 py-1 bg-brand-indigo/10 border border-brand-indigo/25 text-brand-indigo rounded-lg text-xs font-bold">
                          {sug.compatibility_score}% Match
                        </div>
                      </div>

                      {/* Bio overlap / Match explanation */}
                      <div className="bg-zinc-950/40 border border-zinc-900 rounded-xl p-3 mb-4 space-y-2">
                        <div className="text-xs text-brand-indigo font-bold uppercase tracking-wider">Why you match:</div>
                        <p className="text-xs text-zinc-400 leading-relaxed">{sug.reason}</p>
                      </div>

                      {/* Overlapping skills list */}
                      <div className="flex flex-wrap gap-1.5 mb-4">
                        {sug.suggested_profile.skills.slice(0, 3).map(skill => {
                          const hasOverlap = profile?.skills.includes(skill);
                          return (
                            <span key={skill} className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${hasOverlap
                              ? 'bg-brand-indigo/20 text-brand-indigo border border-brand-indigo/30'
                              : 'bg-zinc-900 text-zinc-400 border border-zinc-800'
                              }`}>
                              {skill}
                            </span>
                          );
                        })}
                      </div>

                      {/* Icebreaker Quote block */}
                      <div className="bg-brand-indigo/5 border-l-2 border-brand-indigo rounded-r-lg p-2.5 mb-4 text-xs italic text-zinc-300">
                        "{sug.icebreaker}"
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-2 mt-2">
                      <button
                        onClick={() => {
                          setIntroMessages(prev => ({
                            ...prev,
                            [sug.suggested_profile!.id]: sug.icebreaker
                          }));
                          handleConnect(sug.suggested_profile!.id);
                        }}
                        disabled={isSentPending || sendingRequestIds.includes(sug.suggested_profile.id)}
                        className="flex-1 btn-primary-gradient py-2 px-3 rounded-lg text-xs font-bold text-white flex items-center justify-center gap-1.5 disabled:opacity-40"
                      >
                        {isSentPending ? (
                          <>
                            <Check size={14} />
                            <span>Request Sent</span>
                          </>
                        ) : (
                          <>
                            <Send size={12} />
                            <span>Connect with Icebreaker</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* SECTION B: PENDING REQUESTS */}
        {receivedRequests.length > 0 && (
          <section className="space-y-4">
            <h2 className="text-lg font-bold tracking-tight flex items-center gap-2">
              <Inbox size={20} className="text-brand-amber" />
              <span>Pending Requests ({receivedRequests.length})</span>
            </h2>
            <div className="space-y-3">
              {receivedRequests.map((req) => (
                <div key={req.id} className="glass-panel p-4 rounded-xl border border-zinc-850 flex flex-col md:flex-row justify-between gap-4 items-start md:items-center">
                  <div className="flex items-center gap-3">
                    <img
                      src={req.sender?.avatar_url || `https://api.dicebear.com/7.x/adventurer/svg?seed=${req.sender?.full_name}`}
                      alt={req.sender?.full_name}
                      className="w-10 h-10 rounded-full object-cover border border-zinc-800 cursor-pointer"
                      onClick={() => setSelectedProfile(req.sender!)}
                    />
                    <div>
                      <h4 className="font-bold text-sm text-white hover:text-brand-indigo cursor-pointer" onClick={() => setSelectedProfile(req.sender!)}>
                        {req.sender?.full_name}
                      </h4>
                      <p className="text-xs text-zinc-500 italic mt-0.5">"{req.message || 'No intro message'}"</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 w-full md:w-auto">
                    <button
                      onClick={() => handleAcceptRequest(req.id)}
                      className="flex-1 md:flex-initial text-xs bg-brand-emerald text-white font-bold px-4 py-2 rounded-lg hover:opacity-90"
                    >
                      Accept
                    </button>
                    <button
                      onClick={() => handleDeclineRequest(req.id)}
                      className="flex-1 md:flex-initial text-xs bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-400 font-bold px-4 py-2 rounded-lg"
                    >
                      Decline
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* SECTION C: EVENT FEED / ANNOUNCEMENTS */}
        <section className="space-y-4">
          <h2 className="text-lg font-bold tracking-tight">Event Announcements</h2>
          <div className="space-y-3">
            {announcements.length === 0 ? (
              <div className="text-center py-8 bg-zinc-950/20 border border-zinc-900 rounded-2xl text-zinc-500 text-sm">
                No event notices yet. We will notify you when organizers post updates.
              </div>
            ) : (
              announcements.map((ann) => (
                <div key={ann.id} className="bg-zinc-900/40 border border-zinc-850 p-4 rounded-xl space-y-2">
                  <div className="flex justify-between items-start">
                    <h3 className="font-bold text-sm text-white flex items-center gap-1.5">
                      {ann.title}
                    </h3>
                    <span className="text-[10px] text-zinc-500">
                      {new Date(ann.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400 leading-relaxed">{ann.content}</p>
                </div>
              ))
            )}
          </div>
        </section>

      </div>

      {/* ======================================================== */}
      {/* RIGHT PANEL — Search & Attendee List (Google Meet style) */}
      {/* ======================================================== */}
      <button
        onClick={() => setShowAttendees(true)}
        className="fixed right-6 top-24 z-40
             px-5 py-2.5
             rounded-xl
             bg-gradient-to-r from-brand-indigo to-brand-purple
             text-white
             font-semibold
             shadow-xl
             hover:scale-105
             transition-all"
      >
        Attendees
      </button>

      {showAttendees && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
          onClick={() => setShowAttendees(false)}
        />
      )}

      <div className={`
        fixed
        top-20
        right-4
        bottom-4
        w-[380px]
        rounded-2xl
        shadow-2xl
        bg-zinc-950
        border-l
        border-zinc-900
        p-4
        z-50
        overflow-y-auto
        transition-transform
        duration-300
        ease-in-out
        ${showAttendees ? "translate-x-0" : "translate-x-full"}
    `}>
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => setShowAttendees(false)}
            className="text-zinc-500 hover:text-white transition"
          >
            ✕
          </button>

        </div>
        <div className="font-bold text-sm text-zinc-400 uppercase tracking-wider">
          Attendees ({filteredParticipants.length})
        </div>

        {/* Search bar */}
        <div className="relative">
          <Search size={16} className="absolute left-3 top-3 text-zinc-500" />
          <input
            type="text"
            placeholder="Search by name or skill..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs rounded-xl border border-zinc-800 bg-zinc-900/60 pl-9 pr-4 py-2.5 text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-brand-indigo"
          />
        </div>

        {/* Scrollable list */}
        <div className="space-y-3 flex-1 overflow-y-auto pr-1">
          {filteredParticipants.map(item => {
            const isFriend = isConnected(item.id);
            const { isSent, pending } = isRequestPending(item.id);
            const connId = getConnectionId(item.id);

            // Fetch availability state
            const locState = locations[item.id];
            const availability = locState?.availability || 'offline';
            const availabilityDot =
              availability === 'available' ? 'bg-brand-emerald' :
                availability === 'busy' ? 'bg-brand-amber' : 'bg-zinc-650';

            return (
              <div
                key={item.id}
                className="flex items-center justify-between p-2 rounded-xl hover:bg-zinc-900/50 transition-all border border-transparent hover:border-zinc-850"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="relative cursor-pointer" onClick={() => setSelectedProfile(item)}>
                    <img
                      src={item.avatar_url || `https://api.dicebear.com/7.x/adventurer/svg?seed=${item.full_name}`}
                      alt={item.full_name}
                      className="w-9 h-9 rounded-full object-cover border border-zinc-800"
                    />
                    <span
                      className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-zinc-950 ${availabilityDot}`}
                      title={availability}
                    />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-zinc-200 truncate cursor-pointer hover:text-brand-indigo" onClick={() => setSelectedProfile(item)}>
                      {item.full_name}
                    </div>
                    <div className="flex gap-1 mt-0.5">
                      {item.skills.slice(0, 2).map(skill => (
                        <span key={skill} className="text-[8px] bg-brand-indigo/10 border border-brand-indigo/25 text-brand-indigo px-1 rounded-full">
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {item.linkedin_url && (
                    <a
                      href={item.linkedin_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-lg"
                    >
                      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
                        <rect x="2" y="9" width="4" height="12" />
                        <circle cx="4" cy="4" r="2" />
                      </svg>
                    </a>
                  )}

                  {isFriend ? (
                    <button
                      onClick={() => navigate(`/app/chat/${connId}`)}
                      className="p-1.5 bg-brand-indigo/10 hover:bg-brand-indigo/20 text-brand-indigo rounded-lg"
                      title="Chat"
                    >
                      <MessageSquare size={13} />
                    </button>
                  ) : pending ? (
                    <span className="text-[10px] text-zinc-500 font-semibold px-2 py-1 bg-zinc-900 rounded-lg">
                      {isSent ? 'Pending' : 'Accept?'}
                    </span>
                  ) : (
                    <button
                      onClick={() => handleConnect(item.id)}
                      disabled={sendingRequestIds.includes(item.id)}
                      className="text-[10px] bg-gradient-to-br from-brand-indigo to-brand-purple hover:opacity-90 text-white font-bold px-2 py-1 rounded-lg"
                    >
                      {sendingRequestIds.includes(item.id) ? '...' : 'Connect'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ======================================================== */}
      {/* MOBILE DRAWER — Attendees List Modal                     */}
      {/* ======================================================== */}
      {isMobilePeopleOpen && (
        <div className="md:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-30 flex justify-end">
          <div className="w-80 max-w-full bg-[#0f0f10] border-l border-zinc-900 h-full flex flex-col p-4 space-y-4 animate-slide-in-right">

            <div className="flex justify-between items-center pb-2 border-b border-zinc-900">
              <span className="font-bold text-sm text-white">Event Attendees ({filteredParticipants.length})</span>
              <button onClick={() => setIsMobilePeopleOpen(false)} className="text-zinc-450 hover:text-white">
                <X size={18} />
              </button>
            </div>

            {/* Search bar */}
            <div className="relative">
              <Search size={16} className="absolute left-3 top-3 text-zinc-500" />
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-xs rounded-xl border border-zinc-805 bg-zinc-900/60 pl-9 pr-4 py-2.5 text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-brand-indigo"
              />
            </div>

            {/* Scrollable list */}
            <div className="space-y-3 flex-1 overflow-y-auto pr-1">
              {filteredParticipants.map(item => {
                const isFriend = isConnected(item.id);
                const { isSent, pending } = isRequestPending(item.id);
                const connId = getConnectionId(item.id);

                const locState = locations[item.id];
                const availability = locState?.availability || 'offline';
                const availabilityDot =
                  availability === 'available' ? 'bg-brand-emerald' :
                    availability === 'busy' ? 'bg-brand-amber' : 'bg-zinc-650';

                return (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-2 rounded-xl bg-zinc-950 border border-zinc-900"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="relative" onClick={() => { setSelectedProfile(item); setIsMobilePeopleOpen(false); }}>
                        <img
                          src={item.avatar_url || `https://api.dicebear.com/7.x/adventurer/svg?seed=${item.full_name}`}
                          alt={item.full_name}
                          className="w-9 h-9 rounded-full object-cover border border-zinc-800"
                        />
                        <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border border-zinc-950 ${availabilityDot}`} />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-zinc-200 truncate" onClick={() => { setSelectedProfile(item); setIsMobilePeopleOpen(false); }}>
                          {item.full_name}
                        </div>
                        <div className="flex gap-1 mt-0.5">
                          {item.skills.slice(0, 2).map(skill => (
                            <span key={skill} className="text-[8px] bg-brand-indigo/10 border border-brand-indigo/25 text-brand-indigo px-1.5 rounded-full">
                              {skill}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {isFriend ? (
                        <button
                          onClick={() => { setIsMobilePeopleOpen(false); navigate(`/app/chat/${connId}`); }}
                          className="p-1.5 bg-brand-indigo/10 text-brand-indigo rounded-lg"
                        >
                          <MessageSquare size={13} />
                        </button>
                      ) : pending ? (
                        <span className="text-[10px] text-zinc-500 font-semibold px-2 py-1 bg-zinc-900 rounded-lg">
                          {isSent ? 'Pending' : 'Req'}
                        </span>
                      ) : (
                        <button
                          onClick={() => handleConnect(item.id)}
                          disabled={sendingRequestIds.includes(item.id)}
                          className="text-[10px] bg-gradient-to-br from-brand-indigo to-brand-purple text-white font-bold px-2 py-1 rounded-lg"
                        >
                          {sendingRequestIds.includes(item.id) ? '...' : 'Connect'}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* DIALOG MODAL — Profile Preview Detailed Modal            */}
      {/* ======================================================== */}
      {selectedProfile && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-lg rounded-2xl glow-indigo border border-zinc-850 shadow-2xl p-6 relative animate-zoom-in max-h-[90vh] overflow-y-auto">

            <button
              onClick={() => setSelectedProfile(null)}
              className="absolute top-4 right-4 text-zinc-450 hover:text-white"
            >
              <X size={20} />
            </button>

            {/* Profile Header Details */}
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 pb-6 border-b border-zinc-900">
              <img
                src={selectedProfile.avatar_url || `https://api.dicebear.com/7.x/adventurer/svg?seed=${selectedProfile.full_name}`}
                alt={selectedProfile.full_name}
                className="w-20 h-20 rounded-full object-cover border-2 border-brand-indigo/30"
              />

              <div className="text-center sm:text-left space-y-1.5 flex-1 min-w-0">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                  <h3 className="text-xl font-bold text-white">{selectedProfile.full_name}</h3>
                  <span className="text-[10px] px-2 py-0.5 bg-brand-indigo/20 text-brand-indigo font-bold rounded-full border border-brand-indigo/30">
                    {selectedProfile.looking_for ? `Looking for ${selectedProfile.looking_for}` : 'Attendee'}
                  </span>
                </div>

                {/* Availability status tag */}
                {(() => {
                  const loc = locations[selectedProfile.id];
                  const avail = loc?.availability || 'offline';
                  const zone = loc?.zone;
                  const label =
                    avail === 'available' ? 'Available' :
                      avail === 'busy' ? 'Busy (Do Not Disturb)' : 'Offline';
                  const color =
                    avail === 'available' ? 'text-brand-emerald bg-brand-emerald/10' :
                      avail === 'busy' ? 'text-brand-amber bg-brand-amber/10' : 'text-zinc-500 bg-zinc-900';

                  // Note: Location details are strictly visible ONLY to mutual connections
                  const isFriend = isConnected(selectedProfile.id);
                  const showLocationDetails = isFriend && loc;

                  return (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-center sm:justify-start gap-1.5">
                        <span className={`w-2.5 h-2.5 rounded-full ${avail === 'available' ? 'bg-brand-emerald' :
                          avail === 'busy' ? 'bg-brand-amber' : 'bg-zinc-650'
                          }`} />
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-md ${color}`}>{label}</span>
                      </div>

                      {/* Enforce privacy: Only connections can see zone text */}
                      {showLocationDetails ? (
                        <div className="text-xs text-zinc-400 font-semibold bg-zinc-950 px-3 py-1.5 rounded-lg inline-flex items-center gap-1.5">
                          <MapPin size={12} className="text-brand-indigo" />
                          <span>Currently at: <strong className="text-white">{zone}</strong></span>
                          {loc.custom_note && <span className="text-zinc-500">({loc.custom_note})</span>}
                        </div>
                      ) : isFriend ? (
                        <div className="text-[10px] text-zinc-500">Location status not updated yet.</div>
                      ) : (
                        <div className="text-[10px] text-zinc-500 italic">🔐 Connect to view location coordinates.</div>
                      )}
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Profile Bio */}
            <div className="py-4 space-y-1 border-b border-zinc-900">
              <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Bio</h4>
              <p className="text-sm text-zinc-300 leading-relaxed">
                {selectedProfile.bio || 'No bio description provided yet.'}
              </p>
            </div>

            {/* Skills grid */}
            <div className="py-4 space-y-2 border-b border-zinc-900">
              <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Skills</h4>
              <div className="flex flex-wrap gap-1.5">
                {selectedProfile.skills.length === 0 ? (
                  <span className="text-xs text-zinc-500">No skills added.</span>
                ) : (
                  selectedProfile.skills.map(skill => (
                    <span key={skill} className="text-xs px-2.5 py-1 bg-brand-indigo/10 text-brand-indigo border border-brand-indigo/35 rounded-full font-semibold">
                      {skill}
                    </span>
                  ))
                )}
              </div>
            </div>

            {/* Interests grid */}
            <div className="py-4 space-y-2 border-b border-zinc-900">
              <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Interests</h4>
              <div className="flex flex-wrap gap-1.5">
                {selectedProfile.interests.length === 0 ? (
                  <span className="text-xs text-zinc-500">No interests added.</span>
                ) : (
                  selectedProfile.interests.map(interest => (
                    <span key={interest} className="text-xs px-2.5 py-1 bg-brand-purple/10 text-brand-purple border border-brand-purple/35 rounded-full font-semibold">
                      {interest}
                    </span>
                  ))
                )}
              </div>
            </div>

            {/* Links and Dialog buttons */}
            <div className="pt-4 flex flex-col sm:flex-row justify-between gap-4 items-center">

              {/* External Profile Links */}
              <div className="flex gap-2.5">
                {selectedProfile.linkedin_url && (
                  <a
                    href={selectedProfile.linkedin_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white border border-zinc-800 bg-zinc-900/60 px-3 py-1.5 rounded-lg"
                  >
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
                      <rect x="2" y="9" width="4" height="12" />
                      <circle cx="4" cy="4" r="2" />
                    </svg>
                    <span>LinkedIn</span>
                  </a>
                )}
                {selectedProfile.github_url && (
                  <a
                    href={selectedProfile.github_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white border border-zinc-800 bg-zinc-900/60 px-3 py-1.5 rounded-lg"
                  >
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
                      <path d="M9 18c-4.51 2-5-2-7-2" />
                    </svg>
                    <span>GitHub</span>
                  </a>
                )}
              </div>

              {/* Networking Action Buttons */}
              <div className="flex items-center gap-2">

                {/* Report button */}
                <button
                  onClick={() => setShowReportDialog(true)}
                  className="p-2 border border-zinc-800 hover:border-brand-rose/30 hover:bg-brand-rose/5 text-zinc-500 hover:text-brand-rose rounded-lg"
                  title="Report Abuse"
                >
                  <ShieldAlert size={16} />
                </button>

                {/* Block button */}
                <button
                  onClick={() => handleBlock(selectedProfile.id)}
                  className="px-3 py-2 border border-zinc-805 hover:border-brand-rose bg-zinc-900 hover:bg-brand-rose hover:text-white text-zinc-400 rounded-lg text-xs font-bold transition-all"
                >
                  Block
                </button>

                {/* Main Action Connect / Chat */}
                {(() => {
                  const friend = isConnected(selectedProfile.id);
                  const { isSent, pending } = isRequestPending(selectedProfile.id);
                  const connId = getConnectionId(selectedProfile.id);

                  if (friend) {
                    return (
                      <button
                        onClick={() => {
                          setSelectedProfile(null);
                          navigate(`/app/chat/${connId}`);
                        }}
                        className="btn-primary-gradient px-4 py-2 text-xs font-bold text-white rounded-lg flex items-center gap-1.5"
                      >
                        <MessageSquare size={14} />
                        <span>Chat Now</span>
                      </button>
                    );
                  }

                  if (pending) {
                    return (
                      <span className="text-xs font-semibold px-4 py-2 bg-zinc-900 border border-zinc-800 text-zinc-500 rounded-lg">
                        {isSent ? 'Pending Approval' : 'Incoming Request'}
                      </span>
                    );
                  }

                  return (
                    <button
                      onClick={() => handleConnect(selectedProfile.id)}
                      disabled={sendingRequestIds.includes(selectedProfile.id)}
                      className="btn-primary-gradient px-4 py-2 text-xs font-bold text-white rounded-lg"
                    >
                      {sendingRequestIds.includes(selectedProfile.id) ? 'Connecting...' : 'Connect'}
                    </button>
                  );
                })()}

              </div>

            </div>

          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* REPORT SUBMIT DIALOG MODAL                               */}
      {/* ======================================================== */}
      {showReportDialog && selectedProfile && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-md rounded-2xl border border-brand-rose/25 shadow-2xl p-6 relative animate-zoom-in">
            <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-1.5 text-brand-rose">
              <AlertTriangle size={18} />
              <span>Report Attendee</span>
            </h3>
            <p className="text-xs text-zinc-400 mb-4">
              Your report will be sent to event administrators. We review flags to maintain a safe networking environment.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5">Reason</label>
                <select
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  className="w-full text-xs rounded-xl border border-zinc-800 bg-zinc-900/60 p-2.5 text-zinc-200 focus:outline-none focus:border-brand-indigo"
                >
                  <option value="Spam">Spam or unwanted pitches</option>
                  <option value="Harassment">Harassment or abusive language</option>
                  <option value="Impersonation">Fake profile or impersonation</option>
                  <option value="Inappropriate Content">Inappropriate profile content / image</option>
                  <option value="Other">Other (specify below)</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5">Details (Optional)</label>
                <textarea
                  rows={3}
                  value={reportDetails}
                  onChange={(e) => setReportDetails(e.target.value)}
                  placeholder="Provide any additional context or details for verification..."
                  className="w-full text-xs rounded-xl border border-zinc-800 bg-zinc-900/60 p-2.5 text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-brand-indigo resize-none"
                />
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button
                  onClick={() => setShowReportDialog(false)}
                  className="text-xs bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-400 font-bold px-4 py-2 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={handleReportSubmit}
                  className="text-xs bg-brand-rose text-white font-bold px-4 py-2 rounded-lg hover:opacity-90"
                >
                  Submit Report
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
