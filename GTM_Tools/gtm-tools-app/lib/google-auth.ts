
import { getServerSession } from "next-auth";

export async function getGoogleAccessTokenForCurrentUser(): Promise<string> {
  const session = await getServerSession();

  if (!session?.user) {
    throw new Error("Please sign in with Google.");
  }

  const accessToken = (
    session as typeof session & { accessToken?: string }
  ).accessToken;

  if (!accessToken) {
    throw new Error(
      "No Google access token was found in the session. Connect this helper to your existing OAuth token storage and refresh flow."
    );
  }

  return accessToken;
}