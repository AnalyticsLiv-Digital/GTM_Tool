import { NextResponse } from "next/server";
import { getValidGoogleAccessToken } from "@/lib/googleAuth";

export async function GET() {
  try {
    const accessToken = await getValidGoogleAccessToken();

    if (!accessToken) {
      return NextResponse.json(
        { error: "Missing Google access token" },
        { status: 401 }
      );
    }

    const apiUrl = `https://tagmanager.googleapis.com/tagmanager/v2/accounts`;

    const res = await fetch(apiUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json(
        { error: "Failed to fetch accounts", details: data },
        { status: res.status }
      );
    }

    return NextResponse.json({ account: data.account || [] });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (err: any) {
    console.error("Accounts GET Error:", err);

    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
// import { NextResponse } from "next/server";
// // import { cookies } from "next/headers";
// import { getValidGoogleAccessToken } from "@/lib/googleAuth";


// export async function GET() {
//   try {
//     // const cookieStore = cookies();
//     // const accessToken = (await cookieStore).get("google_access_token")?.value;
//     const accessToken = await getValidGoogleAccessToken();


//     if (!accessToken) {
//       return NextResponse.json(
//         { error: "Access token missing. Please login again." },
//         { status: 401 }
//       );
//     }
//     console.log("Access token found:", accessToken);
//     const gtmRes = await fetch(
//       "https://tagmanager.googleapis.com/tagmanager/v2/accounts",
//       {
//         headers: {
//           Authorization: `Bearer ${accessToken}`,
//         },
//       }
//     );

//     const data = await gtmRes.json();
//     console.log("GTM API response:", data);
//     return NextResponse.json(data, { status: gtmRes.status });
//   } catch (err) {
//     console.error(err);
//     return NextResponse.json(
//       { error: "Internal server error" },
//       { status: 500 }
//     );
//   }
// }


