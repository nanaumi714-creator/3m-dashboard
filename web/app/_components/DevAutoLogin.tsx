"use client";

import { useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function DevAutoLogin() {
    const router = useRouter();
    const shouldBypass = process.env.NEXT_PUBLIC_DISABLE_AUTH === "true";

    useEffect(() => {
        if (!shouldBypass) return;

        const autoLogin = async () => {
            const { data: { session } } = await supabase.auth.getSession();

            if (!session) {
                console.log("DevAutoLogin: Attempting auto-login...");
                const { error } = await supabase.auth.signInWithPassword({
                    email: "dev@example.com",
                    password: "password",
                });

                if (error) {
                    console.error("DevAutoLogin: Failed to login", error);
                } else {
                    console.log("DevAutoLogin: Successfully logged in as dev@example.com");
                    router.refresh();
                }
            }
        };

        autoLogin();
    }, [shouldBypass, router]);

    return null;
}
