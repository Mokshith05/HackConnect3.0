import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../stores/useAuthStore';
import { useNetworkingStore } from '../../stores/useNetworkingStore';
import { MapPin, Check, Save, Clock } from 'lucide-react';
import toast from 'react-hot-toast';

const PREDEFINED_ZONES = [
  'Main Hall',
  'Workshop Room A',
  'Workshop Room B',
  'Networking Zone',
  'Cafeteria / Food Area',
  'Outdoor Area',
  'Registration Desk',
  'Sponsor Booths',
  'Hackathon Work Area',
  'Other'
];

export default function LocationPage() {
  const { user, profile } = useAuthStore();
  const { myLocation, updateMyLocation, fetchNetworkingData } = useNetworkingStore();

  const [availability, setAvailability] = useState<'available' | 'busy' | 'offline'>('available');
  const [selectedZone, setSelectedZone] = useState('Main Hall');
  const [customZoneText, setCustomZoneText] = useState('');
  const [customNote, setCustomNote] = useState('');
  const [saving, setSaving] = useState(false);

  // Sync state with store on load
  useEffect(() => {
    if (user && profile?.event_id) {
      fetchNetworkingData(user.id, profile.event_id);
    }
  }, [user, profile, fetchNetworkingData]);

  useEffect(() => {
    if (myLocation) {
      setAvailability(myLocation.availability);
      
      const isPredefined = PREDEFINED_ZONES.includes(myLocation.zone);
      if (isPredefined) {
        setSelectedZone(myLocation.zone);
      } else {
        setSelectedZone('Other');
        setCustomZoneText(myLocation.zone);
      }
      setCustomNote(myLocation.custom_note || '');
    }
  }, [myLocation]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile?.event_id) return;

    setSaving(true);
    try {
      const finalZone = selectedZone === 'Other' ? customZoneText.trim() || 'Other Location' : selectedZone;
      await updateMyLocation(user.id, profile.event_id, finalZone, availability, customNote.trim());
      toast.success('Location updated ✓');
    } catch (err: any) {
      toast.error('Failed to update status');
    } finally {
      setSaving(false);
    }
  };

  const formatLastUpdated = (isoString?: string) => {
    if (!isoString) return 'Never';
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' (' + date.toLocaleDateString() + ')';
  };

  return (
    <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6 pb-24 md:pb-12 max-w-3xl">
      
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white mb-1 flex items-center gap-2">
          <MapPin size={24} className="text-brand-indigo" />
          <span>Coordinate My Location</span>
        </h1>
        <p className="text-sm text-zinc-400">
          Voluntarily update your whereabouts. Remember, this is strictly visible only to your accepted connections.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        
        {/* AVAILABILITY STATUS SELECTION (3 Cards) */}
        <div className="space-y-3">
          <label className="block text-xs font-semibold text-zinc-450 uppercase tracking-wider">Availability Status</label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { key: 'available', label: '🟢 Available', desc: 'Open to meeting up', border: 'border-brand-emerald bg-brand-emerald/5 ring-brand-emerald' },
              { key: 'busy', label: '🟡 Busy', desc: 'Working, ping me later', border: 'border-brand-amber bg-brand-amber/5 ring-brand-amber' },
              { key: 'offline', label: '⚫ Offline', desc: 'Not at the venue currently', border: 'border-zinc-500 bg-zinc-900/50 ring-zinc-500' }
            ].map(item => (
              <button
                key={item.key}
                type="button"
                onClick={() => setAvailability(item.key as any)}
                className={`text-left p-4 rounded-xl border flex flex-col justify-between h-24 transition-all ${
                  availability === item.key
                    ? `${item.border} ring-1`
                    : 'border-zinc-800 bg-zinc-900/40 hover:bg-zinc-800/60'
                }`}
              >
                <div className="flex justify-between items-center w-full">
                  <span className="font-bold text-sm text-white">{item.label}</span>
                  {availability === item.key && (
                    <span className="w-4 h-4 rounded-full bg-brand-indigo flex items-center justify-center text-white">
                      <Check size={10} strokeWidth={3} />
                    </span>
                  )}
                </div>
                <span className="text-xs text-zinc-450">{item.desc}</span>
              </button>
            ))}
          </div>
        </div>

        {/* ZONE SELECTOR */}
        <div className="space-y-3">
          <label className="block text-xs font-semibold text-zinc-450 uppercase tracking-wider">Current Zone</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <select
                value={selectedZone}
                onChange={(e) => setSelectedZone(e.target.value)}
                className="w-full text-sm rounded-xl border border-zinc-800 bg-zinc-900/60 p-3 text-zinc-200 focus:outline-none focus:border-brand-indigo"
              >
                {PREDEFINED_ZONES.map(z => (
                  <option key={z} value={z}>{z}</option>
                ))}
              </select>
            </div>

            {selectedZone === 'Other' && (
              <input
                type="text"
                required
                placeholder="Enter custom area name..."
                value={customZoneText}
                onChange={(e) => setCustomZoneText(e.target.value)}
                className="w-full text-sm rounded-xl border border-zinc-805 bg-zinc-900/60 px-4 py-3 text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-brand-indigo animate-zoom-in"
              />
            )}
          </div>
        </div>

        {/* CUSTOM NOTE */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-zinc-455 uppercase tracking-wider">Custom status note (Optional)</label>
          <input
            type="text"
            maxLength={60}
            placeholder="e.g. Grabbing pizza, back in 10 mins"
            value={customNote}
            onChange={(e) => setCustomNote(e.target.value)}
            className="w-full text-sm rounded-xl border border-zinc-800 bg-zinc-900/60 px-4 py-3 text-zinc-200 placeholder-zinc-650 focus:outline-none focus:border-brand-indigo"
          />
        </div>

        {/* SAVE TRIGGER */}
        <div className="pt-4 space-y-3">
          <button
            type="submit"
            disabled={saving}
            className="btn-primary-gradient px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 text-white shadow-lg disabled:opacity-40"
          >
            {saving ? (
              <div className="w-4 h-4 border-2 border-t-transparent border-white rounded-full animate-spin"></div>
            ) : (
              <Save size={16} />
            )}
            <span>Update Status</span>
          </button>
          
          {myLocation && (
            <div className="text-xs text-zinc-500 flex items-center gap-1.5 pl-1">
              <Clock size={12} />
              <span>Last updated: {formatLastUpdated(myLocation.updated_at)}</span>
            </div>
          )}
        </div>

      </form>

    </div>
  );
}
