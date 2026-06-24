import { create } from 'zustand';
import { supabase, isMockMode } from '../lib/supabase';
import { mockDb } from '../lib/mockDb';
import type { Connection, ConnectionRequest, AiSuggestion, LocationStatus } from '../types';

interface NetworkingState {
  suggestions: AiSuggestion[];
  sentRequests: ConnectionRequest[];
  receivedRequests: ConnectionRequest[];
  connections: Connection[];
  locations: Record<string, LocationStatus>; // map of userId -> LocationStatus
  myLocation: LocationStatus | null;
  isLoading: boolean;
  error: string | null;

  fetchNetworkingData: (userId: string, eventId: string) => Promise<void>;
  fetchSuggestions: (userId: string, eventId: string) => Promise<void>;
  refreshSuggestions: (userId: string, eventId: string) => Promise<void>;
  sendConnectionRequest: (senderId: string, receiverId: string, eventId: string, message?: string) => Promise<void>;
  respondRequest: (requestId: string, status: 'accepted' | 'rejected', userId: string, eventId: string) => Promise<void>;
  cancelRequest: (requestId: string, userId: string, eventId: string) => Promise<void>;
  updateMyLocation: (userId: string, eventId: string, zone: string, availability: LocationStatus['availability'], customNote?: string) => Promise<void>;
  fetchLocationStatuses: (userId: string) => Promise<void>;
}

