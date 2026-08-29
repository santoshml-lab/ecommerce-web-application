import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = "https://rjuyxzhtrjljgyvujjlu.supabase.co";

const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJqdXl4emh0cmpsamd5dnVqamx1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYxODgwODYsImV4cCI6MjEwMTc2NDA4Nn0.w3O6Fbi-Lbe_YMsfEn0UqgmwfuFG3lEiRumPI0ee2NE";

export const supabase = createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
);
