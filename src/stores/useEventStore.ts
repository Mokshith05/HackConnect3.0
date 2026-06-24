import { create } from 'zustand';
import { supabase, isMockMode } from '../lib/supabase';
import { mockDb } from '../lib/mockDb';
import type { Event, Profile, Announcement } from '../types';

interface EventState {
  currentEvent: Event | null;
  events: Event[];
  participants: Profile[];
  announcements: Announcement[];
  isLoading: boolean;
  error: string | null;
  setCurrentEvent: (event: Event | null) => void;
  fetchEvents: () => Promise<void>;
  fetchParticipants: (eventId: string) => Promise<void>;
  fetchAnnouncements: (eventId: string) => Promise<void>;
  createEvent: (eventData: Partial<Event>) => Promise<void>;
  updateEvent: (eventId: string, updates: Partial<Event>) => Promise<void>;
  deleteEvent: (eventId: string) => Promise<void>;
  removeParticipant: (eventId: string, userId: string) => Promise<void>;
  postAnnouncement: (eventId: string, title: string, content: string) => Promise<void>;
}

export const useEventStore = create<EventState>((set, get) => ({
  currentEvent: null,
  events: [],
  participants: [],
  announcements: [],
  isLoading: false,
  error: null,

  setCurrentEvent: (event) => set({ currentEvent: event }),

  fetchEvents: async () => {
    set({ isLoading: true, error: null });
    if (isMockMode) {
      const events = mockDb.getEvents();
      set({ events, isLoading: false });
      return;
    }

    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      set({ events: data || [], isLoading: false });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  },

  fetchParticipants: async (eventId) => {
    set({ isLoading: true, error: null });
    if (isMockMode) {
      const participations = mockDb.getStore<any>('hc_event_participants', []);
      const pIds = participations.filter((p: any) => p.event_id === eventId).map((p: any) => p.user_id);
      const profiles = mockDb.getProfiles().filter((p) => pIds.includes(p.id));
      set({ participants: profiles, isLoading: false });
      return;
    }

    try {
      const { data, error } = await supabase
        .from('event_participants')
        .select('profiles(*)')
        .eq('event_id', eventId);

      if (error) throw error;
      const list = (data || []).map((d: any) => d.profiles).filter(Boolean);
      set({ participants: list, isLoading: false });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  },

  fetchAnnouncements: async (eventId) => {
    set({ error: null });
    if (isMockMode) {
      const announcements = mockDb.getAnnouncements().filter(a => a.event_id === eventId);
      set({ announcements });
      return;
    }

    try {
      // Announcements is an optional/announcements table in Supabase.
      // If table doesn't exist, handle it gracefully.
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .eq('event_id', eventId)
        .order('created_at', { ascending: false });

      if (!error && data) {
        set({ announcements: data });
      }
    } catch (err) {
      // Gracefully swallow table-not-found errors since it is an optional extension
    }
  },

  createEvent: async (eventData) => {
    set({ isLoading: true, error: null });
    if (isMockMode) {
      const newEvent: Event = {
        id: 'evt_' + Math.random().toString(36).substr(2, 9),
        name: eventData.name || 'Untitled Event',
        description: eventData.description,
        location: eventData.location,
        start_date: eventData.start_date,
        end_date: eventData.end_date,
        is_active: eventData.is_active !== undefined ? eventData.is_active : true,
        created_at: new Date().toISOString()
      };

      const events = mockDb.getEvents();
      mockDb.setEvents([newEvent, ...events]);
      set((state) => ({ events: [newEvent, ...state.events], isLoading: false }));
      return;
    }

    try {
      const { data, error } = await supabase
        .from('events')
        .insert([eventData])
        .select()
        .single();

      if (error) throw error;
      set((state) => ({ events: [data, ...state.events], isLoading: false }));
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
      throw err;
    }
  },

  updateEvent: async (eventId, updates) => {
    set({ isLoading: true, error: null });
    if (isMockMode) {
      const events = mockDb.getEvents();
      const updated = events.map((e) => (e.id === eventId ? { ...e, ...updates } : e));
      mockDb.setEvents(updated);
      set((state) => ({
        events: updated,
        currentEvent: state.currentEvent && state.currentEvent.id === eventId ? { ...state.currentEvent, ...updates } : state.currentEvent,
        isLoading: false
      }));
      return;
    }

    try {
      const { data, error } = await supabase
        .from('events')
        .update(updates)
        .eq('id', eventId)
        .select()
        .single();

      if (error) throw error;
      set((state) => ({
        events: state.events.map((e) => (e.id === eventId ? data : e)),
        currentEvent: state.currentEvent && state.currentEvent.id === eventId ? data : state.currentEvent,
        isLoading: false
      }));
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
      throw err;
    }
  },

  deleteEvent: async (eventId) => {
    set({ isLoading: true, error: null });
    if (isMockMode) {
      const events = mockDb.getEvents().filter((e) => e.id !== eventId);
      mockDb.setEvents(events);
      set({ events, isLoading: false });
      return;
    }

    try {
      const { error } = await supabase.from('events').delete().eq('id', eventId);
      if (error) throw error;
      set((state) => ({
        events: state.events.filter((e) => e.id !== eventId),
        isLoading: false
      }));
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
      throw err;
    }
  },

  removeParticipant: async (eventId, userId) => {
    set({ isLoading: true, error: null });
    if (isMockMode) {
      const participations = mockDb.getStore<any>('hc_event_participants', []);
      const filtered = participations.filter((p: any) => !(p.event_id === eventId && p.user_id === userId));
      mockDb.setStore('hc_event_participants', filtered);

      // Clean profile's event association
      const profiles = mockDb.getProfiles();
      const updatedProfiles = profiles.map(p => p.id === userId ? { ...p, event_id: undefined } : p);
      mockDb.setProfiles(updatedProfiles);

      set((state) => ({
        participants: state.participants.filter((p) => p.id !== userId),
        isLoading: false
      }));
      return;
    }

    try {
      const { error } = await supabase
        .from('event_participants')
        .delete()
        .eq('event_id', eventId)
        .eq('user_id', userId);

      if (error) throw error;

      await supabase
        .from('profiles')
        .update({ event_id: null })
        .eq('id', userId);

      set((state) => ({
        participants: state.participants.filter((p) => p.id !== userId),
        isLoading: false
      }));
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
      throw err;
    }
  },

  postAnnouncement: async (eventId, title, content) => {
    if (isMockMode) {
      const newAnn: Announcement = {
        id: 'ann_' + Math.random().toString(),
        event_id: eventId,
        title,
        content,
        created_at: new Date().toISOString()
      };
      const list = mockDb.getAnnouncements();
      mockDb.setAnnouncements([newAnn, ...list]);
      set((state) => ({ announcements: [newAnn, ...state.announcements] }));
      return;
    }

    try {
      await supabase
        .from('announcements')
        .insert([{ event_id: eventId, title, content }]);

      await get().fetchAnnouncements(eventId);
    } catch (err) {
      console.error(err);
    }
  }
}));
