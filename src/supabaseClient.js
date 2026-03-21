import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://cxgdcadavykefnpzjcuk.supabase.co";
const supabaseAnonKey = "sb_publishable_SwP95IDavUGLKADXLMosJA_vwdsTV0b";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);