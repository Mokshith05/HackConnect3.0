import { useEffect, useRef } from 'react';
import { supabase, isMockMode } from '../lib/supabase';
import { useChatStore } from '../stores/useChatStore';
import { useNetworkingStore } from '../stores/useNetworkingStore';
import toast from 'react-hot-toast';
import { mockDb } from '../lib/mockDb';

export function useMessages(connectionId: string | null, currentUserId: string | null) {
  const addMessage = useChatStore((state) => state.addMessage);
  const fetchMessages = useChatStore((state) => state.fetchMessages);
  const markAsRead = useChatStore((state) => state.markAsRead);

  // Fetch initial messages on load
  useEffect(() => {
    if (connectionId) {
      fetchMessages(connectionId);
      if (currentUserId) {
        markAsRead(connectionId, currentUserId);
      }
    }
  }, [connectionId, currentUserId]);

  useEffect(() => {
    if (!connectionId || isMockMode) {
      // Setup a mock message reply simulation to demo realtime chat
      if (connectionId && currentUserId) {
        const timer = setTimeout(() => {
          // Check if there are messages and the last message is from current user
          const chatMsgs = useChatStore.getState().messages[connectionId] || [];
          if (chatMsgs.length > 0 && chatMsgs[chatMsgs.length - 1].sender_id === currentUserId) {
            const connection = mockDb.getConnections().find(c => c.id === connectionId);
            const senderName = connection?.other_user?.full_name || 'Connection';
            
            const replyMsg = {
              id: 'reply_' + Math.random().toString(),
              connection_id: connectionId,
              sender_id: connection?.user_a === currentUserId ? connection.user_b : connection?.user_a || 'other',
              content: `Hey! That sounds super cool. Let's definitely synchronize on this. I'm available to sync in person now.`,
              is_read: false,
              created_at: new Date().toISOString()
            };
            
            // Append message
            const msgs = mockDb.getMessages();
            mockDb.setMessages([...msgs, replyMsg]);
            addMessage(connectionId, replyMsg);
            toast(`💬 New message from ${senderName}`);
          }
        }, 4000); // Send mock reply after 4s

        return () => clearTimeout(timer);
      }
      return;
    }

    // Subscribe to messages channel
    const channel = supabase
      .channel(`messages:${connectionId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `connection_id=eq.${connectionId}`
        },
        (payload: any) => {
          const newMsg = payload.new as any;
          addMessage(connectionId, newMsg);

          // If current user is looking at this chat, mark it read
          if (currentUserId && newMsg.sender_id !== currentUserId) {
            markAsRead(connectionId, currentUserId);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [connectionId, currentUserId, addMessage]);
}

export function useConnectionRequests(userId: string | null, eventId: string | null) {
  const fetchNetworkingData = useNetworkingStore((state) => state.fetchNetworkingData);

  useEffect(() => {
    if (!userId || !eventId) return;

    if (isMockMode) {
      // Simulation: trigger a mock request from Emily or Marcus after 25s
      const timer = setTimeout(() => {
        const requests = mockDb.getRequests();
        const profile = mockDb.getProfiles().find(p => p.email === 'emily@hackconnect.app');
        if (profile && !requests.some(r => r.sender_id === profile.id && r.receiver_id === userId)) {
          const mockReq = {
            id: 'mock_req_' + Math.random(),
            sender_id: profile.id,
            receiver_id: userId,
            event_id: eventId,
            status: 'pending' as const,
            message: `Hi there! I saw you overlap in Figma and React. Let's sync up on project design!`,
            created_at: new Date().toISOString()
          };
          mockDb.setRequests([...requests, mockReq]);
          fetchNetworkingData(userId, eventId);
          toast(`🤝 Emily Watson wants to connect with you!`);
        }
      }, 25000);

      return () => clearTimeout(timer);
    }

    const channel = supabase
      .channel(`requests:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'connection_requests',
          filter: `receiver_id=eq.${userId}`
        },
        async (payload: any) => {
          // Fetch sender name
          const senderId = payload.new.sender_id;
          const { data } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', senderId)
            .single();

          toast(`🤝 ${data?.full_name || 'Someone'} wants to connect with you!`);
          fetchNetworkingData(userId, eventId);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'connection_requests'
        },
        () => {
          fetchNetworkingData(userId, eventId);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, eventId, fetchNetworkingData]);
}

export function useAttendeePresence(eventId: string | null, currentUserId: string | null, setOnlineUsers: (users: string[]) => void) {
  useEffect(() => {
    if (!eventId || !currentUserId) return;

    if (isMockMode) {
      // In mock mode, keep 3 of our demo users online
      setOnlineUsers([
        currentUserId,
        '22222222-2222-2222-2222-222222222201', // Alex
        '22222222-2222-2222-2222-222222222202', // Sarah
        '22222222-2222-2222-2222-222222222204'  // Emily
      ]);
      return;
    }

    const channel = supabase.channel(`presence:event:${eventId}`);

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const onlineIds: string[] = [];
        
        Object.keys(state).forEach((key) => {
          const presenceList = state[key] as any[];
          presenceList.forEach((presence) => {
            if (presence.user_id) {
              onlineIds.push(presence.user_id);
            }
          });
        });
        
        setOnlineUsers(onlineIds);
      })
      .subscribe(async (status: any) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            user_id: currentUserId,
            online_at: new Date().toISOString()
          });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [eventId, currentUserId]);
}

export function useLocationStatus(userId: string | null) {
  const fetchLocationStatuses = useNetworkingStore((state) => state.fetchLocationStatuses);
  const locationRef = useRef(fetchLocationStatuses);
  locationRef.current = fetchLocationStatuses;

  useEffect(() => {
    if (!userId) return;

    if (isMockMode) {
      // Periodically refresh location state
      const interval = setInterval(() => {
        if (userId) {
          locationRef.current(userId);
        }
      }, 10000);
      return () => clearInterval(interval);
    }

    const channel = supabase
      .channel('location_updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'location_status'
        },
        () => {
          if (userId) {
            locationRef.current(userId);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);
}
