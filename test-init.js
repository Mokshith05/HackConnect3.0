import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envContent = fs.readFileSync('.env', 'utf8');
const lines = envContent.split('\n');
let supabaseUrl = '';
let supabaseKey = '';

for (const line of lines) {
  if (line.startsWith('VITE_SUPABASE_URL=')) {
    supabaseUrl = line.split('=')[1].trim();
  }
  if (line.startsWith('VITE_SUPABASE_ANON_KEY=')) {
    supabaseKey = line.split('=')[1].trim();
  }
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testInitWithUser() {
  console.log("Signing in as alex@hackconnect.app...");
  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email: 'alex@hackconnect.app',
    password: 'Password123!'
  });

  if (signInError) {
    console.error("Sign in failed:", signInError);
    return;
  }
  console.log("Sign in successful!");

  console.log("Starting initialize test...");
  try {
    const { data: { session }, error: sessionErr } = await supabase.auth.getSession();
    if (sessionErr) throw sessionErr;
    
    console.log("Session fetched successfully. Session is:", session ? "Present" : "Null");

    if (session) {
      const user = session.user;
      console.log("Fetching profile for user:", user.id);
      
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
        
      if (error) {
        console.error("Profile fetch error:", error);
      } else {
        console.log("Profile fetched successfully:", profile);
      }
    }
    console.log("Initialize sequence finished successfully!");
  } catch (err) {
    console.error("Initialize sequence threw error:", err);
  }
}

testInitWithUser();
