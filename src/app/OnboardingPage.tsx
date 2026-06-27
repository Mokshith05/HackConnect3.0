import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/useAuthStore';
import { useEventStore } from '../stores/useEventStore';
import { ArrowRight, ArrowLeft, Check, Sparkles, Plus, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { Starfield } from './participant/Starfield';

const COMMON_SKILLS = ['React', 'Python', 'TypeScript', 'ML/AI', 'Node.js', 'Go', 'Tailwind', 'Flutter', 'Figma', 'Solidity', 'SQL', 'C++', 'Java', 'Next.js'];
const COMMON_INTERESTS = ['AI/ML', 'Web3', 'EdTech', 'HealthTech', 'FinTech', 'Gaming', 'SaaS', 'Social Impact', 'Design Systems', 'DevOps'];

export default function OnboardingPage() {
  const navigate = useNavigate();
  const { profile, onboard } = useAuthStore();
  const { events, fetchEvents } = useEventStore();

  const [step, setStep] = useState(1);
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [bio, setBio] = useState(profile?.bio || '');
  const [avatarSeed, setAvatarSeed] = useState(profile?.full_name || 'HackConnect');
  const [skills, setSkills] = useState<string[]>(profile?.skills || []);
  const [skillInput, setSkillInput] = useState('');
  const [interests, setInterests] = useState<string[]>(profile?.interests || []);
  const [interestInput, setInterestInput] = useState('');
  const [goal, setGoal] = useState<string>(profile?.looking_for || 'teammate');
  const [linkedin, setLinkedin] = useState(profile?.linkedin_url || '');
  const [github, setGithub] = useState(profile?.github_url || '');
  const [selectedEventId, setSelectedEventId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  useEffect(() => {
    if (profile?.full_name) {
      setFullName(profile.full_name);
      setAvatarSeed(profile.full_name);
    }
  }, [profile]);

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

  const handleNext = () => {
    if (step === 1 && !fullName.trim()) {
      toast.error('Please enter your full name');
      return;
    }
    if (step === 2 && skills.length === 0) {
      toast.error('Please add at least one skill to match with others');
      return;
    }
    if (step === 3 && linkedin && !linkedin.startsWith('https://linkedin.com/in/') && !linkedin.startsWith('linkedin.com/in/')) {
      toast.error('LinkedIn URL must start with linkedin.com/in/');
      return;
    }
    setStep(step + 1);
  };

  const handlePrev = () => {
    setStep(step - 1);
  };

  const handleSubmit = async () => {
    if (!selectedEventId) {
      toast.error('Please select an active event to join');
      return;
    }

    setSubmitting(true);
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

      await onboard({
        fullName,
        bio,
        skills,
        interests,
        looking_for: goal as any,
        avatar_url: avatarUrl,
        linkedin_url: formattedLinkedin || undefined,
        github_url: formattedGithub || undefined,
        event_id: selectedEventId
      });

      toast.success('Onboarding complete! Welcome to HackConnect.');
      navigate('/app/home');
    } catch (err: any) {
      toast.error(err.message || 'Failed to complete profile');
    } finally {
      setSubmitting(false);
    }
  };

  const activeEvents = events.filter(e => e.is_active);

  return (
    <div className="relative min-h-screen bg-[#0F0F10] text-zinc-100 flex items-center justify-center p-6 overflow-hidden">
      
      {/* Starfield background animation */}
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
        <Starfield bgColor="#0F0F10" starColor="rgba(255, 255, 255, 0.45)" quantity={256} speed={0.25} />
      </div>

      {/* Glow rings */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-brand-indigo/10 blur-[120px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-brand-purple/10 blur-[120px]" />

      <div className="max-w-xl w-full z-10">

        {/* Step Indicator Header */}
        <div className="mb-8">
          <div className="flex justify-between text-xs text-zinc-500 uppercase tracking-wider mb-2 font-semibold">
            <span>Profile Setup</span>
            <span>Step {step} of 4</span>
          </div>
          <div className="w-full bg-zinc-900 h-1.5 rounded-full overflow-hidden border border-zinc-800">
            <div
              className="bg-gradient-to-r from-brand-indigo to-brand-purple h-full transition-all duration-300"
              style={{ width: `${(step / 4) * 100}%` }}
            />
          </div>
        </div>

        {/* Card Body */}
        <div className="glass-panel p-8 rounded-2xl glow-purple border border-zinc-850 shadow-2xl">

          {/* STEP 1: Basic Profile Info */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold mb-2">Tell us about yourself</h2>
                <p className="text-sm text-zinc-400">Introduce yourself to potential teammates at the hackathon.</p>
              </div>

              {/* Avatar Selector Mockup */}
              <div className="flex flex-col sm:flex-row items-center gap-6 py-4">
                <div className="relative group">
                  <div className="w-24 h-24 rounded-full bg-zinc-850 border-2 border-brand-indigo/30 overflow-hidden flex items-center justify-center relative">
                    <img
                      src={`https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(avatarSeed)}`}
                      alt="Avatar Preview"
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
                <div className="flex-1 w-full space-y-2">
                  <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider">Customize Avatar Seed</label>
                  <input
                    type="text"
                    value={avatarSeed}
                    onChange={(e) => setAvatarSeed(e.target.value)}
                    placeholder="Enter nickname or seed text..."
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-900/60 px-4 py-2.5 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-brand-indigo transition-all"
                  />
                  <p className="text-xs text-zinc-500">Avatar updates live as you type using Dicebear.</p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Full Name</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => {
                    setFullName(e.target.value);
                    setAvatarSeed(e.target.value);
                  }}
                  placeholder="e.g. Alex Rivera"
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-900/60 px-4 py-3 text-zinc-200 placeholder-zinc-655 focus:outline-none focus:border-brand-indigo transition-all"
                />
              </div>

              <div>
                <div className="flex justify-between mb-2">
                  <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider">Bio</label>
                  <span className="text-xs text-zinc-500">{bio.length}/300</span>
                </div>
                <textarea
                  maxLength={300}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="e.g. Fullstack hacker. I love building scalable backends and API endpoints in Go/Node. Looking to pair up with a CSS/React designer!"
                  rows={4}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-900/60 px-4 py-3 text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-brand-indigo transition-all resize-none text-sm leading-relaxed"
                />
              </div>
            </div>
          )}

          {/* STEP 2: Skills and Interests */}
          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold mb-2">Skills & Interests</h2>
                <p className="text-sm text-zinc-400">We use these to calculate matches and compatibility scores.</p>
              </div>

              {/* Skills Tag Input */}
              <div className="space-y-3">
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider">Skills</label>
                <div className="flex flex-wrap gap-2 p-2 bg-zinc-900 border border-zinc-800 rounded-xl min-h-[50px] items-center">
                  {skills.map((skill, index) => (
                    <span key={index} className="inline-flex items-center gap-1 text-xs px-2.5 py-1 bg-brand-indigo/10 border border-brand-indigo/30 rounded-full text-brand-indigo">
                      {skill}
                      <button type="button" onClick={() => removeSkill(index)} className="hover:text-white">
                        <X size={12} />
                      </button>
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
                    placeholder={skills.length === 0 ? "Type a skill & press Enter..." : ""}
                    className="flex-1 bg-transparent outline-none text-sm px-2 text-zinc-200 border-none min-w-[150px]"
                  />
                </div>
                {/* Common Skill suggestions */}
                <div className="flex flex-wrap gap-1.5 pt-1.5">
                  <span className="text-xs text-zinc-500 mr-1.5 self-center">Suggestions:</span>
                  {COMMON_SKILLS.filter(s => !skills.includes(s)).slice(0, 7).map((suggested) => (
                    <button
                      key={suggested}
                      type="button"
                      onClick={() => addSkill(suggested)}
                      className="text-xs px-2.5 py-1 rounded-lg border border-zinc-800 bg-zinc-950 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-all flex items-center gap-1"
                    >
                      <Plus size={10} />
                      {suggested}
                    </button>
                  ))}
                </div>
              </div>

              {/* Interests Tag Input */}
              <div className="space-y-3">
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider">Interests</label>
                <div className="flex flex-wrap gap-2 p-2 bg-zinc-900 border border-zinc-800 rounded-xl min-h-[50px] items-center">
                  {interests.map((interest, index) => (
                    <span key={index} className="inline-flex items-center gap-1 text-xs px-2.5 py-1 bg-brand-purple/10 border border-brand-purple/30 rounded-full text-brand-purple">
                      {interest}
                      <button type="button" onClick={() => removeInterest(index)} className="hover:text-white">
                        <X size={12} />
                      </button>
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
                    placeholder={interests.length === 0 ? "Type an interest & press Enter..." : ""}
                    className="flex-1 bg-transparent outline-none text-sm px-2 text-zinc-200 border-none min-w-[150px]"
                  />
                </div>
                {/* Common Interest suggestions */}
                <div className="flex flex-wrap gap-1.5 pt-1.5">
                  <span className="text-xs text-zinc-500 mr-1.5 self-center">Suggestions:</span>
                  {COMMON_INTERESTS.filter(i => !interests.includes(i)).slice(0, 7).map((suggested) => (
                    <button
                      key={suggested}
                      type="button"
                      onClick={() => addInterest(suggested)}
                      className="text-xs px-2.5 py-1 rounded-lg border border-zinc-800 bg-zinc-950 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-all flex items-center gap-1"
                    >
                      <Plus size={10} />
                      {suggested}
                    </button>
                  ))}
                </div>
              </div>

            </div>
          )}

          {/* STEP 3: Networking Goal */}
          {step === 3 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold mb-2">What is your goal?</h2>
                <p className="text-sm text-zinc-400">Help others understand how they can collaborate with you.</p>
              </div>

              {/* Goal Single-select Card Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { key: 'teammate', label: 'Looking for a teammate', desc: 'Find other hackers to build a project with.', emoji: '🤝' },
                  { key: 'mentor', label: 'Looking for a mentor', desc: 'Connect with experienced guides.', emoji: '🧠' },
                  { key: 'collaborator', label: 'Open to collaborating', desc: 'Have ideas and looking for cross-checks.', emoji: '💡' },
                  { key: 'networking', label: 'General networking', desc: 'Expand your network and share contacts.', emoji: '🌐' }
                ].map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setGoal(item.key)}
                    className={`text-left p-4 rounded-xl border flex flex-col justify-between h-28 transition-all ${goal === item.key
                        ? 'border-brand-indigo bg-brand-indigo/10 ring-1 ring-brand-indigo'
                        : 'border-zinc-800 bg-zinc-900/60 hover:bg-zinc-800/80 hover:border-zinc-700'
                      }`}
                  >
                    <span className="text-2xl">{item.emoji}</span>
                    <div>
                      <h4 className="font-bold text-sm text-white">{item.label}</h4>
                      <p className="text-xs text-zinc-400">{item.desc}</p>
                    </div>
                  </button>
                ))}
              </div>

              {/* Optional Links */}
              <div className="space-y-4 pt-4 border-t border-zinc-850">
                <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Social Channels (Optional)</h4>

                <div className="flex gap-2">
                  <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 flex-shrink-0">
                    <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
                      <rect x="2" y="9" width="4" height="12" />
                      <circle cx="4" cy="4" r="2" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    value={linkedin}
                    onChange={(e) => setLinkedin(e.target.value)}
                    placeholder="linkedin.com/in/username"
                    className="w-full text-sm rounded-xl border border-zinc-800 bg-zinc-900/60 px-4 py-2 text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-brand-indigo transition-all"
                  />
                </div>

                <div className="flex gap-2">
                  <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 flex-shrink-0">
                    <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
                      <path d="M9 18c-4.51 2-5-2-7-2" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    value={github}
                    onChange={(e) => setGithub(e.target.value)}
                    placeholder="github.com/username"
                    className="w-full text-sm rounded-xl border border-zinc-800 bg-zinc-900/60 px-4 py-2 text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-brand-indigo transition-all"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: Choose Event */}
          {step === 4 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold mb-2">Join an Event</h2>
                <p className="text-sm text-zinc-400">Select the event you are currently attending to start matches.</p>
              </div>

              <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                {activeEvents.length === 0 ? (
                  <div className="text-center py-8 border border-dashed border-zinc-800 rounded-xl text-zinc-500">
                    No active hackathons found. Please contact the administrator.
                  </div>
                ) : (
                  activeEvents.map((evt) => (
                    <button
                      key={evt.id}
                      type="button"
                      onClick={() => setSelectedEventId(evt.id)}
                      className={`w-full text-left p-4 rounded-xl border transition-all ${selectedEventId === evt.id
                          ? 'border-brand-indigo bg-brand-indigo/10 ring-1 ring-brand-indigo'
                          : 'border-zinc-800 bg-zinc-900/60 hover:bg-zinc-800'
                        }`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-bold text-white leading-tight">{evt.name}</h4>
                        {selectedEventId === evt.id && (
                          <span className="w-5 h-5 rounded-full bg-brand-indigo flex items-center justify-center text-white text-[10px]">
                            <Check size={12} strokeWidth={3} />
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-zinc-400 line-clamp-2 mb-2">{evt.description}</p>
                      <div className="text-[10px] text-zinc-500 font-medium">📍 {evt.location || 'Virtual'}</div>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Footer Controls */}
          <div className="flex justify-between gap-4 mt-8 pt-6 border-t border-zinc-850">
            {step > 1 ? (
              <button
                type="button"
                onClick={handlePrev}
                className="flex items-center gap-1.5 px-4 py-2 border border-zinc-800 hover:border-zinc-700 bg-zinc-900 hover:bg-zinc-800 rounded-lg text-sm font-semibold transition-all"
              >
                <ArrowLeft size={16} />
                Back
              </button>
            ) : (
              <div />
            )}

            {step < 4 ? (
              <button
                type="button"
                onClick={handleNext}
                className="btn-primary-gradient px-6 py-2 rounded-lg text-sm font-semibold flex items-center gap-1.5 text-white"
              >
                Next Step
                <ArrowRight size={16} />
              </button>
            ) : (
              <button
                type="button"
                disabled={submitting || !selectedEventId}
                onClick={handleSubmit}
                className="btn-primary-gradient px-6 py-2 rounded-lg text-sm font-semibold flex items-center gap-1.5 text-white disabled:opacity-40"
              >
                {submitting ? 'Setting up...' : 'Join Event & Finish'}
                <Sparkles size={16} />
              </button>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}
