import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const supabaseUrl = process.env.VITE_SUPABASE_URL;
// Use the secret key for admin functionality (bypassing RLS and email confirmation)
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("❌ Missing Supabase configuration in .env!");
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Endpoint to handle registration
app.post('/api/auth/register', async (req, res) => {
  const { email, password, fullName } = req.body;
  if (!email || !password || !fullName) {
    return res.status(400).json({ error: 'Missing email, password, or fullName' });
  }

  try {
    console.log(`Registering user: ${email}`);
    // 1. Create the user using Supabase Admin API with auto-confirmed email
    const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName }
    });

    if (createError) {
      console.error("Sign up error:", createError.message);
      return res.status(400).json({ error: createError.message });
    }

    const user = userData.user;

    // 2. Create profile row in profiles table (bypassing RLS)
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: user.id,
        full_name: fullName,
        email: email,
        skills: [],
        interests: []
      });

    if (profileError) {
      console.error("Profile creation error, cleaning up user:", profileError.message);
      // Clean up the created user if the profile database write fails to keep DB consistent
      await supabaseAdmin.auth.admin.deleteUser(user.id);
      return res.status(400).json({ error: 'Failed to create user profile: ' + profileError.message });
    }

    // 3. Authenticate to get a valid session for the frontend
    // Note: We use a separate temporary client to avoid polluting the global admin client's authentication state.
    const tempAuthClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    const { data: sessionData, error: signInError } = await tempAuthClient.auth.signInWithPassword({
      email,
      password
    });

    if (signInError) {
      console.error("Authentication after registration failed:", signInError.message);
      return res.status(400).json({ error: 'User registered but sign-in failed: ' + signInError.message });
    }

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    console.log(`Registration successful for: ${email}`);
    res.status(201).json({
      user,
      session: sessionData.session,
      profile
    });

  } catch (error) {
    console.error("Registration endpoint catch error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Endpoint to handle login
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Missing email or password' });
  }

  try {
    console.log(`Logging in user: ${email}`);
    
    // Use a separate temporary client to perform auth and prevent token leakage on global admin client
    const tempAuthClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    const { data: sessionData, error: authError } = await tempAuthClient.auth.signInWithPassword({
      email,
      password
    });

    if (authError) {
      console.error("Authentication failed:", authError.message);
      return res.status(400).json({ error: authError.message });
    }

    // Fetch user profile
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', sessionData.user.id)
      .single();

    let userProfile = profile;
    if (profileError || !profile) {
      console.warn(`Profile not found for user ${sessionData.user.id}, creating a default one.`);
      const { data: newProfile, error: createProfileError } = await supabaseAdmin
        .from('profiles')
        .insert({
          id: sessionData.user.id,
          full_name: sessionData.user.user_metadata?.full_name || email.split('@')[0],
          email: email,
          skills: [],
          interests: []
        })
        .select()
        .single();
      
      if (!createProfileError) {
        userProfile = newProfile;
      }
    }

    console.log(`Login successful for: ${email}`);
    res.status(200).json({
      user: sessionData.user,
      session: sessionData.session,
      profile: userProfile
    });

  } catch (error) {
    console.error("Login endpoint catch error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Endpoint to handle connection request responses (accept/decline)
app.post('/api/networking/respond', async (req, res) => {
  const { requestId, status, userId, eventId } = req.body;
  if (!requestId || !status || !userId || !eventId) {
    return res.status(400).json({ error: 'Missing required parameters' });
  }

  try {
    console.log(`Responding to request ${requestId}: status=${status}, user=${userId}`);
    
    if (status === 'accepted') {
      // 1. Fetch the request details
      const { data: request, error: fetchErr } = await supabaseAdmin
        .from('connection_requests')
        .select('*')
        .eq('id', requestId)
        .single();

      if (fetchErr || !request) {
        console.error("Failed to fetch connection request:", fetchErr?.message || "Not found");
        return res.status(404).json({ error: 'Connection request not found' });
      }

      // 2. Insert mutual connection row (bypassing RLS with admin client)
      const { error: connErr } = await supabaseAdmin
        .from('connections')
        .insert([{
          user_a: request.sender_id,
          user_b: request.receiver_id,
          event_id: eventId
        }]);

      if (connErr) {
        // Ignore unique constraint violation (code 23505) in case they are already connected
        if (connErr.code !== '23505') {
          console.error("Failed to insert connection row:", connErr.message);
          return res.status(400).json({ error: 'Failed to create connection: ' + connErr.message });
        }
      }
    }

    // 3. Delete request row (bypassing RLS with admin client)
    const { error: delErr } = await supabaseAdmin
      .from('connection_requests')
      .delete()
      .eq('id', requestId);

    if (delErr) {
      console.error("Failed to delete connection request row:", delErr.message);
      return res.status(400).json({ error: 'Failed to clean up request: ' + delErr.message });
    }

    console.log(`Request ${requestId} successfully processed as ${status}`);
    res.status(200).json({ success: true });

  } catch (error) {
    console.error("Respond request catch error:", error);
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 HackConnect Auth server running on port ${PORT}`);
});
