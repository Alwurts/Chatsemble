import { headers } from "next/headers";

import { getAuth } from "@/auth";
import { LoggedInCard } from "@/components/auth/logged-in-card";
import LoginForm from "./_components/login-form";

export default async function LoginPage() {
	const auth = getAuth();
	const session = await auth.api.getSession({
		headers: await headers(),
	});

	if (session?.user) {
		return <LoggedInCard email={session.user.email} />;
	}

	return <LoginForm />;
}

export const dynamic = "force-dynamic";
