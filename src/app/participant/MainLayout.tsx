import { useEffect, useState } from 'react';
import { Outlet, Link, useLocation, useNavigate, useOutletContext } from 'react-router-dom';
import { useAuthStore } from '../../stores/useAuthStore';
import { useNetworkingStore } from '../../stores/useNetworkingStore';
import { useChatStore } from '../../stores/useChatStore';
import { useEventStore } from '../../stores/useEventStore';
import { useConnectionRequests, useLocationStatus, useAttendeePresence } from '../../hooks/useRealtime';
import { Home, Users, Inbox, MapPin, User, LogOut, Loader2, Calendar, Rocket } from 'lucide-react';
import toast from 'react-hot-toast';
import { Starfield } from './Starfield';


export default function MainLayout() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { user, profile, signOut, isLoading: authLoading } = useAuthStore();
  const { currentEvent, events, fetchEvents, setCurrentEvent } = useEventStore();
  const { fetchNetworkingData, receivedRequests } = useNetworkingStore();
  const { fetchConversations, unreadCounts } = useChatStore();

  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);


  // Load events if auth succeeds
  useEffect(() => {
    if (user) {
      fetchEvents();
    }
  }, [user, fetchEvents]);

  // Handle Event alignment on load
  useEffect(() => {
    if (profile?.event_id && events.length > 0) {
      const current = events.find(e => e.id === profile.event_id) || null;
      setCurrentEvent(current);
    }
  }, [profile, events, setCurrentEvent]);

  // Load networking data and conversations
  useEffect(() => {
    if (user && profile?.event_id) {
      fetchNetworkingData(user.id, profile.event_id);
      fetchConversations(user.id);
    }
  }, [user, profile, fetchNetworkingData, fetchConversations]);

  // Subscribe to realtime database updates
  useConnectionRequests(user?.id || null, currentEvent?.id || null);
  useLocationStatus(user?.id || null);
  useAttendeePresence(currentEvent?.id || null, user?.id || null, setOnlineUsers);

  // Total count of incoming connection requests
  const requestsCount = receivedRequests.length;

  // Total count of unread chat messages
  const totalUnreadMessages = Object.values(unreadCounts).reduce((a, b) => a + b, 0);

  const handleLogout = async () => {
    await signOut();
    toast.success('Logged out successfully');
    navigate('/');
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#0F0F10] text-zinc-100 flex flex-col items-center justify-center gap-4">
        <Loader2 className="animate-spin text-brand-indigo" size={32} />
        <span className="text-sm text-zinc-400">Loading your HackConnect profile...</span>
      </div>
    );
  }

  if (!user) {
    // Navigate will be handled at Router layer but fallback render is safe
    return null;
  }

  const menuItems = [
    { label: 'Home', path: '/app/home', icon: Home, badge: 0 },
    { label: 'Aura Board', path: '/app/aura-board', icon: Rocket, badge: 0 },
    { label: 'Connections', path: '/app/connections', icon: Users, badge: totalUnreadMessages },
    { label: 'Requests', path: '/app/requests', icon: Inbox, badge: requestsCount },
    { label: 'Location', path: '/app/location', icon: MapPin, badge: 0 },
    { label: 'Profile', path: '/app/profile', icon: User, badge: 0 }
  ];

  return (
    <div className="min-h-screen bg-[#0F0F10] text-zinc-100 flex flex-col md:flex-row relative">
      
      {/* Starfield background animation */}
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
        <Starfield bgColor="#0F0F10" starColor="rgba(255, 255, 255, 0.45)" quantity={256} speed={0.25} />
      </div>

      {/* 1. Sidebar - DESKTOP ONLY */}
      <aside className="hidden md:flex flex-col justify-between w-64 border-r border-zinc-900 bg-zinc-950 p-6 flex-shrink-0 z-20">
        <div className="space-y-8">
          
          {/* Logo */}
          <Link to="/app/home" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-indigo to-brand-purple flex items-center justify-center font-bold text-sm text-white">
              H
            </div>
            <span className="font-extrabold text-xl bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent">
              HackConnect
            </span>
          </Link>

          {/* Active Event Indicator */}
          {currentEvent && (
            <div className="flex items-start gap-2 bg-zinc-900/60 border border-zinc-800 p-3 rounded-xl">
              <Calendar size={16} className="text-brand-indigo mt-0.5" />
              <div className="min-w-0">
                <div className="text-[10px] uppercase font-bold tracking-wider text-zinc-500">Active Event</div>
                <div className="text-xs font-bold text-zinc-200 truncate">{currentEvent.name}</div>
              </div>
            </div>
          )}

          {/* Navigation Links */}
          <nav className="space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.path;
              return (
                <Link
                  key={item.label}
                  to={item.path}
                  className={`flex items-center justify-between px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                    isActive
                      ? 'bg-brand-indigo/10 text-brand-indigo border-l-4 border-brand-indigo pl-3'
                      : 'text-zinc-400 hover:text-white hover:bg-zinc-900/50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon size={18} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge > 0 && (
                    <span className="bg-brand-rose text-white text-[10px] px-2 py-0.5 rounded-full font-bold">
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Footer User Info */}
        <div className="space-y-4 pt-6 border-t border-zinc-900">
          <div className="flex items-center gap-3">
            <img
              src={profile?.avatar_url || `https://api.dicebear.com/7.x/adventurer/svg?seed=${profile?.full_name}`}
              alt="Profile"
              className="w-10 h-10 rounded-full border border-zinc-800 object-cover"
            />
            <div className="min-w-0 flex-1">
              <div className="text-xs font-bold text-zinc-200 truncate">{profile?.full_name}</div>
              <div className="text-[10px] text-zinc-500 truncate">{profile?.email}</div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-zinc-400 hover:text-brand-rose hover:bg-brand-rose/5 transition-all"
          >
            <LogOut size={18} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* 2. Main Page Content Window */}
      <main className="flex-1 flex flex-col min-w-0 pb-16 md:pb-0 h-screen overflow-hidden relative z-10">
        {/* Pass onlineUsers context to children through context or custom handle if needed */}
        <Outlet context={{ onlineUsers }} />
      </main>

      {/* 3. Bottom Tab Bar Navigation - MOBILE ONLY */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-zinc-950 border-t border-zinc-900 flex justify-around items-center h-16 px-4 z-20">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.path;
          return (
            <Link
              key={item.label}
              to={item.path}
              className={`relative flex flex-col items-center justify-center w-12 h-12 rounded-xl transition-all ${
                isActive ? 'text-brand-indigo' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <Icon size={20} />
              <span className="text-[10px] mt-1 font-semibold">{item.label}</span>
              {item.badge > 0 && (
                <span className="absolute top-1.5 right-1.5 bg-brand-rose text-white text-[8px] min-w-[16px] h-4 rounded-full font-bold flex items-center justify-center px-1">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
export interface OutletContextType {
  onlineUsers: string[];
}
export function useOnlineUsers() {
  return useOutletContext<OutletContextType>();
}
