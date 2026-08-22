import { createClient } from 'npm:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Request-scoped client: forwards the caller's own JWT, so every query it
// makes is still subject to RLS exactly as if the browser had made it. Use
// this to confirm *who* is calling and that they're only touching their own
// rows — never trust a client-supplied id without checking it against this.
export function createUserClient(req: Request) {
  const authHeader = req.headers.get('Authorization') ?? '';
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  });
}

// Service-role client: bypasses RLS entirely. Only ever used for the exact
// writes each function needs (payment status, verification status, sending
// the notification email) — never to hand back arbitrary data to the client.
export function createAdminClient() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
}

export async function getCallerProfile(req: Request) {
  const userClient = createUserClient(req);
  const { data: userData, error: userError } = await userClient.auth.getUser();
  if (userError || !userData.user) return { profile: null, error: 'Not authenticated' };

  const { data: profile, error: profileError } = await userClient
    .from('profiles')
    .select('*')
    .eq('auth_user_id', userData.user.id)
    .maybeSingle();

  if (profileError || !profile) return { profile: null, error: 'Profile not found' };
  return { profile, error: null };
}
