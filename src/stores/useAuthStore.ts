import { create } from 'zustand';
import { supabase, isMockMode } from '../lib/supabase';
import { mockDb } from '../lib/mockDb';
import type { Profile } from '../types';

interface AuthState {
  user: any | null;
  profile: Profile | null;
  isAdmin: boolean;
  isLoading: boolean;
  error: string | null;
  setUser: (user: any) => void;
  setProfile: (profile: Profile | null) => void;
  initialize: () => Promise<void>;
  signIn: (email: string, password: string, isAdminPortal?: boolean) => Promise<void>;
  signUp: (email: string, password: string, fullName: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<void>;
  onboard: (data: {
    fullName: string;
    bio: string;
    skills: string[];
    interests: string[];
    looking_for: Profile['looking_for'];
    avatar_url?: string;
    linkedin_url?: string;
    github_url?: string;
    event_id: string;
  }) => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  profile: null,
  isAdmin: false,
  isLoading: true,
  error: null,

  setUser: (user) => set({ user }),
  setProfile: (profile) => set({ profile }),

  initialize: async () => {
    set({ isLoading: true, error: null });
    if (isMockMode) {
      const storedUser = mockDb.getCurrentUser();
      if (storedUser) {
        const profiles = mockDb.getProfiles();
        const profile = profiles.find((p) => p.id === storedUser.id) || null;
        set({
          user: storedUser,
          profile,
          isAdmin: storedUser.email === 'admin@hackconnect.app' || storedUser.role === 'admin',
          isLoading: false
        });
      } else {
        set({ user: null, profile: null, isAdmin: false, isLoading: false });
      }
      return;
    }

    try {
      // 1. Get current session
      const { data: { session }, error: sessionErr } = await supabase.auth.getSession();
      if (sessionErr) throw sessionErr;

      if (session) {
        const user = session.user;
        const isAdmin = user.user_metadata?.role === 'admin' || user.email === 'admin@hackconnect.app';

        // 2. Fetch profile if not admin
        let profile: Profile | null = null;
        if (!isAdmin) {
          const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

          if (!error && data) {
            profile = data;
          }
        }

        set({ user, profile, isAdmin, isLoading: false });
      } else {
        set({ user: null, profile: null, isAdmin: false, isLoading: false });
      }

      // 3. Listen to Auth state changes
      supabase.auth.onAuthStateChange(async (_event: any, session: any) => {
        if (session) {
          const user = session.user;
          const isAdmin = user.user_metadata?.role === 'admin' || user.email === 'admin@hackconnect.app';
          let profile: Profile | null = null;

          if (!isAdmin) {
            const { data } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', user.id)
              .single();
            profile = data || null;
          }

          set({ user, profile, isAdmin, isLoading: false });
        } else {
          set({ user: null, profile: null, isAdmin: false, isLoading: false });
        }
      });

    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  },

  signIn: async (email, password, isAdminPortal = false) => {
    set({ isLoading: true, error: null });

    if (isMockMode) {
      // Admin check
      if (email === 'admin@hackconnect.app') {
        if (password === 'HackConnect@Admin2024') {
          const adminUser = { id: '00000000-0000-0000-0000-000000000001', email, role: 'admin' };
          mockDb.setCurrentUser(adminUser);
          set({ user: adminUser, profile: null, isAdmin: true, isLoading: false });
          return;
        } else {
          set({ error: 'Invalid admin credentials', isLoading: false });
          throw new Error('Invalid admin credentials');
        }
      }

      // Participant checks
      const profiles = mockDb.getProfiles();
      const profile = profiles.find((p) => p.email === email);
      if (profile && password === 'Password123!') {
        const dummyUser = { id: profile.id, email: profile.email };
        mockDb.setCurrentUser(dummyUser);
        set({ user: dummyUser, profile, isAdmin: false, isLoading: false });
        return;
      }

      // Create a temporary new participant session
      const dummyUser = { id: 'new-user-id-' + Math.random().toString(36).substr(2, 9), email };
      mockDb.setCurrentUser(dummyUser);
      set({ user: dummyUser, profile: null, isAdmin: false, isLoading: false });
      return;
    }

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      if (!res.ok) {
        let errorMessage = 'Failed to login';
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

      const { user, session, profile } = await res.json();

      // Set active session in client-side Supabase client to sync RLS context
      const { error: sessionErr } = await supabase.auth.setSession({
        access_token: session.access_token,
        refresh_token: session.refresh_token
      });
      if (sessionErr) throw sessionErr;

      const isAdmin = user.user_metadata?.role === 'admin' || user.email === 'admin@hackconnect.app';

      if (isAdminPortal && !isAdmin) {
        // If logged in via Admin portal but not an admin, sign out instantly
        await supabase.auth.signOut();
        throw new Error('Unauthorized. You are not an administrator.');
      }

      set({ user, profile, isAdmin, isLoading: false });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
      throw err;
    }
  },

  signUp: async (email, password, fullName) => {
    set({ isLoading: true, error: null });

    if (isMockMode) {
      const newUserId = 'user_' + Math.random().toString(36).substr(2, 9);
      const newUser = { id: newUserId, email };
      mockDb.setCurrentUser(newUser);

      // Create profile with default values, complete during onboarding
      const newProfile: Profile = {
        id: newUserId,
        full_name: fullName,
        email,
        skills: [],
        interests: []
      };

      const profiles = mockDb.getProfiles();
      mockDb.setProfiles([...profiles, newProfile]);

      set({ user: newUser, profile: newProfile, isAdmin: false, isLoading: false });
      return;
    }

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, fullName })
      });

      if (!res.ok) {
        let errorMessage = 'Failed to register';
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

      const { user, session, profile } = await res.json();

      // Auto-login the user immediately after registration by setting the session
      const { error: sessionErr } = await supabase.auth.setSession({
        access_token: session.access_token,
        refresh_token: session.refresh_token
      });
      if (sessionErr) throw sessionErr;

      set({ user, profile, isLoading: false });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
      throw err;
    }
  },

  signInWithGoogle: async () => {
    set({ isLoading: true, error: null });
    if (isMockMode) {
      // Simulate Google OAuth by logging in as Alex Rivera
      const alexProfile = mockDb.getProfiles().find(p => p.email === 'alex@hackconnect.app');
      const alexUser = { id: alexProfile?.id, email: alexProfile?.email };
      mockDb.setCurrentUser(alexUser);
      set({ user: alexUser, profile: alexProfile || null, isAdmin: false, isLoading: false });
      return;
    }

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/login`
        }
      });
      if (error) throw error;
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
      throw err;
    }
  },

  signOut: async () => {
    set({ isLoading: true });
    if (isMockMode) {
      mockDb.setCurrentUser(null);
      set({ user: null, profile: null, isAdmin: false, isLoading: false });
      return;
    }

    try {
      await supabase.auth.signOut();
      set({ user: null, profile: null, isAdmin: false, isLoading: false });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  },

  updateProfile: async (updates) => {
    const { user, profile } = get();
    if (!user) return;

    set({ isLoading: true });
    if (isMockMode) {
      const profiles = mockDb.getProfiles();
      const updatedProfiles = profiles.map((p) =>
        p.id === user.id ? { ...p, ...updates } : p
      );
      mockDb.setProfiles(updatedProfiles);
      set({
        profile: { ...profile, ...updates } as Profile,
        isLoading: false
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id);

      if (error) throw error;

      set({
        profile: { ...profile, ...updates } as Profile,
        isLoading: false
      });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
      throw err;
    }
  },

  onboard: async (data) => {
    const { user } = get();
    if (!user) throw new Error('Not authenticated');

    set({ isLoading: true });

    const updates: Partial<Profile> = {
      full_name: data.fullName,
      bio: data.bio,
      skills: data.skills,
      interests: data.interests,
      looking_for: data.looking_for,
      avatar_url: data.avatar_url || `https://api.dicebear.com/7.x/adventurer/svg?seed=${data.fullName}`,
      linkedin_url: data.linkedin_url,
      github_url: data.github_url,
      event_id: data.event_id
    };

    if (isMockMode) {
      // Save profile updates
      const profiles = mockDb.getProfiles();
      const updatedProfiles = profiles.map((p) =>
        p.id === user.id ? { ...p, ...updates } : p
      );
      mockDb.setProfiles(updatedProfiles);

      // Join event in mock event participants table
      const participations = mockDb.getStore<any>('hc_event_participants', []);
      const alreadyJoined = participations.some(
        (p: any) => p.event_id === data.event_id && p.user_id === user.id
      );
      if (!alreadyJoined) {
        mockDb.setStore('hc_event_participants', [
          ...participations,
          { id: Math.random().toString(), event_id: data.event_id, user_id: user.id }
        ]);
      }

      // Initialize default location
      const locations = mockDb.getLocations();
      if (!locations.some(l => l.user_id === user.id)) {
        mockDb.setLocations([
          ...locations,
          {
            id: 'loc_' + Math.random().toString(36).substr(2, 9),
            user_id: user.id,
            event_id: data.event_id,
            zone: 'Main Hall',
            availability: 'available',
            updated_at: new Date().toISOString()
          }
        ]);
      }

      set({
        profile: { id: user.id, email: user.email, ...updates } as Profile,
        isLoading: false
      });
      return;
    }

    try {
      // Update profile
      const { error: profileErr } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id);

      if (profileErr) throw profileErr;

      // Join event
      const { error: joinErr } = await supabase
        .from('event_participants')
        .upsert({ event_id: data.event_id, user_id: user.id }, { onConflict: 'event_id,user_id' });

      if (joinErr) throw joinErr;

      // Initialize location_status
      const { error: locErr } = await supabase
        .from('location_status')
        .upsert({
          user_id: user.id,
          event_id: data.event_id,
          zone: 'Main Hall',
          availability: 'available',
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id' });

      if (locErr) throw locErr;

      set({
        profile: { id: user.id, email: user.email, ...updates } as Profile,
        isLoading: false
      });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
      throw err;
    }
  }
}));

// Helper method for mockDB JSON read/write logic
(mockDb as any).getStore = function <T>(key: string, initial: T[]): T[] {
  const data = localStorage.getItem(key);
  if (!data) {
    localStorage.setItem(key, JSON.stringify(initial));
    return initial;
  }
  return JSON.parse(data);
};
(mockDb as any).setStore = function <T>(key: string, data: T[]): void {
  localStorage.setItem(key, JSON.stringify(data));
};