export const useNetworkingStore = create<NetworkingState>((set, get) => ({
  suggestions: [],
  sentRequests: [],
  receivedRequests: [],
  connections: [],
  locations: {},
  myLocation: null,
  isLoading: false,
  error: null,

  fetchNetworkingData: async (userId, eventId) => {
    set({ isLoading: true, error: null });

    if (isMockMode) {
      const allRequests = mockDb.getRequests();
      const sent = allRequests.filter(r => r.sender_id === userId && r.event_id === eventId && r.status === 'pending');
      const received = allRequests.filter(r => r.receiver_id === userId && r.event_id === eventId && r.status === 'pending');

      const profiles = mockDb.getProfiles();
      
      const sentRequestsWithProfiles = sent.map(r => ({
        ...r,
        receiver: profiles.find(p => p.id === r.receiver_id)
      }));

      const receivedRequestsWithProfiles = received.map(r => ({
        ...r,
        sender: profiles.find(p => p.id === r.sender_id)
      }));

      const allConns = mockDb.getConnections();
      const myConns = allConns.filter(c => (c.user_a === userId || c.user_b === userId) && c.event_id === eventId);
      const connsWithProfiles = myConns.map(c => ({
        ...c,
        other_user: profiles.find(p => p.id === (c.user_a === userId ? c.user_b : c.user_a))
      }));

      const allLocs = mockDb.getLocations();
      const myLoc = allLocs.find(l => l.user_id === userId) || null;
      
      const locMap: Record<string, LocationStatus> = {};
      allLocs.forEach(l => {
        locMap[l.user_id] = l;
      });

      set({
        sentRequests: sentRequestsWithProfiles,
        receivedRequests: receivedRequestsWithProfiles,
        connections: connsWithProfiles,
        myLocation: myLoc,
        locations: locMap,
        isLoading: false
      });
      return;
    }

    try {
      // 1. Fetch Sent Requests
      const { data: sent, error: sentErr } = await supabase
        .from('connection_requests')
        .select('*, receiver:profiles!receiver_id(*)')
        .eq('sender_id', userId)
        .eq('event_id', eventId)
        .eq('status', 'pending');

      if (sentErr) throw sentErr;

      // 2. Fetch Received Requests
      const { data: rec, error: recErr } = await supabase
        .from('connection_requests')
        .select('*, sender:profiles!sender_id(*)')
        .eq('receiver_id', userId)
        .eq('event_id', eventId)
        .eq('status', 'pending');

      if (recErr) throw recErr;

      // 3. Fetch Connections
      const { data: conns, error: connErr } = await supabase
        .from('connections')
        .select('*')
        .eq('event_id', eventId)
        .or(`user_a.eq.${userId},user_b.eq.${userId}`);

      if (connErr) throw connErr;

      const connsWithProfiles: Connection[] = [];
      for (const conn of conns) {
        const otherId = conn.user_a === userId ? conn.user_b : conn.user_a;
        const { data: prof } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', otherId)
          .single();

        if (prof) {
          connsWithProfiles.push({ ...conn, other_user: prof });
        }
      }

      // 4. Fetch my location
      const { data: myLocData } = await supabase
        .from('location_status')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      // 5. Fetch locations of connections
      const locMap: Record<string, LocationStatus> = {};
      const connectionIds = connsWithProfiles.map(c => c.other_user?.id).filter(Boolean) as string[];
      
      if (connectionIds.length > 0) {
        const { data: locs } = await supabase
          .from('location_status')
          .select('*')
          .in('user_id', connectionIds);

        if (locs) {
          locs.forEach((l: any) => {
            locMap[l.user_id] = l;
          });
        }
      }

      set({
        sentRequests: sent || [],
        receivedRequests: rec || [],
        connections: connsWithProfiles,
        myLocation: myLocData || null,
        locations: locMap,
        isLoading: false
      });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  },

  fetchSuggestions: async (userId, eventId) => {
    if (isMockMode) {
      const allSugs = mockDb.getSuggestions();
      let userSugs = allSugs.filter(s => s.user_id === userId && s.event_id === eventId);

      if (userSugs.length === 0) {
        // Generate mock suggestions automatically
        const user = mockDb.getProfiles().find(p => p.id === userId);
        const candidates = mockDb.getProfiles().filter(p => p.id !== userId && p.event_id === eventId);
        
        // Exclude current connections
        const connections = mockDb.getConnections().filter(c => c.user_a === userId || c.user_b === userId);
        const connectedIds = new Set(connections.map(c => c.user_a === userId ? c.user_b : c.user_a));

        const filteredCand = candidates.filter(c => !connectedIds.has(c.id));

        const generated = filteredCand.slice(0, 3).map(cand => {
          // Compatibility logic
          const overlap = cand.skills.filter(s => user?.skills.includes(s));
          const score = 75 + overlap.length * 5 + Math.floor(Math.random() * 10);
          return {
            id: 'sug_' + Math.random().toString(),
            user_id: userId,
            suggested_user_id: cand.id,
            event_id: eventId,
            compatibility_score: Math.min(score, 99),
            reason: `Overlap in skills: ${overlap.slice(0, 2).join(', ') || 'General engineering'}`,
            icebreaker: `Hey ${cand.full_name}, what project are you planning to work on for the event?`,
            suggested_profile: cand
          } as AiSuggestion;
        });

        mockDb.setSuggestions([...allSugs, ...generated]);
        userSugs = generated;
      } else {
        // Populate profiles
        const profiles = mockDb.getProfiles();
        userSugs = userSugs.map(s => ({
          ...s,
          suggested_profile: profiles.find(p => p.id === s.suggested_user_id)
        }));
      }

      set({ suggestions: userSugs });
      return;
    }

    try {
      // Check if user has suggestions
      const { data, error } = await supabase
        .from('ai_suggestions')
        .select('*, suggested_profile:profiles!suggested_user_id(*)')
        .eq('user_id', userId)
        .eq('event_id', eventId)
        .order('compatibility_score', { ascending: false });

      if (error) throw error;

      if (!data || data.length === 0) {
        // Trigger Edge Function call to generate suggestions
        await get().refreshSuggestions(userId, eventId);
      } else {
        set({ suggestions: data });
      }
    } catch (err: any) {
      console.error(err.message);
    }
  },

  refreshSuggestions: async (userId, eventId) => {
    set({ isLoading: true });

    if (isMockMode) {
      // Clear suggestions first
      const allSugs = mockDb.getSuggestions().filter(s => !(s.user_id === userId && s.event_id === eventId));
      mockDb.setSuggestions(allSugs);
      set({ suggestions: [] });
      
      // Delay to simulate API loading
      await new Promise(resolve => setTimeout(resolve, 800));
      await get().fetchSuggestions(userId, eventId);
      set({ isLoading: false });
      return;
    }

    try {
      // Call Supabase Edge function
      const session = (await supabase.auth.getSession()).data.session;
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-matches`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({ userId, eventId })
      });

      if (!response.ok) throw new Error('Failed to generate suggestions');
      const result = await response.json();
      set({ suggestions: result.suggestions || [], isLoading: false });
    } catch (err: any) {
      console.error(err.message);
      // Try local fallback matching if edge function fails
      const user = (await supabase.from('profiles').select('*').eq('id', userId).single()).data;
      const candidates = (await supabase.from('profiles').select('*').neq('id', userId).eq('event_id', eventId)).data || [];
      
      // Filter out existing connections
      const conns = (await supabase.from('connections').select('*').or(`user_a.eq.${userId},user_b.eq.${userId}`)).data || [];
      const connectedIds = new Set(conns.map((c: any) => c.user_a === userId ? c.user_b : c.user_a));
      const filtered = candidates.filter((c: any) => !connectedIds.has(c.id)).slice(0, 3);

      const generated = filtered.map((cand: any) => {
        const overlap = cand.skills.filter((s: string) => user?.skills.includes(s));
        return {
          id: 'sug_fallback_' + Math.random().toString(),
          user_id: userId,
          suggested_user_id: cand.id,
          event_id: eventId,
          compatibility_score: 70 + overlap.length * 5,
          reason: `Shared skills in ${overlap.slice(0, 2).join(', ') || 'coding'}.`,
          icebreaker: `Hi ${cand.full_name}, I saw you know ${cand.skills[0] || 'tech'}. Ready to collaborate?`,
          suggested_profile: cand
        } as AiSuggestion;
      });

      set({ suggestions: generated, isLoading: false });
    }
  },

  sendConnectionRequest: async (senderId, receiverId, eventId, message) => {
    if (isMockMode) {
      const requests = mockDb.getRequests();
      
      // Avoid duplicates
      if (requests.some(r => r.sender_id === senderId && r.receiver_id === receiverId && r.event_id === eventId)) {
        throw new Error('Request already sent');
      }

      const newReq: ConnectionRequest = {
        id: 'req_' + Math.random().toString(36).substr(2, 9),
        sender_id: senderId,
        receiver_id: receiverId,
        event_id: eventId,
        status: 'pending',
        message,
        created_at: new Date().toISOString()
      };

      mockDb.setRequests([...requests, newReq]);
      await get().fetchNetworkingData(senderId, eventId);
      
      // Remove from active suggestions view
      set(state => ({
        suggestions: state.suggestions.filter(s => s.suggested_user_id !== receiverId)
      }));
      return;
    }

    try {
      const { error } = await supabase
        .from('connection_requests')
        .insert([{ sender_id: senderId, receiver_id: receiverId, event_id: eventId, message }]);

      if (error) {
        if (error.code === '23505') throw new Error('Request already sent');
        throw error;
      }

      await get().fetchNetworkingData(senderId, eventId);

      // Filter local matches suggestions
      set(state => ({
        suggestions: state.suggestions.filter(s => s.suggested_user_id !== receiverId)
      }));
    } catch (err: any) {
      set({ error: err.message });
      throw err;
    }
  },

  respondRequest: async (requestId, status, userId, eventId) => {
    if (isMockMode) {
      const requests = mockDb.getRequests();
      const req = requests.find(r => r.id === requestId);

      if (!req) return;

      if (status === 'accepted') {
        // Create connection
        const connections = mockDb.getConnections();
        const newConn: Connection = {
          id: 'conn_' + Math.random().toString(36).substr(2, 9),
          user_a: req.sender_id,
          user_b: req.receiver_id,
          event_id: eventId,
          connected_at: new Date().toISOString()
        };
        mockDb.setConnections([...connections, newConn]);
      }

      // Delete request row
      mockDb.setRequests(requests.filter(r => r.id !== requestId));

      await get().fetchNetworkingData(userId, eventId);
      return;
    }

    try {
      const res = await fetch('/api/networking/respond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId, status, userId, eventId })
      });

      if (!res.ok) {
        let errorMessage = 'Failed to respond to connection request';
        try {
          const errorData = await res.json();
          errorMessage = errorData.error || errorMessage;
        } catch (_) {
          try {
            const text = await res.text();
            errorMessage = text || `${res.status} ${res.statusText}`;
          } catch (__) {
            errorMessage = `${res.status} ${res.statusText || 'Offline or Server Error'}`;
          }
        }
        throw new Error(errorMessage);
      }

      await get().fetchNetworkingData(userId, eventId);
    } catch (err: any) {
      console.error(err.message);
      throw err;
    }
  },

  cancelRequest: async (requestId, userId, eventId) => {
    if (isMockMode) {
      const requests = mockDb.getRequests();
      mockDb.setRequests(requests.filter(r => r.id !== requestId));
      await get().fetchNetworkingData(userId, eventId);
      return;
    }

    try {
      const { error } = await supabase
        .from('connection_requests')
        .delete()
        .eq('id', requestId);

      if (error) throw error;
      await get().fetchNetworkingData(userId, eventId);
    } catch (err: any) {
      console.error(err.message);
    }
  },

  updateMyLocation: async (userId, eventId, zone, availability, customNote) => {
    const statusData = {
      user_id: userId,
      event_id: eventId,
      zone,
      availability,
      custom_note: customNote || '',
      updated_at: new Date().toISOString()
    };

    if (isMockMode) {
      const locations = mockDb.getLocations();
      const exists = locations.find(l => l.user_id === userId);
      let updatedList = [];
      if (exists) {
        updatedList = locations.map(l => l.user_id === userId ? { ...l, ...statusData } : l);
      } else {
        updatedList = [...locations, { id: 'loc_' + Math.random().toString(), ...statusData }];
      }
      mockDb.setLocations(updatedList);
      set({ myLocation: updatedList.find(l => l.user_id === userId) || null });
      return;
    }

    try {
      const { data, error } = await supabase
        .from('location_status')
        .upsert(statusData, { onConflict: 'user_id' })
        .select()
        .single();

      if (error) throw error;
      set({ myLocation: data });
    } catch (err: any) {
      console.error(err.message);
      throw err;
    }
  },

  fetchLocationStatuses: async (_userId) => {
    const conns = get().connections;
    const ids = conns.map(c => c.other_user?.id).filter(Boolean) as string[];
    if (ids.length === 0) return;

    if (isMockMode) {
      const allLocs = mockDb.getLocations().filter(l => ids.includes(l.user_id));
      const locMap: Record<string, LocationStatus> = {};
      allLocs.forEach((l: any) => {
        locMap[l.user_id] = l;
      });
      set({ locations: { ...get().locations, ...locMap } });
      return;
    }

    try {
      const { data, error } = await supabase
        .from('location_status')
        .select('*')
        .in('user_id', ids);

      if (!error && data) {
        const locMap: Record<string, LocationStatus> = {};
        data.forEach((l: any) => {
          locMap[l.user_id] = l;
        });
        set({ locations: { ...get().locations, ...locMap } });
      }
    } catch (err) {
      console.error(err);
    }
  }
}));
