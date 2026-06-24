import type { Profile, Event, Connection, ConnectionRequest, Message, LocationStatus, AiSuggestion, Report, Announcement } from '../types';

// Seed initial mock data if not present in LocalStorage
const SEED_PROFILES: Profile[] = [
  {
    id: '22222222-2222-2222-2222-222222222201',
    full_name: 'Alex Rivera',
    email: 'alex@hackconnect.app',
    avatar_url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Alex',
    bio: 'Frontend developer passionate about sleek UI/UX and micro-interactions. Building with React/Tailwind.',
    skills: ['React', 'TypeScript', 'Tailwind', 'Next.js', 'Figma'],
    interests: ['AI', 'Web3', 'Design Systems', 'EdTech'],
    linkedin_url: 'https://linkedin.com/in/alexrivera-demo',
    github_url: 'https://github.com/alexrivera-demo',
    looking_for: 'teammate',
    event_id: '11111111-1111-1111-1111-111111111111'
  },
  {
    id: '22222222-2222-2222-2222-222222222202',
    full_name: 'Sarah Chen',
    email: 'sarah@hackconnect.app',
    avatar_url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Sarah',
    bio: 'AI Research engineer. Experienced in NLP model fine-tuning and Python backends.',
    skills: ['Python', 'PyTorch', 'FastAPI', 'ML', 'LangChain'],
    interests: ['AI', 'HealthTech', 'LLMs', 'OpenSource'],
    linkedin_url: 'https://linkedin.com/in/sarahchen-demo',
    github_url: 'https://github.com/sarahchen-demo',
    looking_for: 'collaborator',
    event_id: '11111111-1111-1111-1111-111111111111'
  },
  {
    id: '22222222-2222-2222-2222-222222222203',
    full_name: 'David Kim',
    email: 'david@hackconnect.app',
    avatar_url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=David',
    bio: 'Fullstack engineer and startup enthusiast. Loves building scalable backends.',
    skills: ['Go', 'PostgreSQL', 'Docker', 'React', 'AWS'],
    interests: ['FinTech', 'SaaS', 'DevOps', 'Web3'],
    linkedin_url: 'https://linkedin.com/in/davidkim-demo',
    github_url: 'https://github.com/davidkim-demo',
    looking_for: 'networking',
    event_id: '11111111-1111-1111-1111-111111111111'
  },
  {
    id: '22222222-2222-2222-2222-222222222204',
    full_name: 'Emily Watson',
    email: 'emily@hackconnect.app',
    avatar_url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Emily',
    bio: 'Product manager and designer. Bridging the gap between business needs and visual design.',
    skills: ['Figma', 'Product Strategy', 'Wireframing', 'Agile'],
    interests: ['EdTech', 'SocialImpact', 'UI/UX', 'Gaming'],
    linkedin_url: 'https://linkedin.com/in/emilywatson-demo',
    github_url: 'https://github.com/emilywatson-demo',
    looking_for: 'collaborator',
    event_id: '11111111-1111-1111-1111-111111111111'
  },
  {
    id: '22222222-2222-2222-2222-222222222205',
    full_name: 'Marcus Vance',
    email: 'marcus@hackconnect.app',
    avatar_url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Marcus',
    bio: 'Senior backend engineer and mentor. Helping teams architect secure systems.',
    skills: ['Node.js', 'GraphQL', 'Kubernetes', 'Redis', 'Python'],
    interests: ['Security', 'AI', 'Cloud Native', 'Robotics'],
    linkedin_url: 'https://linkedin.com/in/marcusvance-demo',
    github_url: 'https://github.com/marcusvance-demo',
    looking_for: 'mentor',
    event_id: '11111111-1111-1111-1111-111111111111'
  }
];

const SEED_EVENTS: Event[] = [
  {
    id: '11111111-1111-1111-1111-111111111111',
    name: 'HackConnect Demo — 2024',
    description: 'The ultimate networking event and hackathon for tech enthusiasts and developers to connect and build awesome projects.',
    location: 'Innovation Hub, Hall B',
    start_date: new Date().toISOString(),
    end_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    is_active: true
  }
];

