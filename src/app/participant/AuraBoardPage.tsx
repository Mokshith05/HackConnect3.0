import { useEffect, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { useAuthStore } from '../../stores/useAuthStore';
import { useEventStore } from '../../stores/useEventStore';
import { useNetworkingStore } from '../../stores/useNetworkingStore';
import { useChatStore } from '../../stores/useChatStore';
import { isMockMode, supabase } from '../../lib/supabase';
import { mockDb } from '../../lib/mockDb';
import type { Profile } from '../../types';
import {
  Rocket, Trophy, Search, Award, Lock, MessageSquare, X,
  ShieldAlert, AlertTriangle, Sparkles, RefreshCw, Crown, Info
} from 'lucide-react';
import toast from 'react-hot-toast';

interface LeaderboardUser {
  id: string;
  full_name: string;
  avatar_url: string;
  streak: number;
}

export default function AuraBoardPage() {
  const navigate = useNavigate();
  const { onlineUsers } = useOutletContext<{ onlineUsers: string[] }>();
  const { user, profile } = useAuthStore();
  const { currentEvent, participants, fetchParticipants } = useEventStore();
  const {
    connections,
    sentRequests,
    receivedRequests,
    sendConnectionRequest,
    fetchNetworkingData
  } = useNetworkingStore();

  const { blockUser, reportUser } = useChatStore();

  // Component States
  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([]);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const [sendingRequestIds, setSendingRequestIds] = useState<string[]>([]);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [reportReason, setReportReason] = useState('Spam');
  const [reportDetails, setReportDetails] = useState('');
  const [badgeGlimmer, setBadgeGlimmer] = useState(false);
  
  // Custom Confetti Trigger State
  const [confettiParticles, setConfettiParticles] = useState<{ id: number; x: number; y: number; color: string; size: number; delay: number }[]>([]);

  // Count actual connections for current user
  const userStreak = connections.length;

  // Load and refresh leaderboard data
  const fetchLeaderboard = async () => {
    if (!profile?.event_id) return;
    setLoadingLeaderboard(true);
    
    if (isMockMode) {
      // Mock mode leaderboard calculation
      try {
        const activeEventId = profile.event_id;
        const allProfiles = mockDb.getProfiles().filter(p => p.event_id === activeEventId);
        const allConns = mockDb.getConnections().filter(c => c.event_id === activeEventId);
        
        const streaks: Record<string, number> = {};
        allProfiles.forEach(p => {
          streaks[p.id] = 0;
        });
        
        allConns.forEach(c => {
          if (streaks[c.user_a] !== undefined) streaks[c.user_a]++;
          if (streaks[c.user_b] !== undefined) streaks[c.user_b]++;
        });
        
        const leaderboardData: LeaderboardUser[] = allProfiles.map(p => ({
          id: p.id,
          full_name: p.full_name,
          avatar_url: p.avatar_url || '',
          streak: streaks[p.id] || 0
        }));
        
        // Sort by streak descending, then by name
        leaderboardData.sort((a, b) => b.streak - a.streak || a.full_name.localeCompare(b.full_name));
        setLeaderboard(leaderboardData);
      } catch (err) {
        console.error("Mock leaderboard error:", err);
      } finally {
        setLoadingLeaderboard(false);
      }
      return;
    }

    // Live mode API call
    try {
      const res = await fetch(`/api/networking/leaderboard/${profile.event_id}`);
      if (!res.ok) throw new Error("Failed to fetch leaderboard data");
      const data = await res.json();
      setLeaderboard(data.leaderboard || []);
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to load real-time leaderboard.");
    } finally {
      setLoadingLeaderboard(false);
    }
  };

  // Initial loads
  useEffect(() => {
    if (profile?.event_id && user) {
      fetchParticipants(profile.event_id);
      fetchNetworkingData(user.id, profile.event_id);
    }
  }, [profile, user, fetchParticipants, fetchNetworkingData]);

  // Fetch leaderboard when participants, connections or event changes
  useEffect(() => {
    if (profile?.event_id) {
      fetchLeaderboard();
    }
  }, [profile, participants, connections]);

  // Checkers
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

  const handleConnect = async (targetUserId: string) => {
    if (!user || !profile?.event_id) return;
    setSendingRequestIds(prev => [...prev, targetUserId]);
    try {
      const intro = `Hey! I saw you on the Aura Board leaderboard and wanted to connect!`;
      await sendConnectionRequest(user.id, targetUserId, profile.event_id, intro);
      toast.success('Connection request sent!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to send request');
    } finally {
      setSendingRequestIds(prev => prev.filter(id => id !== targetUserId));
    }
  };

  const handleBlock = async (targetUserId: string) => {
    if (!user) return;
    const confirm = window.confirm('Block this user? You will no longer be visible to each other on the leaderboard.');
    if (!confirm) return;
    try {
      await blockUser(user.id, targetUserId);
      setSelectedProfile(null);
      if (profile?.event_id) {
        fetchParticipants(profile.event_id);
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

  // Trigger custom confetti explosion
  const triggerCelebration = () => {
    setBadgeGlimmer(true);
    setTimeout(() => setBadgeGlimmer(false), 1500);

    const particles = [];
    const colors = ['#F59E0B', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899', '#EF4444'];
    for (let i = 0; i < 80; i++) {
      particles.push({
        id: i,
        x: Math.random() * 100, // percentage x
        y: Math.random() * 100, // percentage y
        color: colors[Math.floor(Math.random() * colors.length)],
        size: Math.random() * 8 + 4,
        delay: Math.random() * 0.5
      });
    }
    setConfettiParticles(particles);
    setTimeout(() => {
      setConfettiParticles([]);
    }, 4000);
  };

  // Filter leaderboard search results
  const filteredLeaderboard = leaderboard.filter(item => 
    item.full_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Astronaut SVG representation
  const renderAstronaut = () => (
    <div className="relative w-14 h-14 animate-[float_4s_ease-in-out_infinite]">
      <svg className="w-full h-full drop-shadow-[0_4px_10px_rgba(99,102,241,0.5)]" viewBox="0 0 64 64" fill="none">
        {/* Astronaut Helmet */}
        <circle cx="32" cy="24" r="14" fill="#E4E4E7" stroke="#18181B" strokeWidth="2.5" />
        {/* Visor */}
        <ellipse cx="32" cy="22" rx="9" ry="6" fill="url(#visorGrad)" stroke="#18181B" strokeWidth="2" />
        <path d="M26 20 Q32 17 38 20" stroke="#FFF" strokeWidth="1" strokeLinecap="round" opacity="0.4" />
        {/* Suit Body */}
        <path d="M21 38 C21 32, 43 32, 43 38 L39 52 L25 52 Z" fill="#F4F4F5" stroke="#18181B" strokeWidth="2.5" />
        {/* Shoulder joints */}
        <circle cx="21" cy="38" r="4.5" fill="#D4D4D8" stroke="#18181B" strokeWidth="2" />
        <circle cx="43" cy="38" r="4.5" fill="#D4D4D8" stroke="#18181B" strokeWidth="2" />
        {/* Chest Controls */}
        <rect x="27" y="38" width="10" height="7" rx="1.5" fill="#E4E4E7" stroke="#18181B" strokeWidth="1.5" />
        <circle cx="30" cy="41.5" r="1" fill="#EF4444" />
        <circle cx="34" cy="41.5" r="1" fill="#10B981" />
        {/* Backpack oxygen supply */}
        <rect x="13" y="30" width="6" height="16" rx="2.5" fill="#A1A1AA" stroke="#18181B" strokeWidth="2" />
        <rect x="45" y="30" width="6" height="16" rx="2.5" fill="#A1A1AA" stroke="#18181B" strokeWidth="2" />
        <defs>
          <linearGradient id="visorGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#818CF8" />
            <stop offset="50%" stopColor="#4F46E5" />
            <stop offset="100%" stopColor="#312E81" />
          </linearGradient>
        </defs>
      </svg>
      {/* Astronaut jetpack flames/sparks */}
      <div className="absolute -bottom-2 left-3 w-2 h-4 bg-orange-500 rounded-full animate-pulse blur-[1px]"></div>
      <div className="absolute -bottom-2 right-3 w-2 h-4 bg-orange-500 rounded-full animate-pulse blur-[1px]"></div>
    </div>
  );

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto px-6 py-8 bg-transparent space-y-8 relative overflow-hidden select-none pb-24 md:pb-12">
      
      {/* Custom keyframes injected for float animation */}
      <style>{`
        @keyframes float {
          0% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
          100% { transform: translateY(0px); }
        }
        @keyframes glimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        .hologram-shine {
          background: linear-gradient(120deg, rgba(255,255,255,0) 30%, rgba(255,255,255,0.4) 40%, rgba(255,255,255,0) 50%);
          background-size: 200% 100%;
          animation: glimmer 4s infinite linear;
        }
      `}</style>

      {/* Background Star Parallax / Nebula Glow */}
      <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-brand-indigo/5 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-10 right-1/4 w-[500px] h-[500px] bg-brand-purple/5 rounded-full blur-[120px] pointer-events-none" />

      {/* Confetti canvas overlay */}
      {confettiParticles.length > 0 && (
        <div className="absolute inset-0 z-50 pointer-events-none overflow-hidden">
          {confettiParticles.map((p) => (
            <div
              key={p.id}
              className="absolute rounded-full"
              style={{
                left: `${p.x}%`,
                top: `${p.y}%`,
                width: `${p.size}px`,
                height: `${p.size}px`,
                backgroundColor: p.color,
                opacity: 0.8,
                transform: 'translateY(0)',
                animation: `float 2.5s ease-out forwards`,
                animationDelay: `${p.delay}s`
              }}
            />
          ))}
        </div>
      )}

      {/* Header Info */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Rocket className="text-brand-indigo animate-pulse" size={24} />
            <h1 className="text-2xl font-extrabold tracking-tight text-white">Aura Board</h1>
          </div>
          <p className="text-xs text-zinc-400 mt-1 max-w-xl">
            Gamify your hackathon networking! Every mutual connection propels your astronaut forward. Reach a 10-streak to claim your legendary Stellar Connector badge.
          </p>
        </div>
        <button
          onClick={fetchLeaderboard}
          disabled={loadingLeaderboard}
          className="text-xs flex items-center gap-1.5 px-4 py-2 border border-zinc-800 hover:border-zinc-700 bg-zinc-950/60 rounded-xl text-zinc-400 hover:text-white transition-all disabled:opacity-40"
        >
          <RefreshCw size={12} className={loadingLeaderboard ? 'animate-spin' : ''} />
          <span>Refresh Scores</span>
        </button>
      </div>

      {/* ======================================================== */}
      {/* RACE TRACK SECTION                                       */}
      {/* ======================================================== */}
      <section className="glass-panel rounded-3xl p-6 md:p-8 border border-zinc-900 glow-indigo relative overflow-hidden">
        
        {/* Subtle grid styling */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />

        <div className="relative flex justify-between items-center mb-10">
          <h2 className="text-sm font-bold tracking-wider text-zinc-400 uppercase flex items-center gap-2">
            <span>Astronaut Navigation Progress</span>
            <span className="text-xs px-2 py-0.5 bg-brand-indigo/10 text-brand-indigo border border-brand-indigo/25 rounded-md font-extrabold uppercase">
              Streak: {userStreak} / 10
            </span>
          </h2>
          <span className="text-[10px] text-zinc-500 hidden sm:inline-flex items-center gap-1">
            <Info size={12} /> Target: 10 connections to finish the race
          </span>
        </div>

        {/* The Track */}
        <div className="relative pt-12 pb-8 px-4">
          
          {/* Astronaut placement */}
          <div
            className="absolute top-[-8px] transition-all duration-1000 ease-out z-10"
            style={{ left: `calc(${Math.min(userStreak, 10) * 10}% - 28px)` }}
          >
            {renderAstronaut()}
          </div>

          {/* Progress bar line */}
          <div className="h-2 w-full bg-zinc-900 rounded-full border border-zinc-850 relative overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-brand-indigo via-indigo-500 to-brand-purple rounded-full shadow-[0_0_15px_rgba(99,102,241,0.5)] transition-all duration-1000 ease-out"
              style={{ width: `${Math.min(userStreak, 10) * 10}%` }}
            />
          </div>

          {/* Milestones nodes */}
          <div className="absolute top-[44px] left-0 right-0 flex justify-between px-4 pointer-events-none">
            {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((node) => {
              const isActive = userStreak >= node;
              const isFinish = node === 10;
              return (
                <div
                  key={node}
                  className="flex flex-col items-center relative"
                >
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold border transition-all duration-500 ${
                      isFinish
                        ? isActive
                          ? 'bg-amber-500 border-amber-400 text-black scale-125 shadow-[0_0_12px_#f59e0b]'
                          : 'bg-zinc-950 border-zinc-700 text-zinc-500'
                        : isActive
                          ? 'bg-brand-indigo border-brand-indigo/80 text-white shadow-[0_0_8px_rgba(99,102,241,0.6)]'
                          : 'bg-zinc-950 border-zinc-800 text-zinc-600'
                    }`}
                  >
                    {isFinish ? <Trophy size={10} /> : node}
                  </div>
                  <span
                    className={`text-[9px] mt-2 font-semibold absolute top-6 whitespace-nowrap ${
                      isActive ? 'text-zinc-300 font-bold' : 'text-zinc-650'
                    }`}
                  >
                    {node === 0 ? 'Start' : node === 10 ? 'Finish 🏁' : `${node}`}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

      </section>

      {/* ======================================================== */}
      {/* BADGE SHOWCASE & ACHIEVEMENTS                            */}
      {/* ======================================================== */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Holographic Badge Card Container */}
        <div className="lg:col-span-5 flex flex-col">
          <div className="glass-panel rounded-3xl p-6 border border-zinc-900 flex-1 flex flex-col justify-between items-center relative overflow-hidden text-center glow-purple min-h-[380px]">
            
            {/* Hologram glowing rings */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 border border-brand-indigo/10 rounded-full animate-ping pointer-events-none" />
            
            <div className="w-full">
              <h3 className="text-sm font-bold tracking-wider text-zinc-400 uppercase flex items-center justify-center gap-1.5">
                <Award size={16} className="text-brand-purple" />
                <span>Streak Achievement Badge</span>
              </h3>
              <p className="text-[11px] text-zinc-500 mt-1">
                Unlocked at 10 connections. Hover or click to admire the holographic reflections!
              </p>
            </div>

            {userStreak >= 10 ? (
              /* UNLOCKED BADGE: Stunning Hover Card with Shimmer & Glow */
              <div 
                onClick={triggerCelebration}
                className={`relative w-64 h-64 rounded-2xl p-0.5 bg-gradient-to-br from-amber-300 via-yellow-500 to-indigo-500 shadow-2xl hover:scale-105 transition-all duration-300 cursor-pointer select-none overflow-hidden group ${
                  badgeGlimmer ? 'ring-4 ring-amber-400 ring-offset-4 ring-offset-black' : ''
                }`}
              >
                {/* Holographic light reflect overlay */}
                <div className="absolute inset-0 hologram-shine opacity-60 pointer-events-none z-10" />

                {/* Main badge body */}
                <div className="w-full h-full rounded-2xl bg-zinc-950 flex flex-col justify-between items-center p-4 border border-black/40 relative">
                  
                  {/* Floating sparkles background */}
                  <div className="absolute inset-0 opacity-20 bg-[radial-gradient(ellipse_at_center,#a855f7_0%,transparent_70%)]" />

                  {/* Badge Header */}
                  <div className="text-[9px] uppercase tracking-widest font-black text-amber-400 bg-amber-400/10 px-2.5 py-0.5 rounded-full border border-amber-500/20">
                    Aura Board Champion
                  </div>

                  {/* Center Rocket Launch Graphic */}
                  <div className="my-2 relative flex items-center justify-center">
                    <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-brand-indigo/20 to-brand-purple/20 border border-brand-indigo/30 flex items-center justify-center relative">
                      <Rocket size={36} className="text-amber-400 filter drop-shadow-[0_0_8px_#f59e0b] group-hover:translate-y-[-4px] transition-transform duration-300" />
                    </div>
                  </div>

                  {/* Name and Achievement details */}
                  <div className="space-y-1 w-full text-center z-10">
                    <div className="text-xs text-zinc-400 font-medium">THIS CERTIFIES THAT</div>
                    <div className="text-base font-extrabold text-white truncate max-w-[200px] mx-auto uppercase">
                      {profile?.full_name || 'HackConnect Peer'}
                    </div>
                    <div className="text-[9px] text-zinc-500 uppercase tracking-wider font-bold">
                      Has reached a 10+ streak at
                    </div>
                    <div className="text-[10px] text-brand-indigo font-bold truncate max-w-[190px] mx-auto">
                      {currentEvent?.name || 'HackConnect Demo'}
                    </div>
                  </div>

                  {/* Footer Seal */}
                  <div className="text-[8px] text-zinc-650 font-mono mt-1">
                    VERIFIED SECURE BY HACKCONNECT
                  </div>
                </div>
              </div>
            ) : (
              /* LOCKED BADGE */
              <div className="relative w-64 h-64 rounded-2xl border border-dashed border-zinc-800 bg-zinc-950/40 flex flex-col items-center justify-center p-6 space-y-4">
                
                {/* Padlock glowing indicator */}
                <div className="w-16 h-16 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-550">
                  <Lock size={28} />
                </div>
                
                <div className="space-y-1">
                  <div className="text-xs font-bold text-zinc-400">Badge Locked</div>
                  <p className="text-[11px] text-zinc-500 max-w-[180px]">
                    Complete {10 - userStreak} more connections to claim your holographic card.
                  </p>
                </div>

                {/* Mini progress indicator */}
                <div className="w-full space-y-1.5">
                  <div className="flex justify-between text-[9px] text-zinc-500 font-bold">
                    <span>PROGRESS</span>
                    <span>{userStreak * 10}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-zinc-900 border border-zinc-850 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-brand-indigo rounded-full"
                      style={{ width: `${userStreak * 10}%` }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Bottom Actions */}
            {userStreak >= 10 ? (
              <button
                onClick={triggerCelebration}
                className="w-full btn-primary-gradient text-xs font-bold py-2.5 rounded-xl text-white flex items-center justify-center gap-1.5"
              >
                <Sparkles size={13} />
                <span>Celebrate Achievement</span>
              </button>
            ) : (
              <button
                disabled
                className="w-full bg-zinc-900 border border-zinc-800 text-xs font-semibold py-2.5 rounded-xl text-zinc-600 flex items-center justify-center gap-1.5 cursor-not-allowed"
              >
                <Lock size={12} />
                <span>10 Streak Required</span>
              </button>
            )}

          </div>
        </div>

        {/* ======================================================== */}
        {/* GLOBAL LEADERBOARD SECTION                               */}
        {/* ======================================================== */}
        <div className="lg:col-span-7 flex flex-col">
          <div className="glass-panel rounded-3xl p-6 border border-zinc-900 flex-1 flex flex-col justify-between glow-indigo min-h-[380px]">
            
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-bold tracking-wider text-zinc-400 uppercase flex items-center gap-2">
                  <Crown size={16} className="text-amber-400" />
                  <span>Networking Streaks Leaderboard</span>
                </h3>
                <span className="text-[10px] text-zinc-500 uppercase font-bold bg-zinc-900 px-2 py-0.5 rounded-md">
                  Active event attendees
                </span>
              </div>

              {/* Leaderboard Search */}
              <div className="relative">
                <Search size={14} className="absolute left-3 top-3 text-zinc-650" />
                <input
                  type="text"
                  placeholder="Search hacker leaderboard..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full text-xs rounded-xl border border-zinc-850 bg-zinc-950 pl-9 pr-4 py-2.5 text-zinc-200 placeholder-zinc-650 focus:outline-none focus:border-brand-indigo"
                />
              </div>

              {/* Leaderboard Entries List */}
              <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
                {loadingLeaderboard ? (
                  /* Loading placeholders */
                  [1, 2, 3, 4].map(n => (
                    <div key={n} className="flex items-center justify-between p-3 rounded-xl bg-zinc-950/20 border border-zinc-900/60 animate-pulse">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-zinc-800" />
                        <div className="h-4 bg-zinc-800 rounded w-28" />
                      </div>
                      <div className="w-12 h-6 rounded bg-zinc-800" />
                    </div>
                  ))
                ) : filteredLeaderboard.length === 0 ? (
                  <div className="text-center py-12 text-zinc-600 text-xs">
                    No leaderboard scores found matching your search.
                  </div>
                ) : (
                  filteredLeaderboard.map((item, idx) => {
                    const rank = idx + 1;
                    const isCurrentUser = item.id === user?.id;
                    const isOnline = onlineUsers.includes(item.id);

                    // Rank decoration styling
                    const rankBadge =
                      rank === 1 ? 'bg-amber-400/20 text-amber-400 border border-amber-500/40 shadow-[0_0_6px_#f59e0b]' :
                      rank === 2 ? 'bg-zinc-400/20 text-zinc-400 border border-zinc-400/40' :
                      rank === 3 ? 'bg-amber-700/20 text-amber-600 border border-amber-700/40' :
                      'bg-zinc-900 text-zinc-500 border border-zinc-800';

                    const rankIcon =
                      rank === 1 ? '👑' :
                      rank === 2 ? '⭐' :
                      rank === 3 ? '⚡' : '';

                    return (
                      <div
                        key={item.id}
                        onClick={async () => {
                          // Fetch actual profile object on click
                          let prof: Profile | null = null;
                          if (isMockMode) {
                            prof = mockDb.getProfiles().find(p => p.id === item.id) || null;
                          } else {
                            try {
                              const { data } = await supabase
                                .from('profiles')
                                .select('*')
                                .eq('id', item.id)
                                .single();
                              prof = data;
                            } catch (e) {
                              console.error(e);
                            }
                          }
                          if (prof) {
                            setSelectedProfile(prof);
                          }
                        }}
                        className={`flex items-center justify-between p-3 rounded-xl transition-all cursor-pointer border hover:border-brand-indigo/30 ${
                          isCurrentUser
                            ? 'bg-brand-indigo/5 border-brand-indigo/35 glow-indigo'
                            : 'bg-zinc-950/40 border-zinc-900/60 hover:bg-zinc-900/40'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          {/* Rank Circle */}
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${rankBadge}`}>
                            {rankIcon ? rankIcon : rank}
                          </div>
                          
                          {/* Avatar with Availability Status */}
                          <div className="relative">
                            <img
                              src={item.avatar_url || `https://api.dicebear.com/7.x/adventurer/svg?seed=${item.full_name}`}
                              alt={item.full_name}
                              className="w-8 h-8 rounded-full border border-zinc-800 object-cover"
                            />
                            <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border border-black ${
                              isOnline ? 'bg-brand-emerald' : 'bg-zinc-650'
                            }`} />
                          </div>

                          {/* Name details */}
                          <div>
                            <span className="font-bold text-xs text-white hover:text-brand-indigo transition flex items-center gap-1.5">
                              {item.full_name}
                              {isCurrentUser && (
                                <span className="text-[8px] font-extrabold uppercase px-1.5 py-0.5 bg-brand-indigo text-white rounded-md">
                                  You
                                </span>
                              )}
                              {item.streak >= 10 && (
                                <span className="text-[8px] font-extrabold uppercase px-1.5 py-0.5 bg-amber-400 text-black rounded-md flex items-center gap-0.5 shadow-[0_0_6px_#f59e0b]">
                                  <Trophy size={8} /> Badge
                                </span>
                              )}
                            </span>
                          </div>
                        </div>

                        {/* Connection Streak indicator */}
                        <div className="flex items-center gap-1">
                          <span className={`text-xs font-black uppercase tracking-wider px-2.5 py-1 rounded-lg ${
                            item.streak >= 10
                              ? 'bg-amber-400/10 text-amber-400 border border-amber-500/20'
                              : item.streak > 0
                                ? 'bg-brand-indigo/10 text-brand-indigo border border-brand-indigo/20'
                                : 'bg-zinc-900 text-zinc-650 border border-zinc-850'
                          }`}>
                            🔥 {item.streak} {item.streak === 1 ? 'connection' : 'connections'}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div className="pt-4 border-t border-zinc-900 flex justify-between items-center text-[10px] text-zinc-550">
              <span>* Streaks update immediately upon request acceptances</span>
              <span>Total Attendees: {leaderboard.length}</span>
            </div>

          </div>
        </div>

      </section>

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
                  const isOnline = onlineUsers.includes(selectedProfile.id);
                  const label = isOnline ? 'Online Now' : 'Offline';
                  const color = isOnline ? 'text-brand-emerald bg-brand-emerald/10' : 'text-zinc-500 bg-zinc-900';

                  return (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-center sm:justify-start gap-1.5">
                        <span className={`w-2.5 h-2.5 rounded-full ${isOnline ? 'bg-brand-emerald' : 'bg-zinc-650'}`} />
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-md ${color}`}>{label}</span>
                      </div>
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
                  const isSelf = selectedProfile.id === user?.id;
                  if (isSelf) return null;

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
                  className="w-full text-xs rounded-xl border border-zinc-800 bg-zinc-900/60 p-2.5 text-zinc-200 placeholder-zinc-650 focus:outline-none focus:border-brand-indigo resize-none"
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
