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

  console.log(`signInAction: Login success for ${email}, redirecting to dashboard...`);
  
  // Revalidate everything to ensure the session is fresh
  // We use redirect outside the try-catch in the calling code normally,
  // but here we are the end of the action.
  redirect("/dashboard");
}
