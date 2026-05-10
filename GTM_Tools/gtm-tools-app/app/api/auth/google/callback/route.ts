import { NextResponse } from "next/server";
import { generateToken } from "@/lib/auth";
import { getUserByEmail, createUser } from "@/lib/db";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");

    if (!code) {
      return NextResponse.json({ error: "Missing code" }, { status: 400 });
    }

    // 1️⃣ Exchange code for token
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        code,
        client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        redirect_uri: process.env.GOOGLE_REDIRECT_URI!,
        grant_type: "authorization_code",
      }),
    });

    const tokenData = await tokenRes.json();

    if (!tokenRes.ok) {
      return NextResponse.json(
        { error: "Token exchange failed", details: tokenData },
        { status: 401 }
      );
    }

    const accessToken = tokenData.access_token;
    const refreshToken = tokenData.refresh_token;

    // Google returns expires_in (seconds)
    const expiresIn = tokenData.expires_in || 3600;
    const accessTokenExpiry = Date.now() + expiresIn * 1000;

    // 2️⃣ Fetch Google user info
    const userRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const googleUser = await userRes.json();

    if (!userRes.ok) {
      return NextResponse.json(
        { error: "Failed to fetch user info", details: googleUser },
        { status: 401 }
      );
    }

    const googleId = googleUser.id;
    const email = googleUser.email;
    const name = googleUser.name;
    const picture = googleUser.picture;

    if (!email) {
      return NextResponse.json(
        { error: "Google account email not found" },
        { status: 400 }
      );
    }

    // 3️⃣ Save/update user
    let user = await getUserByEmail(email);

    if (!user) {
      user = await createUser({
        name,
        email,
        picture,
        googleId,
      });
    }

    // 4️⃣ Generate JWT token
    const jwtToken = generateToken(user);

    // 5️⃣ Redirect + set cookies
    const appUrl = process.env.APP_URL || url.origin;
    const isProd = process.env.NODE_ENV === "production";
    const response = NextResponse.redirect(`${appUrl}/dashboard`);

    response.cookies.set("auth_token", jwtToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60,
    });

    // store google access token
    response.cookies.set("google_access_token", accessToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: "lax",
      path: "/",
      maxAge: expiresIn, // seconds
    });

    // store access token expiry (timestamp)
    response.cookies.set("google_access_token_expiry", accessTokenExpiry.toString(), {
      httpOnly: true,
      secure: isProd,
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60,
    });

    // store refresh token if provided
    if (refreshToken) {
      response.cookies.set("google_refresh_token", refreshToken, {
        httpOnly: true,
        secure: isProd,
        sameSite: "lax",
        path: "/",
      });

      
    }

    return response;
  } catch (error) {
    console.error("Google callback error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}



// import { NextResponse } from "next/server";
// import { generateToken } from "@/lib/auth";
// import { getUserByEmail, createUser } from "@/lib/db";

// export async function GET(req: Request) {
//   try {
//     const url = new URL(req.url);
//     const code = url.searchParams.get("code");

//     if (!code) {
//       return NextResponse.json({ error: "Missing code" }, { status: 400 });
//     }

//     // 1️⃣ Exchange code for token
//     const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
//       method: "POST",
//       headers: {
//         "Content-Type": "application/x-www-form-urlencoded",
//       },
//       body: new URLSearchParams({
//         code,
//         client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!,
//         client_secret: process.env.GOOGLE_CLIENT_SECRET!,
//         redirect_uri: process.env.GOOGLE_REDIRECT_URI!,
//         grant_type: "authorization_code",
//       }),
//     });

//     const tokenData = await tokenRes.json();

//     if (!tokenRes.ok) {
//       return NextResponse.json(
//         { error: "Token exchange failed", details: tokenData },
//         { status: 401 }
//       );
//     }

//     const accessToken = tokenData.access_token;
//     const refreshToken = tokenData.refresh_token;

//     // 2️⃣ Fetch Google user info
//     const userRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
//       headers: {
//         Authorization: `Bearer ${accessToken}`,
//       },
//     });

//     const googleUser = await userRes.json();

//     if (!userRes.ok) {
//       return NextResponse.json(
//         { error: "Failed to fetch user info", details: googleUser },
//         { status: 401 }
//       );
//     }

//     // googleUser contains: id, email, name, picture
//     const googleId = googleUser.id;
//     const email = googleUser.email;
//     const name = googleUser.name;
//     const picture = googleUser.picture;

//     if (!email) {
//       return NextResponse.json(
//         { error: "Google account email not found" },
//         { status: 400 }
//       );
//     }

//     // 3️⃣ Save/update user in .data/users.json
//     let user = getUserByEmail(email);

//     if (!user) {
//       user = createUser({
//         name,
//         email,
//         picture,
//         googleId,
//       });
//     }

//     // 4️⃣ Generate JWT token
//     const jwtToken = generateToken(user);

//     // 5️⃣ Redirect to dashboard + set cookies
//     const response = NextResponse.redirect("http://localhost:3000/dashboard");

//     // store jwt token (main login token)
//     response.cookies.set("auth_token", jwtToken, {
//       httpOnly: true,
//       secure: false,
//       sameSite: "lax",
//       path: "/",
//       maxAge: 7 * 24 * 60 * 60,
//     });

//     // store google access token (needed for GTM API calls)
//     response.cookies.set("google_access_token", accessToken, {
//       httpOnly: true,
//       secure: false,
//       sameSite: "lax",
//       path: "/",
//       maxAge: 60 * 60,
//     });

//     // store refresh token (optional)
//     if (refreshToken) {
//       response.cookies.set("google_refresh_token", refreshToken, {
//         httpOnly: true,
//         secure: false,
//         sameSite: "lax",
//         path: "/",
//       });
//     }

//     return response;
//   } catch (error) {
//     console.error("Google callback error:", error);
//     return NextResponse.json({ error: "Server error" }, { status: 500 });
//   }
// }