export interface Profile {
  id: string;
  full_name: string;
  email: string;
  avatar_url?: string;
  bio?: string;
  skills: string[];
  interests: string[];
  linkedin_url?: string;
  github_url?: string;
  looking_for?: 'teammate' | 'mentor' | 'collaborator' | 'networking';
  event_id?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Event {
  id: string;
  name: string;
  description?: string;
  location?: string;
  start_date?: string;
  end_date?: string;
  is_active: boolean;
  created_by?: string;
  created_at?: string;
}

export interface EventParticipant {
  id: string;
  event_id: string;
  user_id: string;
  joined_at?: string;
}

export interface ConnectionRequest {
  id: string;
  sender_id: string;
  receiver_id: string;
  event_id: string;
  status: 'pending' | 'accepted' | 'rejected';
  message?: string;
  created_at?: string;
  updated_at?: string;
  sender?: Profile;
  receiver?: Profile;
}

export interface Connection {
  id: string;
  user_a: string;
  user_b: string;
  event_id: string;
  connected_at?: string;
  other_user?: Profile; // Populated client-side for ease of UI
}

export interface Message {
  id: string;
  connection_id: string;
  sender_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
}

export interface BlockedUser {
  id: string;
  blocker_id: string;
  blocked_id: string;
  created_at?: string;
}

export interface LocationStatus {
  id: string;
  user_id: string;
  event_id: string;
  zone: string;
  availability: 'available' | 'busy' | 'offline';
  custom_note?: string;
  updated_at: string;
}

export interface AiSuggestion {
  id: string;
  user_id: string;
  suggested_user_id: string;
  event_id: string;
  compatibility_score: number;
  reason: string;
  icebreaker: string;
  generated_at?: string;
  suggested_profile?: Profile;
}

export interface Report {
  id: string;
  reporter_id?: string;
  reported_user_id: string;
  reason: string;
  details?: string;
  status: 'pending' | 'reviewed' | 'dismissed';
  created_at?: string;
  reporter?: Profile;
  reported?: Profile;
}

export interface Announcement {
  id: string;
  event_id: string;
  title: string;
  content: string;
  created_at: string;
}
