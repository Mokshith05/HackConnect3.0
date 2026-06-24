import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/useAuthStore';
import { useNetworkingStore } from '../../stores/useNetworkingStore';
import { useChatStore } from '../../stores/useChatStore';
import type { Profile } from '../../types';
import { MessageSquare, MapPin, Eye, ShieldAlert, X, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ConnectionsPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { connections, locations } = useNetworkingStore();
  const { blockUser, reportUser } = useChatStore();

  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [reportReason, setReportReason] = useState('Spam');
  const [reportDetails, setReportDetails] = useState('');

  const handleBlock = async (targetUserId: string) => {
    if (!user) return;
    const confirm = window.confirm('Are you sure you want to block this connection? All messaging and location sharing will be severed instantly.');
    if (!confirm) return;

    try {
      await blockUser(user.id, targetUserId);
      setSelectedProfile(null);
      toast.success('Connection blocked');
    } catch (err) {
      toast.error('Failed to block user');
    }
  };

  const handleReportSubmit = async () => {
    if (!user || !selectedProfile) return;
    try {
      await reportUser(user.id, selectedProfile.id, reportReason, reportDetails);
      toast.success('Report submitted successfully');
      setShowReportDialog(false);
      setReportDetails('');
    } catch (err) {
      toast.error('Failed to submit report');
    }
  };

  return (
    <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6 pb-24 md:pb-12">
      
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white mb-1">My Connections</h1>
        <p className="text-sm text-zinc-400">Attendees you have mutually agreed to connect with.</p>
      </div>

      {connections.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center py-20 border border-dashed border-zinc-850 rounded-2xl bg-zinc-950/20 max-w-2xl mx-auto space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-brand-indigo/10 flex items-center justify-center text-brand-indigo">
            <MessageSquare size={28} />
          </div>
          <div className="space-y-1">
            <h3 className="font-bold text-lg text-white">No connections yet</h3>
            <p className="text-sm text-zinc-500 max-w-sm">
              Head to the home feed to find participants, send matching invitations, and start building your network.
            </p>
          </div>
          <button
            onClick={() => navigate('/app/home')}
            className="btn-primary-gradient px-5 py-2.5 rounded-xl text-xs font-bold text-white"
          >
            Explore Attendees
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {connections.map((conn) => {
            const other = conn.other_user;
            if (!other) return null;

            // Fetch location status
            const loc = locations[other.id];
            const availability = loc?.availability || 'offline';
            const availabilityDot = 
              availability === 'available' ? 'bg-brand-emerald' : 
              availability === 'busy' ? 'bg-brand-amber' : 'bg-zinc-650';

            return (
              <div
                key={conn.id}
                className="glass-panel p-5 rounded-2xl border border-zinc-850 flex flex-col justify-between space-y-4 relative"
              >
                {/* Profile header */}
                <div className="flex items-start gap-3 min-w-0">
                  <div className="relative flex-shrink-0">
                    <img
                      src={other.avatar_url || `https://api.dicebear.com/7.x/adventurer/svg?seed=${other.full_name}`}
                      alt={other.full_name}
                      className="w-12 h-12 rounded-full border border-zinc-850 object-cover"
                    />
                    <span className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-[#0F0F10] ${availabilityDot}`} />
                  </div>
                  
                  <div className="min-w-0 flex-1">
                    <h3 className="font-bold text-sm text-white truncate hover:text-brand-indigo cursor-pointer" onClick={() => setSelectedProfile(other)}>
                      {other.full_name}
                    </h3>
                    <div className="text-[10px] text-zinc-500 font-semibold">{other.looking_for ? `Looking for ${other.looking_for}` : 'Networking'}</div>
                  </div>
                </div>

                {/* Shared Location Status */}
                {loc ? (
                  <div className="bg-zinc-950/50 border border-zinc-900 rounded-xl p-3 space-y-1.5">
                    <div className="text-[10px] text-brand-indigo font-bold uppercase tracking-wider flex items-center gap-1">
                      <MapPin size={10} />
                      <span>Shared Location</span>
                    </div>
                    <p className="text-xs text-white font-semibold truncate">{loc.zone}</p>
                    {loc.custom_note && (
                      <p className="text-[10px] text-zinc-400 italic truncate">"{loc.custom_note}"</p>
                    )}
                  </div>
                ) : (
                  <div className="bg-zinc-950/20 border border-dashed border-zinc-900 rounded-xl p-3 text-center">
                    <p className="text-[10px] text-zinc-500">No shared location update yet.</p>
                  </div>
                )}

                {/* Overlapping skills list */}
                <div className="flex flex-wrap gap-1">
                  {other.skills.slice(0, 3).map((skill) => (
                    <span key={skill} className="text-[9px] bg-brand-indigo/10 text-brand-indigo px-2 py-0.5 rounded-full">
                      {skill}
                    </span>
                  ))}
                </div>

                {/* Action buttons */}
                <div className="flex gap-2 pt-2 border-t border-zinc-900">
                  <button
                    onClick={() => navigate(`/app/chat/${conn.id}`)}
                    className="flex-1 btn-primary-gradient py-2 px-3 rounded-lg text-xs font-bold text-white flex items-center justify-center gap-1.5 shadow"
                  >
                    <MessageSquare size={12} />
                    <span>Chat</span>
                  </button>
                  <button
                    onClick={() => setSelectedProfile(other)}
                    className="flex-1 text-xs bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 font-semibold py-2 px-3 rounded-lg flex items-center justify-center gap-1.5"
                  >
                    <Eye size={12} />
                    <span>Profile</span>
                  </button>
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* Profile preview Modal */}
      {selectedProfile && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-lg rounded-2xl border border-zinc-850 shadow-2xl p-6 relative animate-zoom-in max-h-[90vh] overflow-y-auto">
            
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
                  const label = 
                    avail === 'available' ? 'Available' : 
                    avail === 'busy' ? 'Busy (Do Not Disturb)' : 'Offline';
                  const color = 
                    avail === 'available' ? 'text-brand-emerald bg-brand-emerald/10' : 
                    avail === 'busy' ? 'text-brand-amber bg-brand-amber/10' : 'text-zinc-500 bg-zinc-900';

                  return (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-center sm:justify-start gap-1.5">
                        <span className={`w-2.5 h-2.5 rounded-full ${
                          avail === 'available' ? 'bg-brand-emerald' : 
                          avail === 'busy' ? 'bg-brand-amber' : 'bg-zinc-650'
                        }`} />
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-md ${color}`}>{label}</span>
                      </div>
                      
                      {loc && (
                        <div className="text-xs text-zinc-400 font-semibold bg-zinc-950 px-3 py-1.5 rounded-lg inline-flex items-center gap-1.5">
                          <MapPin size={12} className="text-brand-indigo" />
                          <span>Currently at: <strong className="text-white">{loc.zone}</strong></span>
                          {loc.custom_note && <span className="text-zinc-500">({loc.custom_note})</span>}
                        </div>
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
                {selectedProfile.skills.map(skill => (
                  <span key={skill} className="text-xs px-2.5 py-1 bg-brand-indigo/10 text-brand-indigo border border-brand-indigo/35 rounded-full font-semibold">
                    {skill}
                  </span>
                ))}
              </div>
            </div>

            {/* Interests grid */}
            <div className="py-4 space-y-2 border-b border-zinc-900">
              <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Interests</h4>
              <div className="flex flex-wrap gap-1.5">
                {selectedProfile.interests.map(interest => (
                  <span key={interest} className="text-xs px-2.5 py-1 bg-brand-purple/10 text-brand-purple border border-brand-purple/35 rounded-full font-semibold">
                    {interest}
                  </span>
                ))}
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
              </div>

            </div>

          </div>
        </div>
      )}

      {/* Report submit dialog */}
      {showReportDialog && selectedProfile && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-md rounded-2xl border border-brand-rose/25 shadow-2xl p-6 relative animate-zoom-in">
            <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-1.5 text-brand-rose">
              <AlertTriangle size={18} />
              <span>Report Connection</span>
            </h3>
            <p className="text-xs text-zinc-400 mb-4">
              Submit report to hackathon administrators. Action will be taken for inappropriate behaviour.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5">Reason</label>
                <select
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  className="w-full text-xs rounded-xl border border-zinc-800 bg-zinc-900/60 p-2.5 text-zinc-200 focus:outline-none"
                >
                  <option value="Spam">Spam or solicitations</option>
                  <option value="Harassment">Abuse or harassment</option>
                  <option value="Impersonation">Fake profile representation</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5">Additional Details</label>
                <textarea
                  rows={3}
                  value={reportDetails}
                  onChange={(e) => setReportDetails(e.target.value)}
                  placeholder="Provide context..."
                  className="w-full text-xs rounded-xl border border-zinc-800 bg-zinc-900/60 p-2.5 text-zinc-200 focus:outline-none resize-none"
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
                  className="text-xs bg-brand-rose text-white font-bold px-4 py-2 rounded-lg"
                >
                  Submit
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