const SEED_CONNECTIONS: Connection[] = [
  {
    id: '33333333-3333-3333-3333-333333333301',
    user_a: '22222222-2222-2222-2222-222222222201', // Alex
    user_b: '22222222-2222-2222-2222-222222222202', // Sarah
    event_id: '11111111-1111-1111-1111-111111111111'
  },
  {
    id: '33333333-3333-3333-3333-333333333302',
    user_a: '22222222-2222-2222-2222-222222222202', // Sarah
    user_b: '22222222-2222-2222-2222-222222222205', // Marcus
    event_id: '11111111-1111-1111-1111-111111111111'
  }
];

const SEED_MESSAGES: Message[] = [
  {
    id: 'msg1',
    connection_id: '33333333-3333-3333-3333-333333333301',
    sender_id: '22222222-2222-2222-2222-222222222201',
    content: 'Hey Sarah! Saw your project idea about fine-tuning LLMs for clinical trials. I can build the React interface!',
    is_read: true,
    created_at: new Date(Date.now() - 60 * 60 * 1000).toISOString()
  },
  {
    id: 'msg2',
    connection_id: '33333333-3333-3333-3333-333333333301',
    sender_id: '22222222-2222-2222-2222-222222222202',
    content: 'Oh wow, that is exactly what I need! I have a FastAPI endpoint ready but the layout needs some UX love. Want to meet up?',
    is_read: true,
    created_at: new Date(Date.now() - 50 * 60 * 1000).toISOString()
  },
  {
    id: 'msg3',
    connection_id: '33333333-3333-3333-3333-333333333301',
    sender_id: '22222222-2222-2222-2222-222222222201',
    content: 'Definitely! I am sitting in the Networking Zone on Floor 2, near the beanbags.',
    is_read: true,
    created_at: new Date(Date.now() - 45 * 60 * 1000).toISOString()
  },
  {
    id: 'msg4',
    connection_id: '33333333-3333-3333-3333-333333333301',
    sender_id: '22222222-2222-2222-2222-222222222202',
    content: 'Awesome, heading over in 5 mins after this workshop panel wraps up.',
    is_read: false,
    created_at: new Date(Date.now() - 40 * 60 * 1000).toISOString()
  }
];

const SEED_LOCATIONS: LocationStatus[] = [
  {
    id: 'loc1',
    user_id: '22222222-2222-2222-2222-222222222201',
    event_id: '11111111-1111-1111-1111-111111111111',
    zone: 'Networking Zone',
    availability: 'available',
    custom_note: 'Hacking on frontend design. Come say hi!',
    updated_at: new Date(Date.now() - 5 * 60 * 1000).toISOString()
  },
  {
    id: 'loc2',
    user_id: '22222222-2222-2222-2222-222222222202',
    event_id: '11111111-1111-1111-1111-111111111111',
    zone: 'Workshop Room A',
    availability: 'available',
    custom_note: 'Listening to the LLM talk',
    updated_at: new Date(Date.now() - 2 * 60 * 1000).toISOString()
  },
  {
    id: 'loc3',
    user_id: '22222222-2222-2222-2222-222222222203',
    event_id: '11111111-1111-1111-1111-111111111111',
    zone: 'Cafeteria / Food Area',
    availability: 'busy',
    custom_note: 'Grabbing some coffee and pizza',
    updated_at: new Date(Date.now() - 15 * 60 * 1000).toISOString()
  },
  {
    id: 'loc4',
    user_id: '22222222-2222-2222-2222-222222222204',
    event_id: '11111111-1111-1111-1111-111111111111',
    zone: 'Main Hall',
    availability: 'available',
    custom_note: 'Drafting slide designs',
    updated_at: new Date(Date.now() - 8 * 60 * 1000).toISOString()
  },
  {
    id: 'loc5',
    user_id: '22222222-2222-2222-2222-222222222205',
    event_id: '11111111-1111-1111-1111-111111111111',
    zone: 'Hackathon Work Area',
    availability: 'busy',
    custom_note: 'Reviewing systems architecture diagram',
    updated_at: new Date(Date.now() - 20 * 60 * 1000).toISOString()
  }
];

