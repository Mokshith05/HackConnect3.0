import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../stores/useAuthStore';
import { useEventStore } from '../../stores/useEventStore';
import { useChatStore } from '../../stores/useChatStore';
import { mockDb } from '../../lib/mockDb';
import { isMockMode } from '../../lib/supabase';
import { X, Save, ShieldX } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ProfilePage() {
  const { user, profile, updateProfile } = useAuthStore();
  const { events, fetchEvents } = useEventStore();
  const { unblockUser } = useChatStore();

  const [fullName, setFullName] = useState('');
  const [bio, setBio] = useState('');
  const [avatarSeed, setAvatarSeed] = useState('');
  const [skills, setSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState('');
  const [interests, setInterests] = useState<string[]>([]);
  const [interestInput, setInterestInput] = useState('');
  const [goal, setGoal] = useState<string>('teammate');
  const [linkedin, setLinkedin] = useState('');
  const [github, setGithub] = useState('');
  const [selectedEventId, setSelectedEventId] = useState('');
  const [saving, setSaving] = useState(false);

  // Blocklist states
  const [blockedUsers, setBlockedUsers] = useState<any[]>([]);

  // Load active events
  useEffect(() => {
    fetchEvents();
    fetchBlocklist();
  }, [fetchEvents]);

  // Sync profile details
  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '');
      setBio(profile.bio || '');
      setSkills(profile.skills || []);
      setInterests(profile.interests || []);
      setGoal(profile.looking_for || 'teammate');
      setLinkedin(profile.linkedin_url || '');
      setGithub(profile.github_url || '');
      setSelectedEventId(profile.event_id || '');
      
      // Extract Dicebear seed from url if possible
      if (profile.avatar_url && profile.avatar_url.includes('seed=')) {
        const seed = decodeURIComponent(profile.avatar_url.split('seed=')[1]);
        setAvatarSeed(seed);
      } else {
        setAvatarSeed(profile.full_name || 'HackConnect');
      }
    }
  }, [profile]);

  const fetchBlocklist = async () => {
    if (!user) return;
    try {
      if (isMockMode) {
        const blocks = mockDb.getBlocks().filter(b => b.blocker_id === user.id);
        const profiles = mockDb.getProfiles();
        const list = blocks.map(b => profiles.find(p => p.id === b.blocked_id)).filter(Boolean);
        setBlockedUsers(list);
      } else {
        // Query database
        // fetch blocklist using profiles joined with blocked_users
        // for simplicity, search all blocks
        const blocks = mockDb.getStore<any>('blocked_users', []).filter((b: any) => b.blocker_id === user.id);
        const profiles = mockDb.getProfiles();
        const list = blocks.map((b: any) => profiles.find(p => p.id === b.blocked_id)).filter(Boolean);
        setBlockedUsers(list);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUnblock = async (blockedId: string) => {
    if (!user) return;
    try {
      await unblockUser(user.id, blockedId);
      toast.success('User unblocked');
      fetchBlocklist();
    } catch (err) {
      toast.error('Failed to unblock');
    }
  };

  const addSkill = (skill: string) => {
    const trimmed = skill.trim();
    if (trimmed && !skills.includes(trimmed)) {
      setSkills([...skills, trimmed]);
    }
    setSkillInput('');
  };

  const removeSkill = (index: number) => {
    setSkills(skills.filter((_, i) => i !== index));
  };

  const addInterest = (interest: string) => {
    const trimmed = interest.trim();
    if (trimmed && !interests.includes(trimmed)) {
      setInterests([...interests, trimmed]);
    }
    setInterestInput('');
  };

  const removeInterest = (index: number) => {
    setInterests(interests.filter((_, i) => i !== index));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!fullName.trim()) {
      toast.error('Full name is required');
      return;
    }
    if (skills.length === 0) {
      toast.error('At least one skill is required');
      return;
    }

    setSaving(true);
    try {
      const avatarUrl = `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(avatarSeed)}`;
      
      let formattedLinkedin = linkedin.trim();
      if (formattedLinkedin && !formattedLinkedin.startsWith('http')) {
        formattedLinkedin = `https://${formattedLinkedin}`;
      }
      
      let formattedGithub = github.trim();
      if (formattedGithub && !formattedGithub.startsWith('http')) {
        formattedGithub = `https://${formattedGithub}`;
      }

      await updateProfile({
        full_name: fullName,
        bio,
        skills,
        interests,
        looking_for: goal as any,
        avatar_url: avatarUrl,
        linkedin_url: formattedLinkedin || undefined,
        github_url: formattedGithub || undefined,
        event_id: selectedEventId || undefined
      });

      // Update local storage event participant connection details if we switched events
      if (selectedEventId && selectedEventId !== profile?.event_id) {
        if (isMockMode) {
          const participations = mockDb.getStore<any>('hc_event_participants', []);
          // Remove old event joined rows
          const filtered = participations.filter((p: any) => p.user_id !== user.id);
          mockDb.setStore('hc_event_participants', [
            ...filtered,
            { id: Math.random().toString(), event_id: selectedEventId, user_id: user.id }
          ]);
        }
      }

      toast.success('Profile saved ✓');
    } catch (err: any) {
      toast.error(err.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const activeEvents = events.filter(e => e.is_active);

  return (
    <div className="flex-1 overflow-y-auto px-6 py-6 space-y-8 pb-24 md:pb-12 max-w-4xl">
      
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white mb-1">Edit Profile</h1>
        <p className="text-sm text-zinc-400">Update your credentials and matchmaking requirements.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Main form */}
        <form onSubmit={handleSave} className="lg:col-span-2 space-y-6">
          
          {/* Avatar and name */}
          <div className="glass-panel p-6 rounded-2xl border border-zinc-850 space-y-4">
            <h3 className="font-bold text-sm text-white uppercase tracking-wider">Basic Info</h3>
            
            <div className="flex flex-col sm:flex-row items-center gap-5">
              <div className="w-20 h-20 rounded-full border border-zinc-800 bg-zinc-900 overflow-hidden flex items-center justify-center relative flex-shrink-0">
                <img
                  src={`https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(avatarSeed)}`}
                  alt="Avatar"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex-grow w-full space-y-1">
                <label className="block text-[10px] font-bold text-zinc-450 uppercase tracking-wider">Avatar Seed</label>
                <input
                  type="text"
                  value={avatarSeed}
                  onChange={(e) => setAvatarSeed(e.target.value)}
                  className="w-full text-xs rounded-xl border border-zinc-800 bg-zinc-900/40 px-3.5 py-2 text-zinc-200 focus:outline-none"
                />
                <p className="text-[10px] text-zinc-500">Updates live using custom seed terms.</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Full Name</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full text-sm rounded-xl border border-zinc-800 bg-zinc-900/60 px-4 py-3 text-zinc-200 placeholder-zinc-650 focus:outline-none focus:border-brand-indigo"
                />
              </div>

              <div>
                <div className="flex justify-between mb-2">
                  <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider">Bio Description</label>
                  <span className="text-xs text-zinc-550">{bio.length}/300</span>
                </div>
                <textarea
                  maxLength={300}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={4}
                  className="w-full text-sm rounded-xl border border-zinc-800 bg-zinc-900/60 px-4 py-3 text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-brand-indigo resize-none"
                />
              </div>
            </div>
          </div>

          {/* Goal selection card grid */}
          <div className="glass-panel p-6 rounded-2xl border border-zinc-850 space-y-4">
            <h3 className="font-bold text-sm text-white uppercase tracking-wider">Goal & Links</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { key: 'teammate', label: '🤝 Looking for a teammate', desc: 'Join a hackathon project squad' },
                { key: 'mentor', label: '🧠 Looking for a mentor', desc: 'Learn and get technical advice' },
                { key: 'collaborator', label: '💡 Open to collaborating', desc: 'Open to discuss ideas/code' },
                { key: 'networking', label: '🌐 General networking', desc: 'Connecting with people' }
              ].map(item => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setGoal(item.key)}
                  className={`text-left p-3.5 rounded-xl border flex flex-col justify-between h-20 transition-all ${
                    goal === item.key
                      ? 'border-brand-indigo bg-brand-indigo/10 ring-1 ring-brand-indigo'
                      : 'border-zinc-800 bg-zinc-900/40 hover:bg-zinc-800'
                  }`}
                >
                  <h4 className="font-bold text-xs text-white">{item.label}</h4>
                  <p className="text-[10px] text-zinc-550">{item.desc}</p>
                </button>
              ))}
            </div>

            <div className="space-y-3 pt-3">
              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">LinkedIn URL</label>
                <input
                  type="text"
                  value={linkedin}
                  onChange={(e) => setLinkedin(e.target.value)}
                  placeholder="linkedin.com/in/username"
                  className="w-full text-xs rounded-xl border border-zinc-805 bg-zinc-900/60 px-4 py-2.5 text-zinc-200 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">GitHub URL</label>
                <input
                  type="text"
                  value={github}
                  onChange={(e) => setGithub(e.target.value)}
                  placeholder="github.com/username"
                  className="w-full text-xs rounded-xl border border-zinc-805 bg-zinc-900/60 px-4 py-2.5 text-zinc-200 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Tag inputs */}
          <div className="glass-panel p-6 rounded-2xl border border-zinc-850 space-y-6">
            <h3 className="font-bold text-sm text-white uppercase tracking-wider">Skills & Interests</h3>
            
            {/* Skills */}
            <div className="space-y-2.5">
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider">Skills</label>
              <div className="flex flex-wrap gap-2 p-2 bg-zinc-900 border border-zinc-800 rounded-xl min-h-[45px] items-center">
                {skills.map((skill, index) => (
                  <span key={index} className="inline-flex items-center gap-1.5 text-xs px-2 py-0.5 bg-brand-indigo/10 border border-brand-indigo/35 text-brand-indigo rounded-full">
                    {skill}
                    <button type="button" onClick={() => removeSkill(index)} className="hover:text-white"><X size={10} /></button>
                  </span>
                ))}
                <input
                  type="text"
                  value={skillInput}
                  onChange={(e) => setSkillInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ',') {
                      e.preventDefault();
                      addSkill(skillInput);
                    }
                  }}
                  placeholder="Add skill..."
                  className="flex-grow bg-transparent border-none outline-none text-xs px-2 text-zinc-200"
                />
              </div>
            </div>

            {/* Interests */}
            <div className="space-y-2.5">
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider">Interests</label>
              <div className="flex flex-wrap gap-2 p-2 bg-zinc-900 border border-zinc-800 rounded-xl min-h-[45px] items-center">
                {interests.map((interest, index) => (
                  <span key={index} className="inline-flex items-center gap-1.5 text-xs px-2 py-0.5 bg-brand-purple/10 border border-brand-purple/35 text-brand-purple rounded-full">
                    {interest}
                    <button type="button" onClick={() => removeInterest(index)} className="hover:text-white"><X size={10} /></button>
                  </span>
                ))}
                <input
                  type="text"
                  value={interestInput}
                  onChange={(e) => setInterestInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ',') {
                      e.preventDefault();
                      addInterest(interestInput);
                    }
                  }}
                  placeholder="Add interest..."
                  className="flex-grow bg-transparent border-none outline-none text-xs px-2 text-zinc-200"
                />
              </div>
            </div>
          </div>

          {/* Action trigger */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={saving}
              className="btn-primary-gradient px-8 py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 text-white shadow-lg disabled:opacity-40 w-full sm:w-auto"
            >
              {saving ? (
                <div className="w-5 h-5 border-2 border-t-transparent border-white rounded-full animate-spin"></div>
              ) : (
                <Save size={16} />
              )}
              <span>Save Changes</span>
            </button>
          </div>

        </form>

        {/* Right sidebar config */}
        <div className="space-y-6">
          
          {/* Active event change card */}
          <div className="glass-panel p-6 rounded-2xl border border-zinc-850 space-y-4">
            <h3 className="font-bold text-sm text-white uppercase tracking-wider">Switch Event</h3>
            <p className="text-xs text-zinc-500">You are currently participating in: <strong className="text-zinc-200">{events.find(e => e.id === selectedEventId)?.name}</strong></p>
            
            <div className="space-y-3">
              <select
                value={selectedEventId}
                onChange={(e) => setSelectedEventId(e.target.value)}
                className="w-full text-xs rounded-xl border border-zinc-800 bg-zinc-900/60 p-2.5 text-zinc-200 focus:outline-none"
              >
                <option value="">Choose an event...</option>
                {activeEvents.map(evt => (
                  <option key={evt.id} value={evt.id}>{evt.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Block list configuration */}
          <div className="glass-panel p-6 rounded-2xl border border-zinc-850 space-y-4">
            <h3 className="font-bold text-sm text-white uppercase tracking-wider">Blocked Users</h3>
            <p className="text-xs text-zinc-500">Manage individuals you have blocked. Blocking prevents suggestions, chats, and location visibility.</p>
            
            <div className="space-y-3 max-h-56 overflow-y-auto pr-1">
              {blockedUsers.length === 0 ? (
                <div className="text-center py-6 border border-zinc-900 border-dashed rounded-xl text-zinc-500 text-xs italic">
                  No blocked users.
                </div>
              ) : (
                blockedUsers.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-2 rounded-xl bg-zinc-950 border border-zinc-900">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <img
                        src={item.avatar_url || `https://api.dicebear.com/7.x/adventurer/svg?seed=${item.full_name}`}
                        alt={item.full_name}
                        className="w-8 h-8 rounded-full object-cover border border-zinc-800"
                      />
                      <span className="text-xs font-bold text-zinc-300 truncate max-w-[100px]">{item.full_name}</span>
                    </div>
                    
                    <button
                      onClick={() => handleUnblock(item.id)}
                      className="p-1.5 bg-zinc-900 border border-zinc-800 hover:border-brand-emerald hover:bg-brand-emerald/10 text-zinc-400 hover:text-brand-emerald rounded-lg"
                      title="Unblock User"
                    >
                      <ShieldX size={13} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
