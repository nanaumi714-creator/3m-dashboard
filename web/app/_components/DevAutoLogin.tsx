"use client";

import { useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function DevAutoLogin() {
    const router = useRouter();
    const shouldBypass =
        process.env.NODE_ENV === "development" &&
        process.env.NEXT_PUBLIC_DISABLE_AUTH === "true";
    const email = process.env.NEXT_PUBLIC_DEV_LOGIN_EMAIL || "dev@example.com";
    const password = process.env.NEXT_PUBLIC_DEV_LOGIN_PASSWORD || "password";
    const allowAutoSignup = process.env.NEXT_PUBLIC_DEV_AUTO_SIGNUP !== "false";

    useEffect(() => {
        if (!shouldBypass) return;

        const autoLogin = async () => {
            const { data: { session } } = await supabase.auth.getSession();

            if (!session) {
                console.log("DevAutoLogin: Attempting auto-login...");
                const { error } = await supabase.auth.signInWithPassword({ email, password });

                if (error && allowAutoSignup) {
                    const { error: signUpError } = await supabase.auth.signUp({ email, password });
                    if (!signUpError) {
                        const { error: retryError } = await supabase.auth.signInWithPassword({ email, password });
                        if (retryError) {
                            console.error("DevAutoLogin: Failed after auto-signup", retryError);
                            return;
                        }
                        console.log(`DevAutoLogin: Auto-signed up and logged in as ${email}`);
                        router.refresh();
                        return;
                    }
                }

                if (error) {
                    console.error("DevAutoLogin: Failed to login", error);
                } else {
                    console.log(`DevAutoLogin: Successfully logged in as ${email}`);
                    router.refresh();
                }
            }
        };

        autoLogin();
    }, [shouldBypass, email, password, allowAutoSignup, router]);

    return null;
}
