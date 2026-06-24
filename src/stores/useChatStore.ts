import { create } from 'zustand';
import { supabase, isMockMode } from '../lib/supabase';
import { mockDb } from '../lib/mockDb';
import type { Connection, Message, Report } from '../types';
import { useAuthStore } from './useAuthStore';

interface ChatState {
  conversations: Connection[];
  activeConnectionId: string | null;
  messages: Record<string, Message[]>;
  unreadCounts: Record<string, number>;
  isLoading: boolean;
  error: string | null;
  setActiveConnection: (id: string | null) => void;
  fetchConversations: (userId: string) => Promise<void>;
  fetchMessages: (connectionId: string) => Promise<void>;
  sendMessage: (connectionId: string, senderId: string, content: string) => Promise<void>;
  addMessage: (connectionId: string, message: Message) => void;
  markAsRead: (connectionId: string, userId: string) => Promise<void>;
  blockUser: (blockerId: string, blockedId: string) => Promise<void>;
  unblockUser: (blockerId: string, blockedId: string) => Promise<void>;
  reportUser: (reporterId: string, reportedUserId: string, reason: string, details?: string) => Promise<void>;
}

export const useChatStore = create<ChatState>((set, get) => ({
  conversations: [],
  activeConnectionId: null,
  messages: {},
  unreadCounts: {},
  isLoading: false,
  error: null,

  setActiveConnection: (id) => set({ activeConnectionId: id }),

  fetchConversations: async (userId) => {
    set({ isLoading: true, error: null });

    if (isMockMode) {
      // Get connections
      const allConns = mockDb.getConnections();
      const userConns = allConns.filter(c => c.user_a === userId || c.user_b === userId);

      // Filter out connections involving blocked users
      const blocks = mockDb.getBlocks();
      const blockedUserIds = new Set<string>();
      blocks.forEach(b => {
        if (b.blocker_id === userId) blockedUserIds.add(b.blocked_id);
        if (b.blocked_id === userId) blockedUserIds.add(b.blocker_id);
      });

      const activeConns = userConns.filter(c => !blockedUserIds.has(c.user_a) && !blockedUserIds.has(c.user_b));

      // Fetch profile details for other party
      const profiles = mockDb.getProfiles();
      const formattedConns = activeConns.map(c => {
        const otherId = c.user_a === userId ? c.user_b : c.user_a;
        const other_user = profiles.find(p => p.id === otherId);
        return { ...c, other_user };
      });

      // Calculate unread counts
      const msgs = mockDb.getMessages();
      const unreads: Record<string, number> = {};
      formattedConns.forEach(c => {
        unreads[c.id] = msgs.filter(m => m.connection_id === c.id && m.sender_id !== userId && !m.is_read).length;
      });

      set({ conversations: formattedConns, unreadCounts: unreads, isLoading: false });
      return;
    }

    try {
      // 1. Fetch connections
      const { data: conns, error: connErr } = await supabase
        .from('connections')
        .select('*')
        .or(`user_a.eq.${userId},user_b.eq.${userId}`);

      if (connErr) throw connErr;

      // 2. Fetch blocked list
      const { data: blocks } = await supabase
        .from('blocked_users')
        .select('blocked_id, blocker_id')
        .or(`blocker_id.eq.${userId},blocked_id.eq.${userId}`);

      const blockedUserIds = new Set<string>();
      if (blocks) {
        blocks.forEach((b: any) => {
          if (b.blocker_id === userId) blockedUserIds.add(b.blocked_id);
          if (b.blocked_id === userId) blockedUserIds.add(b.blocker_id);
        });
      }

      // Filter out blocked connections
      const filteredConns = (conns || []).filter((c: any) => !blockedUserIds.has(c.user_a) && !blockedUserIds.has(c.user_b));

      // 3. For each connection, fetch other user's profile
      const formatted: Connection[] = [];
      const unreads: Record<string, number> = {};

      for (const conn of filteredConns) {
        const otherId = conn.user_a === userId ? conn.user_b : conn.user_a;
        const { data: prof, error: profErr } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', otherId)
          .single();

        if (!profErr && prof) {
          formatted.push({ ...conn, other_user: prof });

          // Calculate unread
          const { count, error: countErr } = await supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('connection_id', conn.id)
            .neq('sender_id', userId)
            .eq('is_read', false);

          if (!countErr) {
            unreads[conn.id] = count || 0;
          }
        }
      }

      set({ conversations: formatted, unreadCounts: unreads, isLoading: false });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  },

  fetchMessages: async (connectionId) => {
    if (isMockMode) {
      const msgs = mockDb.getMessages().filter(m => m.connection_id === connectionId);
      set((state) => ({
        messages: { ...state.messages, [connectionId]: msgs }
      }));
      return;
    }

    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('connection_id', connectionId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      set((state) => ({
        messages: { ...state.messages, [connectionId]: data || [] }
      }));
    } catch (err: any) {
      console.error(err.message);
    }
  },

  sendMessage: async (connectionId, senderId, content) => {
    if (isMockMode) {
      // Check block constraint
      const connection = mockDb.getConnections().find(c => c.id === connectionId);
      if (connection) {
        const otherId = connection.user_a === senderId ? connection.user_b : connection.user_a;
        const blocks = mockDb.getBlocks();
        const isBlocked = blocks.some(b => 
          (b.blocker_id === senderId && b.blocked_id === otherId) || 
          (b.blocker_id === otherId && b.blocked_id === senderId)
        );

        if (isBlocked) {
          throw new Error('Blocked: cannot send message.');
        }
      }

      const newMsg: Message = {
        id: 'msg_' + Math.random().toString(36).substr(2, 9),
        connection_id: connectionId,
        sender_id: senderId,
        content,
        is_read: false,
        created_at: new Date().toISOString()
      };

      const msgs = mockDb.getMessages();
      mockDb.setMessages([...msgs, newMsg]);

      get().addMessage(connectionId, newMsg);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('messages')
        .insert([{ connection_id: connectionId, sender_id: senderId, content }])
        .select()
        .single();

      if (error) throw error;
      get().addMessage(connectionId, data);
    } catch (err: any) {
      console.error(err.message);
      throw err;
    }
  },

  addMessage: (connectionId, message) => {
    set((state) => {
      const list = state.messages[connectionId] || [];
      // Prevent duplicate appends if realtime fires after insert
      if (list.some((m) => m.id === message.id)) return state;

      const updatedMsgs = [...list, message];
      const newUnreads = { ...state.unreadCounts };

      // Increment unread count if we are not actively viewing this connection
      const currentUserId = useAuthStore.getState().user?.id;
      if (state.activeConnectionId !== connectionId && message.sender_id !== currentUserId) {
        newUnreads[connectionId] = (newUnreads[connectionId] || 0) + 1;
      }

      return {
        messages: { ...state.messages, [connectionId]: updatedMsgs },
        unreadCounts: newUnreads
      };
    });
  },

  markAsRead: async (connectionId, userId) => {
    if (isMockMode) {
      const msgs = mockDb.getMessages();
      const updated = msgs.map(m => 
        m.connection_id === connectionId && m.sender_id !== userId ? { ...m, is_read: true } : m
      );
      mockDb.setMessages(updated);

      set((state) => ({
        unreadCounts: { ...state.unreadCounts, [connectionId]: 0 }
      }));
      return;
    }

    try {
      const { error } = await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('connection_id', connectionId)
        .neq('sender_id', userId)
        .eq('is_read', false);

      if (!error) {
        set((state) => ({
          unreadCounts: { ...state.unreadCounts, [connectionId]: 0 }
        }));
      }
    } catch (err) {
      console.error(err);
    }
  },

  blockUser: async (blockerId, blockedId) => {
    if (isMockMode) {
      const blocks = mockDb.getBlocks();
      if (!blocks.some(b => b.blocker_id === blockerId && b.blocked_id === blockedId)) {
        mockDb.setBlocks([...blocks, { blocker_id: blockerId, blocked_id: blockedId }]);
      }
      // Remove any active connection between them
      const conns = mockDb.getConnections();
      const updatedConns = conns.filter(c => 
        !((c.user_a === blockerId && c.user_b === blockedId) || (c.user_a === blockedId && c.user_b === blockerId))
      );
      mockDb.setConnections(updatedConns);

      // Refresh conversations list
      await get().fetchConversations(blockerId);
      return;
    }

    try {
      // 1. Insert into blocked_users
      const { error: blockErr } = await supabase
        .from('blocked_users')
        .insert([{ blocker_id: blockerId, blocked_id: blockedId }]);

      if (blockErr) throw blockErr;

      // 2. Delete any mutual connection
      const { error: connErr } = await supabase
        .from('connections')
        .delete()
        .or(`and(user_a.eq.${blockerId},user_b.eq.${blockedId}),and(user_a.eq.${blockedId},user_b.eq.${blockerId})`);

      if (connErr) throw connErr;

      // 3. Delete pending connection requests
      await supabase
        .from('connection_requests')
        .delete()
        .or(`and(sender_id.eq.${blockerId},receiver_id.eq.${blockedId}),and(sender_id.eq.${blockedId},receiver_id.eq.${blockerId})`);

      // Refresh conversations
      await get().fetchConversations(blockerId);
    } catch (err: any) {
      console.error(err.message);
      throw err;
    }
  },

  unblockUser: async (blockerId, blockedId) => {
    if (isMockMode) {
      const blocks = mockDb.getBlocks();
      const filtered = blocks.filter(b => !(b.blocker_id === blockerId && b.blocked_id === blockedId));
      mockDb.setBlocks(filtered);
      return;
    }

    try {
      await supabase
        .from('blocked_users')
        .delete()
        .eq('blocker_id', blockerId)
        .eq('blocked_id', blockedId);
    } catch (err) {
      console.error(err);
    }
  },

  reportUser: async (reporterId, reportedUserId, reason, details) => {
    if (isMockMode) {
      const reports = mockDb.getReports();
      const newReport: Report = {
        id: 'rep_' + Math.random().toString(),
        reporter_id: reporterId,
        reported_user_id: reportedUserId,
        reason,
        details,
        status: 'pending',
        created_at: new Date().toISOString()
      };
      mockDb.setReports([newReport, ...reports]);
      return;
    }

    try {
      const { error } = await supabase
        .from('reports')
        .insert([{
          reporter_id: reporterId,
          reported_user_id: reportedUserId,
          reason,
          details
        }]);

      if (error) throw error;
    } catch (err: any) {
      console.error(err.message);
      throw err;
    }
  }
}));
