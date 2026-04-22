import { NextResponse } from "next/server";

export async function GET() {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI!;

  const scope = encodeURIComponent(
    [
      "openid",
      "email",
      "profile",
      "https://www.googleapis.com/auth/tagmanager.edit.containers",
      "https://www.googleapis.com/auth/tagmanager.delete.containers"
    ].join(" ")
  );

  const authUrl =
    `https://accounts.google.com/o/oauth2/v2/auth?` +
    `client_id=${clientId}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&response_type=code` +
    `&scope=${scope}` +
    `&access_type=offline` +
    `&prompt=consent` +
    `&include_granted_scopes=true`;
  return NextResponse.redirect(authUrl);
}

// import { NextResponse } from "next/server";

// export async function GET() {
//   const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!;
//   const redirectUri = process.env.GOOGLE_REDIRECT_URI!;

//   const scope = encodeURIComponent(
//     [
//       "openid",
//       "email",
//       "profile",
//       "https://www.googleapis.com/auth/tagmanager.readonly",
//     ].join(" ")
//   );

//   const authUrl =
//     `https://accounts.google.com/o/oauth2/v2/auth?` +
//     `client_id=${clientId}` +
//     `&redirect_uri=${encodeURIComponent(redirectUri)}` +
//     `&response_type=code` +
//     `&scope=${scope}` +
//     `&access_type=offline` +
//     `&prompt=consent`;

//   return NextResponse.redirect(authUrl);
// }
