import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/useAuthStore';
import { useChatStore } from '../../stores/useChatStore';
import { useNetworkingStore } from '../../stores/useNetworkingStore';
import { useMessages } from '../../hooks/useRealtime';
import { isMockMode } from '../../lib/supabase';
import { mockDb } from '../../lib/mockDb';
import { 
  Send, ShieldAlert, ArrowLeft, 
  ShieldX, Check, CheckCheck, AlertTriangle
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function ChatPage() {
  const { connectionId } = useParams<{ connectionId: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { 
    conversations, 
    messages, 
    setActiveConnection, 
    fetchConversations, 
    sendMessage, 
    markAsRead,
    blockUser,
    unblockUser,
    reportUser
  } = useChatStore();

  const { locations, fetchLocationStatuses } = useNetworkingStore();

  const [inputContent, setInputContent] = useState('');
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [reportReason, setReportReason] = useState('Harassment');
  const [reportDetails, setReportDetails] = useState('');
  const [isBlockedByMe, setIsBlockedByMe] = useState(false);
  const [isBlockedByThem, setIsBlockedByThem] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Subscribe to real-time messages
  useMessages(connectionId || null, user?.id || null);

  // Load conversations on mount
  useEffect(() => {
    if (user) {
      fetchConversations(user.id);
    }
  }, [user, fetchConversations]);

  // Handle active conversation setting in store
  useEffect(() => {
    setActiveConnection(connectionId || null);
    if (connectionId && user) {
      markAsRead(connectionId, user.id);
    }
  }, [connectionId, user, setActiveConnection, markAsRead]);

  // Load location statuses of connections
  useEffect(() => {
    if (user) {
      fetchLocationStatuses(user.id);
    }
  }, [user, fetchLocationStatuses, connectionId]);

  const activeConnection = conversations.find(c => c.id === connectionId);
  const otherPerson = activeConnection?.other_user;

  // Scroll messages to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  useEffect(() => {
    scrollToBottom();
  }, [messages, connectionId]);

  // Check block status
  useEffect(() => {
    if (!user || !otherPerson) return;
    
    const checkBlocks = async () => {
      if (isMockMode) {
        const blocks = mockDb.getBlocks();
        const blockedByMe = blocks.some(b => b.blocker_id === user.id && b.blocked_id === otherPerson.id);
        const blockedByThem = blocks.some(b => b.blocker_id === otherPerson.id && b.blocked_id === user.id);
        setIsBlockedByMe(blockedByMe);
        setIsBlockedByThem(blockedByThem);
      } else {
        // Query database
        const blocks = mockDb.getStore<any>('blocked_users', []);
        const bByMe = blocks.filter((b: any) => b.blocker_id === user.id && b.blocked_id === otherPerson.id);
        setIsBlockedByMe(bByMe && bByMe.length > 0);
      }
    };
    checkBlocks();
  }, [user, otherPerson, connectionId, conversations]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputContent.trim() || !connectionId || !user || isBlockedByMe || isBlockedByThem) return;

    try {
      await sendMessage(connectionId, user.id, inputContent.trim());
      setInputContent('');
    } catch (err) {
      toast.error('Failed to send message');
    }
  };

  const handleBlockToggle = async () => {
    if (!user || !otherPerson) return;

    if (isBlockedByMe) {
      const confirm = window.confirm(`Unblock ${otherPerson.full_name}?`);
      if (!confirm) return;
      try {
        await unblockUser(user.id, otherPerson.id);
        setIsBlockedByMe(false);
        toast.success('User unblocked');
        fetchConversations(user.id);
      } catch (err) {
        toast.error('Failed to unblock user');
      }
    } else {
      const confirm = window.confirm(`Block ${otherPerson.full_name}? You will no longer see their updates.`);
      if (!confirm) return;
      try {
        await blockUser(user.id, otherPerson.id);
        setIsBlockedByMe(true);
        toast.success('User blocked successfully');
        // Stay on page or navigate out
        navigate('/app/connections');
      } catch (err) {
        toast.error('Failed to block user');
      }
    }
  };

  const handleReportSubmit = async () => {
    if (!user || !otherPerson) return;
    try {
      await reportUser(user.id, otherPerson.id, reportReason, reportDetails);
      toast.success('Report submitted successfully');
      setShowReportDialog(false);
      setReportDetails('');
    } catch (err) {
      toast.error('Failed to submit report');
    }
  };

  // Helper date formatting
  const formatTime = (isoString: string) => {
    return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const activeMessages = connectionId ? messages[connectionId] || [] : [];

  return (
    <div className="flex flex-1 overflow-hidden h-full">
      
      {/* 1. Conversations List sidebar (collapses on mobile when chat is active) */}
      <div className={`w-full md:w-80 bg-zinc-950/20 border-r border-zinc-900 flex flex-col h-full flex-shrink-0 ${
        connectionId ? 'hidden md:flex' : 'flex'
      }`}>
        <div className="p-4 border-b border-zinc-900">
          <h2 className="text-lg font-bold tracking-tight text-white">Direct Messages</h2>
          <p className="text-xs text-zinc-500 mt-1">Talk privately with your accepted connections.</p>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {conversations.length === 0 ? (
            <div className="text-center py-12 text-zinc-550 text-xs italic">
              No conversations active. Connect with others from the attendee deck.
            </div>
          ) : (
            conversations.map((conv) => {
              const other = conv.other_user;
              if (!other) return null;

              const isSelected = conv.id === connectionId;
              const unread = useChatStore.getState().unreadCounts[conv.id] || 0;
              const loc = locations[other.id];
              const availDot = 
                loc?.availability === 'available' ? 'bg-brand-emerald' : 
                loc?.availability === 'busy' ? 'bg-brand-amber' : 'bg-zinc-650';

              return (
                <button
                  key={conv.id}
                  onClick={() => navigate(`/app/chat/${conv.id}`)}
                  className={`w-full text-left p-3 rounded-xl flex items-center justify-between border transition-all ${
                    isSelected
                      ? 'bg-brand-indigo/10 border-brand-indigo/30'
                      : 'bg-transparent border-transparent hover:bg-zinc-900/50 hover:border-zinc-850'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="relative flex-shrink-0">
                      <img
                        src={other.avatar_url || `https://api.dicebear.com/7.x/adventurer/svg?seed=${other.full_name}`}
                        alt={other.full_name}
                        className="w-10 h-10 rounded-full object-cover border border-zinc-800"
                      />
                      <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border border-zinc-950 ${availDot}`} />
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-bold text-xs text-zinc-200 truncate">{other.full_name}</h4>
                      <p className="text-[10px] text-zinc-500 truncate mt-0.5">
                        {other.looking_for ? `Looking for ${other.looking_for}` : 'Attendee'}
                      </p>
                    </div>
                  </div>

                  {unread > 0 && (
                    <span className="w-5 h-5 rounded-full bg-brand-rose text-white text-[10px] font-bold flex items-center justify-center">
                      {unread}
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* 2. Active Chat window (collapses on mobile when list is active) */}
      <div className={`flex-1 flex flex-col h-full bg-[#0F0F10] overflow-hidden ${
        !connectionId ? 'hidden md:flex items-center justify-center text-zinc-500 text-sm italic' : 'flex'
      }`}>
        {connectionId && otherPerson ? (
          <>
            {/* Header top bar */}
            <div className="p-4 border-b border-zinc-900 bg-zinc-950/30 flex items-center justify-between flex-shrink-0">
              
              <div className="flex items-center gap-3 min-w-0">
                <button
                  onClick={() => navigate('/app/chat')}
                  className="md:hidden p-1.5 hover:bg-zinc-900 text-zinc-400 hover:text-white rounded-lg"
                >
                  <ArrowLeft size={18} />
                </button>

                <img
                  src={otherPerson.avatar_url || `https://api.dicebear.com/7.x/adventurer/svg?seed=${otherPerson.full_name}`}
                  alt={otherPerson.full_name}
                  className="w-10 h-10 rounded-full border border-zinc-800 object-cover flex-shrink-0"
                />

                <div className="min-w-0">
                  <h3 className="font-bold text-sm text-zinc-100 truncate">{otherPerson.full_name}</h3>
                  {/* Availability + Location coordination (strictly for connections only) */}
                  {(() => {
                    const loc = locations[otherPerson.id];
                    const avail = loc?.availability || 'offline';
                    const zone = loc?.zone || 'Main Hall';
                    const isAvail = avail === 'available';
                    const dot = isAvail ? '🟢 Available' : avail === 'busy' ? '🟡 Busy' : '⚫ Offline';
                    
                    return (
                      <div className="text-[10px] text-zinc-500 flex items-center gap-1.5 truncate">
                        <span className="font-medium">{dot}</span>
                        {loc && (
                          <>
                            <span>&middot;</span>
                            <span className="truncate font-semibold text-zinc-400">📍 {zone}</span>
                          </>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* Action utilities */}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setShowReportDialog(true)}
                  className="p-2 text-zinc-500 hover:text-brand-rose hover:bg-zinc-900/60 rounded-xl transition-all"
                  title="Report User"
                >
                  <ShieldAlert size={16} />
                </button>
                <button
                  onClick={handleBlockToggle}
                  className={`p-2 rounded-xl transition-all ${
                    isBlockedByMe 
                      ? 'text-brand-emerald hover:bg-brand-emerald/10'
                      : 'text-zinc-500 hover:text-brand-rose hover:bg-zinc-900/60'
                  }`}
                  title={isBlockedByMe ? 'Unblock User' : 'Block User'}
                >
                  <ShieldX size={16} />
                </button>
              </div>

            </div>

            {/* Chat Messages area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-zinc-950/10">
              
              {activeMessages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-2">
                  <span className="text-3xl">🤝</span>
                  <h4 className="font-bold text-sm text-white">Connection Established</h4>
                  <p className="text-xs text-zinc-500 max-w-xs leading-relaxed">
                    Say hello to {otherPerson.full_name}! Share your hacking ideas or coordinate a meetup zone.
                  </p>
                </div>
              ) : (
                activeMessages.map((msg) => {
                  const isOwn = msg.sender_id === user?.id;
                  
                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'} max-w-full`}
                    >
                      <div
                        className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                          isOwn
                            ? 'bg-gradient-to-r from-brand-indigo to-brand-purple text-white rounded-br-none'
                            : 'bg-zinc-900 text-zinc-200 rounded-bl-none border border-zinc-850'
                        }`}
                      >
                        {msg.content}
                      </div>
                      
                      <div className="flex items-center gap-1 mt-1 px-1">
                        <span className="text-[9px] text-zinc-500">
                          {formatTime(msg.created_at)}
                        </span>
                        {isOwn && (
                          <span className="text-[10px] text-zinc-500">
                            {msg.is_read ? (
                              <CheckCheck size={11} className="text-brand-indigo" />
                            ) : (
                              <Check size={11} />
                            )}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Block Banner */}
            {(isBlockedByMe || isBlockedByThem) ? (
              <div className="p-4 bg-brand-rose/10 border-t border-brand-rose/20 text-center flex flex-col sm:flex-row items-center justify-center gap-3">
                <span className="text-xs text-zinc-350">
                  {isBlockedByMe 
                    ? 'You have blocked this user. You cannot send or receive messages.'
                    : 'Messaging has been disabled for this connection.'}
                </span>
                {isBlockedByMe && (
                  <button
                    onClick={handleBlockToggle}
                    className="text-xs bg-brand-rose text-white font-bold px-3 py-1.5 rounded-lg hover:opacity-90 transition-all"
                  >
                    Unblock User
                  </button>
                )}
              </div>
            ) : (
              /* Message Send input bar */
              <form onSubmit={handleSend} className="p-4 border-t border-zinc-900 bg-zinc-950/20 flex gap-2.5 items-end flex-shrink-0">
                <textarea
                  rows={1}
                  maxLength={1000}
                  value={inputContent}
                  onChange={(e) => setInputContent(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend(e);
                    }
                  }}
                  placeholder="Type a message... (Shift+Enter for newline)"
                  className="flex-grow max-h-24 rounded-xl border border-zinc-800 bg-zinc-900/40 px-4 py-3 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-brand-indigo resize-none"
                />
                <button
                  type="submit"
                  disabled={!inputContent.trim()}
                  className="p-3 bg-brand-indigo hover:opacity-95 text-white rounded-xl disabled:opacity-40 shadow transition-all flex-shrink-0"
                >
                  <Send size={16} />
                </button>
              </form>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center gap-3 text-center p-8">
            <span className="text-3xl">💬</span>
            <h3 className="font-bold text-base text-white">Select a conversation</h3>
            <p className="text-xs text-zinc-500 max-w-xs leading-relaxed">
              Pick a chat room from the conversations sidebar to coordinate your meetups.
            </p>
          </div>
        )}
      </div>

      {/* Report submit Dialog */}
      {showReportDialog && otherPerson && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-md rounded-2xl border border-brand-rose/25 shadow-2xl p-6 relative animate-zoom-in">
            <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-1.5 text-brand-rose">
              <AlertTriangle size={18} />
              <span>Report Conversation</span>
            </h3>
            <p className="text-xs text-zinc-400 mb-4">
              Your flag will block the chat log and send it to verification admins.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5">Reason</label>
                <select
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  className="w-full text-xs rounded-xl border border-zinc-800 bg-zinc-900/60 p-2.5 text-zinc-200 focus:outline-none"
                >
                  <option value="Abuse">Harassment or abusive speech</option>
                  <option value="Spam">Spam/Unwanted advertising</option>
                  <option value="Other">Other reasons</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5">Context</label>
                <textarea
                  rows={3}
                  value={reportDetails}
                  onChange={(e) => setReportDetails(e.target.value)}
                  placeholder="Provide supporting logs..."
                  className="w-full text-xs rounded-xl border border-zinc-800 bg-zinc-900/60 p-2.5 text-zinc-200 focus:outline-none resize-none"
                />
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button
                  onClick={() => setShowReportDialog(false)}
                  className="text-xs bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-400 font-bold px-4 py-2.5 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={handleReportSubmit}
                  className="text-xs bg-brand-rose text-white font-bold px-4 py-2.5 rounded-lg"
                >
                  Report
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