const SEED_REQUESTS: ConnectionRequest[] = [
  {
    id: 'req1',
    sender_id: '22222222-2222-2222-2222-222222222203', // David
    receiver_id: '22222222-2222-2222-2222-222222222201', // Alex
    event_id: '11111111-1111-1111-1111-111111111111',
    status: 'pending',
    message: 'Hey Alex, love your frontend portfolio. Let us team up and build a SaaS product for this hackathon.',
    created_at: new Date(Date.now() - 15 * 60 * 1000).toISOString()
  }
];

const SEED_ANNOUNCEMENTS: Announcement[] = [
  {
    id: 'ann1',
    event_id: '11111111-1111-1111-1111-111111111111',
    title: '🍕 Lunch is Served!',
    content: 'Head over to the Cafeteria. We have hot pizza, wraps, and vegan choices. Mentor check-in starts at 1:30 PM.',
    created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'ann2',
    event_id: '11111111-1111-1111-1111-111111111111',
    title: '🧠 AI Workshop Starting',
    content: 'Workshop "Fine-Tuning LLMs on a Budget" starts in Workshop Room A in 10 minutes. Speakers from Anthropic.',
    created_at: new Date(Date.now() - 10 * 60 * 1000).toISOString()
  }
];

class MockDatabase {
  public getStore<T>(key: string, initial: T[]): T[] {
    const data = localStorage.getItem(key);
    if (!data) {
      localStorage.setItem(key, JSON.stringify(initial));
      return initial;
    }
    return JSON.parse(data);
  }

  public setStore<T>(key: string, data: T[]): void {
    localStorage.setItem(key, JSON.stringify(data));
  }

  getProfiles() { return this.getStore<Profile>('hc_profiles', SEED_PROFILES); }
  setProfiles(data: Profile[]) { this.setStore<Profile>('hc_profiles', data); }

  getEvents() { return this.getStore<Event>('hc_events', SEED_EVENTS); }
  setEvents(data: Event[]) { this.setStore<Event>('hc_events', data); }

  getConnections() { return this.getStore<Connection>('hc_connections', SEED_CONNECTIONS); }
  setConnections(data: Connection[]) { this.setStore<Connection>('hc_connections', data); }

  getMessages() { return this.getStore<Message>('hc_messages', SEED_MESSAGES); }
  setMessages(data: Message[]) { this.setStore<Message>('hc_messages', data); }

  getLocations() { return this.getStore<LocationStatus>('hc_locations', SEED_LOCATIONS); }
  setLocations(data: LocationStatus[]) { this.setStore<LocationStatus>('hc_locations', data); }

  getRequests() { return this.getStore<ConnectionRequest>('hc_requests', SEED_REQUESTS); }
  setRequests(data: ConnectionRequest[]) { this.setStore<ConnectionRequest>('hc_requests', data); }

  getBlocks() { return this.getStore<{ blocker_id: string; blocked_id: string }>('hc_blocks', []); }
  setBlocks(data: { blocker_id: string; blocked_id: string }[]) { this.setStore<{ blocker_id: string; blocked_id: string }>('hc_blocks', data); }

  getSuggestions() { return this.getStore<AiSuggestion>('hc_suggestions', []); }
  setSuggestions(data: AiSuggestion[]) { this.setStore<AiSuggestion>('hc_suggestions', data); }

  getReports() { return this.getStore<Report>('hc_reports', []); }
  setReports(data: Report[]) { this.setStore<Report>('hc_reports', data); }

  getAnnouncements() { return this.getStore<Announcement>('hc_announcements', SEED_ANNOUNCEMENTS); }
  setAnnouncements(data: Announcement[]) { this.setStore<Announcement>('hc_announcements', data); }

  // Auth helper simulation
  getCurrentUser() {
    const userStr = localStorage.getItem('hc_current_user');
    return userStr ? JSON.parse(userStr) : null;
  }
  setCurrentUser(user: any) {
    if (user) {
      localStorage.setItem('hc_current_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('hc_current_user');
    }
  }
}

export const mockDb = new MockDatabase();
