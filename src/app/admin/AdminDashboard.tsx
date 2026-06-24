import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../../stores/useAuthStore';
import { useEventStore } from '../../stores/useEventStore';
import { mockDb } from '../../lib/mockDb';
import { isMockMode } from '../../lib/supabase';
import { 
  Calendar, Users, MessageSquare, AlertTriangle, 
  Plus, Trash, Power, PowerOff, Megaphone, LogOut, ArrowRight, 
  X
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { signOut } = useAuthStore();
  const { events, fetchEvents, createEvent, updateEvent, deleteEvent, postAnnouncement } = useEventStore();

  // Dialog & Form controls
  const [showCreateEvent, setShowCreateEvent] = useState(false);
  const [eventName, setEventName] = useState('');
  const [eventDesc, setEventDesc] = useState('');
  const [eventLoc, setEventLoc] = useState('');
  const [eventStart, setEventStart] = useState('');
  const [eventEnd, setEventEnd] = useState('');
  const [creating, setCreating] = useState(false);

  // Announcement dialog controls
  const [showAnnDialog, setShowAnnDialog] = useState(false);
  const [annEventId, setAnnEventId] = useState('');
  const [annTitle, setAnnTitle] = useState('');
  const [annContent, setAnnContent] = useState('');
  const [announcing, setAnnouncing] = useState(false);

  // Stat Counters
  const [stats, setStats] = useState({
    eventsCount: 0,
    hackersCount: 0,
    connectionsCount: 0,
    reportsCount: 0
  });

  useEffect(() => {
    fetchEvents();
    fetchSystemStats();
  }, [fetchEvents, events.length]);

  const fetchSystemStats = async () => {
    try {
      if (isMockMode) {
        const evts = mockDb.getEvents();
        const profiles = mockDb.getProfiles();
        const conns = mockDb.getConnections();
        const reports = mockDb.getReports();

        setStats({
          eventsCount: evts.length,
          hackersCount: profiles.length,
          connectionsCount: conns.length,
          reportsCount: reports.filter(r => r.status === 'pending').length
        });
      } else {
        // Query database stats
        const evtsCount = mockDb.getStore<any>('events', []).length;
        const profsCount = mockDb.getStore<any>('profiles', []).length;
        const connsCount = mockDb.getStore<any>('connections', []).length;
        const repsCount = mockDb.getStore<any>('reports', []).length;
        setStats({
          eventsCount: evtsCount,
          hackersCount: profsCount,
          connectionsCount: connsCount,
          reportsCount: repsCount
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventName.trim()) return;

    setCreating(true);
    try {
      await createEvent({
        name: eventName,
        description: eventDesc,
        location: eventLoc,
        start_date: eventStart || undefined,
        end_date: eventEnd || undefined,
        is_active: true
      });
      toast.success('Event created successfully!');
      setShowCreateEvent(false);
      
      // Clear forms
      setEventName('');
      setEventDesc('');
      setEventLoc('');
      setEventStart('');
      setEventEnd('');
    } catch (err: any) {
      toast.error(err.message || 'Failed to create event');
    } finally {
      setCreating(false);
    }
  };

  const handlePostAnn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!annEventId || !annTitle.trim() || !annContent.trim()) return;

    setAnnouncing(true);
    try {
      await postAnnouncement(annEventId, annTitle, annContent);
      toast.success('Notice announcement posted!');
      setShowAnnDialog(false);
      
      setAnnTitle('');
      setAnnContent('');
    } catch (err) {
      toast.error('Failed to post announcement');
    } finally {
      setAnnouncing(false);
    }
  };

  const handleToggleActive = async (eventId: string, currentStatus: boolean) => {
    try {
      await updateEvent(eventId, { is_active: !currentStatus });
      toast.success(`Event ${!currentStatus ? 'Activated' : 'Deactivated'}`);
    } catch (err) {
      toast.error('Failed to update status');
    }
  };

  const handleDelete = async (eventId: string) => {
    const confirm = window.confirm('Are you sure you want to permanently delete this event? All attendee associations will be dropped.');
    if (!confirm) return;

    try {
      await deleteEvent(eventId);
      toast.success('Event deleted');
    } catch (err) {
      toast.error('Failed to delete event');
    }
  };

  const handleLogout = async () => {
    await signOut();
    toast.success('Logged out successfully');
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-[#0F0F10] text-zinc-100 flex flex-col">
      
      {/* Header bar */}
      <header className="border-b border-zinc-900 bg-zinc-950 px-6 py-4 flex justify-between items-center z-15">
        <div className="flex items-center gap-2.5">
          <span className="w-8 h-8 rounded-lg bg-brand-rose flex items-center justify-center font-bold text-sm text-white">A</span>
          <span className="font-extrabold text-lg tracking-tight">HackConnect Admin Dashboard</span>
        </div>
        <div className="flex items-center gap-4">
          <Link
            to="/admin/reports"
            className="relative text-xs font-semibold px-4 py-2 border border-zinc-800 bg-zinc-900 text-zinc-350 hover:text-white rounded-lg transition-all"
          >
            <span>Flagged Reports</span>
            {stats.reportsCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-brand-rose text-white text-[9px] font-bold flex items-center justify-center">
                {stats.reportsCount}
              </span>
            )}
          </Link>
          <button onClick={handleLogout} className="p-2 text-zinc-500 hover:text-brand-rose rounded-lg transition-all" title="Logout">
            <LogOut size={16} />
          </button>
        </div>
      </header>

      {/* Main content grid */}
      <main className="flex-grow p-6 space-y-6 max-w-7xl mx-auto w-full">
        
        {/* STATS PANEL ROWS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          
          <div className="glass-panel p-5 rounded-2xl border border-zinc-850 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-brand-rose/10 flex items-center justify-center text-brand-rose"><Calendar size={22} /></div>
            <div>
              <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Total Events</div>
              <div className="text-xl font-bold text-white mt-0.5">{stats.eventsCount}</div>
            </div>
          </div>

          <div className="glass-panel p-5 rounded-2xl border border-zinc-850 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-brand-indigo/10 flex items-center justify-center text-brand-indigo"><Users size={22} /></div>
            <div>
              <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Total Hackers</div>
              <div className="text-xl font-bold text-white mt-0.5">{stats.hackersCount}</div>
            </div>
          </div>

          <div className="glass-panel p-5 rounded-2xl border border-zinc-850 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-brand-emerald/10 flex items-center justify-center text-brand-emerald"><MessageSquare size={22} /></div>
            <div>
              <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Active Connections</div>
              <div className="text-xl font-bold text-white mt-0.5">{stats.connectionsCount}</div>
            </div>
          </div>

          <Link to="/admin/reports" className="glass-panel p-5 rounded-2xl border border-zinc-850 hover:border-brand-rose/30 transition-all flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-brand-rose/10 flex items-center justify-center text-brand-rose"><AlertTriangle size={22} /></div>
            <div>
              <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Pending Flags</div>
              <div className="text-xl font-bold text-brand-rose mt-0.5">{stats.reportsCount}</div>
            </div>
          </Link>

        </div>

        {/* EVENTS CONSOLE BOARD */}
        <div className="glass-panel p-6 rounded-2xl border border-zinc-850 space-y-6">
          
          <div className="flex justify-between items-center pb-4 border-b border-zinc-900">
            <div>
              <h2 className="text-lg font-bold text-white">Events Ledger</h2>
              <p className="text-xs text-zinc-500 mt-0.5">Manage event setups, registration triggers, and announcements.</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  if (events.length === 0) {
                    toast.error('Create an event first');
                    return;
                  }
                  setAnnEventId(events[0].id);
                  setShowAnnDialog(true);
                }}
                className="text-xs font-semibold px-4 py-2 border border-zinc-805 bg-zinc-950 text-zinc-300 rounded-lg hover:text-white transition-all flex items-center gap-1.5"
              >
                <Megaphone size={13} />
                <span>Post Announcement</span>
              </button>
              <button
                onClick={() => setShowCreateEvent(true)}
                className="text-xs font-bold px-4 py-2 bg-brand-rose text-white rounded-lg flex items-center gap-1.5 hover:opacity-90 transition-all"
              >
                <Plus size={14} />
                <span>Create Event</span>
              </button>
            </div>
          </div>

          {/* Events table list */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-zinc-850 text-zinc-500 uppercase font-semibold tracking-wider">
                  <th className="py-3 px-4">Event Name</th>
                  <th className="py-3 px-4">Location</th>
                  <th className="py-3 px-4">Timeline</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-900 text-zinc-300">
                {events.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-zinc-500 italic">No events configured yet. Click Create Event to start.</td>
                  </tr>
                ) : (
                  events.map((evt) => (
                    <tr key={evt.id} className="hover:bg-zinc-900/20">
                      <td className="py-3.5 px-4 font-bold text-white text-sm">
                        <Link to={`/admin/event/${evt.id}`} className="hover:text-brand-rose flex items-center gap-1.5">
                          <span>{evt.name}</span>
                          <ArrowRight size={12} className="text-zinc-500" />
                        </Link>
                      </td>
                      <td className="py-3.5 px-4 font-medium text-zinc-400">📍 {evt.location || 'Virtual'}</td>
                      <td className="py-3.5 px-4 text-zinc-450 font-mono">
                        {evt.start_date ? new Date(evt.start_date).toLocaleDateString() : 'TBD'} &rarr; {evt.end_date ? new Date(evt.end_date).toLocaleDateString() : 'TBD'}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold ${
                          evt.is_active 
                            ? 'bg-brand-emerald/10 text-brand-emerald'
                            : 'bg-zinc-900 text-zinc-500'
                        }`}>
                          {evt.is_active ? 'Active' : 'Closed'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right space-x-1">
                        <button
                          onClick={() => handleToggleActive(evt.id, evt.is_active)}
                          className="p-2 border border-zinc-800 hover:border-zinc-700 bg-zinc-900/60 rounded-lg text-zinc-400 hover:text-white"
                          title={evt.is_active ? 'Close Event' : 'Open Event'}
                        >
                          {evt.is_active ? <PowerOff size={13} /> : <Power size={13} className="text-brand-emerald" />}
                        </button>
                        <button
                          onClick={() => handleDelete(evt.id)}
                          className="p-2 border border-zinc-800 hover:border-brand-rose bg-zinc-900/60 rounded-lg text-zinc-400 hover:text-brand-rose"
                          title="Delete Event"
                        >
                          <Trash size={13} />
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

      {/* CREATE EVENT MODAL DIALOG */}
      {showCreateEvent && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-md rounded-2xl border border-zinc-850 shadow-2xl p-6 relative animate-zoom-in">
            
            <button
              onClick={() => setShowCreateEvent(false)}
              className="absolute top-4 right-4 text-zinc-500 hover:text-white"
            >
              <X size={18} />
            </button>

            <h3 className="text-lg font-bold text-white mb-4">Create Hackathon Event</h3>

            <form onSubmit={handleCreateEvent} className="space-y-4">
              <div>
                <label className="block text-[10px] font-semibold text-zinc-405 uppercase tracking-wider mb-2">Event Title</label>
                <input
                  type="text"
                  required
                  placeholder="HackConnect Demo — 2024"
                  value={eventName}
                  onChange={(e) => setEventName(e.target.value)}
                  className="w-full text-xs rounded-xl border border-zinc-800 bg-zinc-900/60 px-3.5 py-3 text-zinc-200 focus:outline-none focus:border-brand-rose"
                />
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-zinc-405 uppercase tracking-wider mb-2">Description</label>
                <textarea
                  rows={3}
                  placeholder="Provide hackathon brief..."
                  value={eventDesc}
                  onChange={(e) => setEventDesc(e.target.value)}
                  className="w-full text-xs rounded-xl border border-zinc-800 bg-zinc-900/60 p-3 text-zinc-200 focus:outline-none focus:border-brand-rose resize-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-zinc-405 uppercase tracking-wider mb-2">Location/Venue</label>
                <input
                  type="text"
                  placeholder="Innovation Hub, Hall B"
                  value={eventLoc}
                  onChange={(e) => setEventLoc(e.target.value)}
                  className="w-full text-xs rounded-xl border border-zinc-800 bg-zinc-900/60 px-3.5 py-3 text-zinc-200 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-semibold text-zinc-405 uppercase tracking-wider mb-2">Start Date</label>
                  <input
                    type="date"
                    value={eventStart}
                    onChange={(e) => setEventStart(e.target.value)}
                    className="w-full text-xs rounded-xl border border-zinc-800 bg-zinc-900/60 px-3.5 py-2.5 text-zinc-200 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-zinc-405 uppercase tracking-wider mb-2">End Date</label>
                  <input
                    type="date"
                    value={eventEnd}
                    onChange={(e) => setEventEnd(e.target.value)}
                    className="w-full text-xs rounded-xl border border-zinc-800 bg-zinc-900/60 px-3.5 py-2.5 text-zinc-200 focus:outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={creating}
                className="w-full bg-gradient-to-br from-brand-rose to-brand-amber text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-1.5 shadow mt-6"
              >
                {creating ? 'Creating...' : 'Launch Event'}
              </button>
            </form>

          </div>
        </div>
      )}

      {/* POST ANNOUNCEMENT DIALOG */}
      {showAnnDialog && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-45 flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-md rounded-2xl border border-zinc-850 shadow-2xl p-6 relative animate-zoom-in">
            
            <button
              onClick={() => setShowAnnDialog(false)}
              className="absolute top-4 right-4 text-zinc-550 hover:text-white"
            >
              <X size={18} />
            </button>

            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Megaphone size={18} className="text-brand-rose" />
              <span>Broadcast Notice</span>
            </h3>

            <form onSubmit={handlePostAnn} className="space-y-4">
              <div>
                <label className="block text-[10px] font-semibold text-zinc-405 uppercase tracking-wider mb-2">Target Event</label>
                <select
                  value={annEventId}
                  onChange={(e) => setAnnEventId(e.target.value)}
                  className="w-full text-xs rounded-xl border border-zinc-800 bg-zinc-900/60 p-2.5 text-zinc-200 focus:outline-none"
                >
                  {events.map(evt => (
                    <option key={evt.id} value={evt.id}>{evt.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-zinc-405 uppercase tracking-wider mb-2">Notice Title</label>
                <input
                  type="text"
                  required
                  placeholder="🍕 Lunch is Served!"
                  value={annTitle}
                  onChange={(e) => setAnnTitle(e.target.value)}
                  className="w-full text-xs rounded-xl border border-zinc-800 bg-zinc-900/60 px-3.5 py-3 text-zinc-200 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-zinc-405 uppercase tracking-wider mb-2">Message Content</label>
                <textarea
                  rows={4}
                  required
                  placeholder="Pizza has arrived in Hall B. Join details..."
                  value={annContent}
                  onChange={(e) => setAnnContent(e.target.value)}
                  className="w-full text-xs rounded-xl border border-zinc-800 bg-zinc-900/60 p-3 text-zinc-200 focus:outline-none resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={announcing}
                className="w-full bg-gradient-to-br from-brand-rose to-brand-amber text-white font-bold py-3 px-4 rounded-xl shadow mt-6"
              >
                {announcing ? 'Broadcasting...' : 'Broadcast to Event Feed'}
              </button>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}
