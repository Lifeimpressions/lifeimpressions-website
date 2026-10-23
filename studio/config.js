// Fill these values from Supabase: Project Settings > API
// The anon (public) key is designed to be visible in the app. Row-level security protects the data.
// NEVER put the service_role key or the database password in this file.
window.APP_CONFIG = {
  SUPABASE_URL: 'https://omluwmhlrvgxlqjflasm.supabase.co',
  SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9tbHV3bWhscnZneGxxamZsYXNtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA1OTI5ODAsImV4cCI6MjEwNjE2ODk4MH0.Pm-ZnvO_t76laQ8v4DqAU5L-qsaV-lyXYwGH7kQt_3s',

  // Public key for daily push reminders. Safe to be public — it's the whole point of a VAPID
  // public key. Already generated for you; the matching private key goes into Supabase as a
  // secret (see wix/DASHBOARD_SETUP.md), never here.
  VAPID_PUBLIC_KEY: 'BD41G-jsRWLiYbaJwpwvHlJSclgxbL7j5IYd__tvRPjM5wSFpTLrRfIk7-xHQa7cZqnG2Ua8lRjQ_UNbhpAwtk0'
};
