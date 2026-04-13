"use server"

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export async function signInAction(prevState: any, formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const cookieStore = await cookies();

  console.log(`signInAction: Attempting login for ${email}...`);

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // This is expected when calling from Server Actions during a redirect
          }
        },
      },
    }
  );

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    console.warn(`signInAction: Login failed for ${email}: ${error.message}`);
    return { error: error.message };
  }

  console.log(`signInAction: Login success for ${email}, checking role...`);
  
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("role")
    .eq("user_id", (await supabase.auth.getUser()).data.user?.id)
    .single();

  const role = profile?.role || "doctor";
  console.log(`signInAction: User role is ${role}, redirecting...`);

  // Return success to let the client handle hard redirect
  return { success: true };
}
