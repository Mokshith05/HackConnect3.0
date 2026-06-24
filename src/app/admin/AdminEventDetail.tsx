import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useEventStore } from '../../stores/useEventStore';
import { mockDb } from '../../lib/mockDb';
import { isMockMode } from '../../lib/supabase';
import type { Profile } from '../../types';
import { ChevronLeft, Search, Download, Trash, ShieldX, Mail, Eye, X } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdminEventDetail() {
  const { eventId } = useParams<{ eventId: string }>();
  const { events, participants, fetchParticipants, removeParticipant } = useEventStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);

  const activeEvent = events.find(e => e.id === eventId);

  useEffect(() => {
    if (eventId) {
      fetchParticipants(eventId);
    }
  }, [eventId, fetchParticipants]);

  const handleRemoveParticipant = async (userId: string) => {
    if (!eventId) return;
    const confirm = window.confirm('Are you sure you want to remove this participant from the event?');
    if (!confirm) return;

    try {
      await removeParticipant(eventId, userId);
      toast.success('Participant removed from event');
    } catch (err) {
      toast.error('Failed to remove participant');
    }
  };

  const handleBanUser = async (userId: string) => {
    const confirm = window.confirm('Are you sure you want to ban this user? This will delete their event enrollment, remove profile details, and prevent login.');
    if (!confirm) return;

    try {
      if (isMockMode) {
        // Remove from event
        if (eventId) await removeParticipant(eventId, userId);
        // Delete profile
        const profiles = mockDb.getProfiles().filter(p => p.id !== userId);
        mockDb.setProfiles(profiles);
        // Delete from auth users
        const currentUser = mockDb.getCurrentUser();
        if (currentUser && currentUser.id === userId) {
          mockDb.setCurrentUser(null);
        }
      } else {
        // Run DB deletions
        if (eventId) await removeParticipant(eventId, userId);
      }
      
      toast.success('User banned from platform');
      if (eventId) fetchParticipants(eventId);
    } catch (err) {
      toast.error('Failed to ban user');
    }
  };

  // CSV Export logic
  const handleExportCSV = () => {
    if (participants.length === 0) {
      toast.error('No participants to export');
      return;
    }

    const headers = ['Full Name', 'Email', 'Skills', 'Interests', 'Networking Goal', 'LinkedIn', 'GitHub'];
    const rows = participants.map(p => [
      p.full_name,
      p.email,
      p.skills.join('; '),
      p.interests.join('; '),
      p.looking_for || 'networking',
      p.linkedin_url || '',
      p.github_url || ''
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(e => e.map(val => `"${val.replace(/"/g, '""')}"`).join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${activeEvent?.name || 'event'}_participants.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('CSV Exported ✓');
  };

  // Search Filter
  const filteredParticipants = participants.filter(p => {
    const q = searchQuery.toLowerCase();
    const nameMatch = p.full_name.toLowerCase().includes(q);
    const emailMatch = p.email.toLowerCase().includes(q);
    const skillMatch = p.skills.some(s => s.toLowerCase().includes(q));
    return nameMatch || emailMatch || skillMatch;
  });

  return (
    <div className="min-h-screen bg-[#0F0F10] text-zinc-100 flex flex-col">
      
      {/* Header toolbar */}
      <header className="border-b border-zinc-900 bg-zinc-950 px-6 py-4 flex justify-between items-center z-15">
        <div className="flex items-center gap-3">
          <Link to="/admin/dashboard" className="p-1.5 hover:bg-zinc-900 text-zinc-400 hover:text-white rounded-lg">
            <ChevronLeft size={16} />
          </Link>
          <div className="min-w-0">
            <div className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Event Detail View</div>
            <h1 className="font-extrabold text-white truncate max-w-[200px] sm:max-w-md">{activeEvent?.name || 'Hackathon Event'}</h1>
          </div>
        </div>
        
        <button
          onClick={handleExportCSV}
          className="text-xs font-semibold px-4 py-2 border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white rounded-lg flex items-center gap-1.5"
        >
          <Download size={13} />
          <span>Export CSV</span>
        </button>
      </header>

      {/* Main Roster Pane */}
      <main className="flex-grow p-6 space-y-6 max-w-7xl mx-auto w-full">
        
        <div className="glass-panel p-6 rounded-2xl border border-zinc-850 space-y-6">
          
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-zinc-900">
            <div>
              <h2 className="text-lg font-bold text-white">Registered Participants ({filteredParticipants.length})</h2>
              <p className="text-xs text-zinc-500 mt-0.5">Roster list of hackers currently registered in the event.</p>
            </div>
            
            {/* Search Input */}
            <div className="relative w-full sm:w-64">
              <Search size={14} className="absolute left-3 top-3 text-zinc-500" />
              <input
                type="text"
                placeholder="Search name, email, or skill..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-xs rounded-xl border border-zinc-800 bg-zinc-900/40 pl-9 pr-4 py-2.5 text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-brand-rose"
              />
            </div>
          </div>

          {/* Roster Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-zinc-850 text-zinc-500 uppercase font-semibold tracking-wider">
                  <th className="py-3 px-4">Participant Details</th>
                  <th className="py-3 px-4">Contact Email</th>
                  <th className="py-3 px-4">Skills Overviews</th>
                  <th className="py-3 px-4">Role Goal</th>
                  <th className="py-3 px-4 text-right">Roster Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-900 text-zinc-300">
                {filteredParticipants.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-zinc-500 italic">No participants found matching current search query.</td>
                  </tr>
                ) : (
                  filteredParticipants.map(item => (
                    <tr key={item.id} className="hover:bg-zinc-900/20">
                      <td className="py-3.5 px-4 font-semibold text-white">
                        <div className="flex items-center gap-3">
                          <img
                            src={item.avatar_url || `https://api.dicebear.com/7.x/adventurer/svg?seed=${item.full_name}`}
                            alt={item.full_name}
                            className="w-8 h-8 rounded-full border border-zinc-850 object-cover"
                          />
                          <button
                            onClick={() => setSelectedProfile(item)}
                            className="font-bold hover:text-brand-rose text-left"
                          >
                            {item.full_name}
                          </button>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-zinc-400 font-mono flex items-center gap-1.5 mt-1.5 border-none">
                        <Mail size={12} className="text-zinc-650" />
                        <span>{item.email}</span>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex flex-wrap gap-1">
                          {item.skills.slice(0, 3).map(s => (
                            <span key={s} className="text-[8px] bg-brand-rose/10 border border-brand-rose/20 text-brand-rose px-1.5 rounded-full font-bold">
                              {s}
                            </span>
                          ))}
                          {item.skills.length > 3 && (
                            <span className="text-[8px] text-zinc-500 font-semibold self-center">+{item.skills.length - 3} more</span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-zinc-450 uppercase tracking-wider">{item.looking_for || 'networking'}</td>
                      <td className="py-3.5 px-4 text-right space-x-1">
                        <button
                          onClick={() => setSelectedProfile(item)}
                          className="p-2 border border-zinc-800 hover:border-zinc-700 bg-zinc-900/60 rounded-lg text-zinc-400 hover:text-white"
                          title="View Profile Details"
                        >
                          <Eye size={13} />
                        </button>
                        <button
                          onClick={() => handleRemoveParticipant(item.id)}
                          className="p-2 border border-zinc-800 hover:border-brand-rose bg-zinc-900/60 rounded-lg text-zinc-400 hover:text-brand-rose"
                          title="Remove From Event"
                        >
                          <Trash size={13} />
                        </button>
                        <button
                          onClick={() => handleBanUser(item.id)}
                          className="p-2 border border-zinc-800 hover:border-brand-rose bg-zinc-900/60 rounded-lg text-zinc-500 hover:text-brand-rose hover:bg-brand-rose/5"
                          title="Ban Account"
                        >
                          <ShieldX size={13} />
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

      {/* Profile preview Modal */}
      {selectedProfile && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-lg rounded-2xl border border-zinc-850 shadow-2xl p-6 relative animate-zoom-in">
            
            <button
              onClick={() => setSelectedProfile(null)}
              className="absolute top-4 right-4 text-zinc-500 hover:text-white"
            >
              <X size={20} />
            </button>

            {/* Profile Header Details */}
            <div className="flex items-center gap-4 pb-6 border-b border-zinc-900">
              <img
                src={selectedProfile.avatar_url || `https://api.dicebear.com/7.x/adventurer/svg?seed=${selectedProfile.full_name}`}
                alt={selectedProfile.full_name}
                className="w-16 h-16 rounded-full object-cover border-2 border-brand-rose/30"
              />
              <div className="space-y-1.5 flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-white truncate">{selectedProfile.full_name}</h3>
                  <span className="text-[9px] px-2 py-0.5 bg-brand-rose/10 text-brand-rose font-bold rounded-full border border-brand-rose/30">
                    {selectedProfile.looking_for ? `Looking for ${selectedProfile.looking_for}` : 'Attendee'}
                  </span>
                </div>
                <div className="text-xs text-zinc-400 font-mono truncate">{selectedProfile.email}</div>
              </div>
            </div>

            {/* Profile Bio */}
            <div className="py-4 space-y-1 border-b border-zinc-900">
              <h4 className="text-xs font-bold text-zinc-550 uppercase tracking-wider">Bio</h4>
              <p className="text-xs text-zinc-300 leading-relaxed">
                {selectedProfile.bio || 'No bio description provided yet.'}
              </p>
            </div>

            {/* Skills grid */}
            <div className="py-4 space-y-2 border-b border-zinc-900">
              <h4 className="text-xs font-bold text-zinc-550 uppercase tracking-wider">Skills</h4>
              <div className="flex flex-wrap gap-1.5">
                {selectedProfile.skills.map(skill => (
                  <span key={skill} className="text-[10px] px-2 py-0.5 bg-brand-rose/10 text-brand-rose border border-brand-rose/30 rounded-full font-bold">
                    {skill}
                  </span>
                ))}
              </div>
            </div>

            {/* Interests grid */}
            <div className="py-4 space-y-2 border-b border-zinc-900">
              <h4 className="text-xs font-bold text-zinc-550 uppercase tracking-wider">Interests</h4>
              <div className="flex flex-wrap gap-1.5">
                {selectedProfile.interests.map(interest => (
                  <span key={interest} className="text-[10px] px-2 py-0.5 bg-zinc-900 text-zinc-400 border border-zinc-800 rounded-full font-bold">
                    {interest}
                  </span>
                ))}
              </div>
            </div>

            {/* External Links */}
            <div className="pt-4 flex gap-2.5">
              {selectedProfile.linkedin_url && (
                <a
                  href={selectedProfile.linkedin_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-zinc-400 hover:text-white border border-zinc-800 bg-zinc-900/60 px-3 py-1.5 rounded-lg"
                >
                  <span>LinkedIn Profile</span>
                </a>
              )}
              {selectedProfile.github_url && (
                <a
                  href={selectedProfile.github_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-zinc-400 hover:text-white border border-zinc-800 bg-zinc-900/60 px-3 py-1.5 rounded-lg"
                >
                  <span>GitHub Profile</span>
                </a>
              )}
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
