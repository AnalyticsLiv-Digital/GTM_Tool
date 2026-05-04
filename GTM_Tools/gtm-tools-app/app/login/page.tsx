"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Link from "next/link";
import LoginForm from "@/components/LoginForm";
import GoogleLoginButton from "@/components/GoogleLoginButton";

export default function LoginPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.push("/dashboard");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-linear-to-br from-slate-50 via-white to-indigo-50 flex items-center justify-center px-4">
        <div className="bg-white border border-slate-200 rounded-3xl shadow-xl px-10 py-10 text-center max-w-sm w-full">
          <div className="w-14 h-14 mx-auto rounded-2xl bg gradient-to-r from-indigo-600 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
            <span className="text-white font-extrabold text-xl">GTM</span>
          </div>

          <div className="mt-6 inline-block animate-spin rounded-full h-10 w-10 border-4 border-indigo-200 border-t-indigo-600"></div>

          {/* <p className="text-slate-600 font-semibold mt-4 text-sm">
            Loading your workspace...
          </p> */}
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-linear-to-br from-slate-50 via-white to-indigo-50 flex items-center justify-center py-14 px-4 sm:px-6 lg:px-8 overflow-hidden">
      {/* BACKGROUND BLOBS */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-48 -right-48 w-105 h-105 bg-linear-to-br from-indigo-200 to-purple-200 rounded-full blur-3xl opacity-30"></div>
        <div className="absolute -bottom-52 -left-52 w-112.5 h-112.5 bg-linear-to-br from-blue-200 to-indigo-200 rounded-full blur-3xl opacity-30"></div>
        <div className="absolute top-1/2 left-1/2 w-125 h-125 bg-linear-to-br from-purple-200 to-pink-200 rounded-full blur-3xl opacity-20 -translate-x-1/2 -translate-y-1/2"></div>
      </div>

      {/* MAIN CARD */}
      <div className="relative z-10 w-full max-w-md">
        {/* LOGO + TITLE */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-linear-to-br from-indigo-600 to-purple-600 shadow-xl shadow-indigo-500/30 mb-6 ring-4 ring-white">
            <span className="text-white font-extrabold text-2xl tracking-tight">
              GTM
            </span>
          </div>

          <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">
            GTM Tools
          </h1>

          <p className="text-slate-600 mt-2 text-base">
            Sign in to manage your Google Tag Manager workspace
          </p>
        </div>

        {/* LOGIN BOX */}
        <div className="bg-white/80 backdrop-blur-xl border border-slate-200 rounded-3xl shadow-xl p-8">
          {/* GOOGLE LOGIN */}
          <div className="mb-7">
            <GoogleLoginButton />
          </div>

          {/* DIVIDER */}
          <div className="flex items-center gap-4 mb-7">
            <div className="flex-1 border-t border-slate-200"></div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
              or continue with
            </span>
            <div className="flex-1 border-t border-slate-200"></div>
          </div>

          {/* LOGIN FORM */}
          <LoginForm />

          {/* SIGNUP LINK */}
          <p className="text-center mt-8 text-sm text-slate-600">
            Don’t have an account?{" "}
            <Link
              href="/signup"
              className="font-bold text-indigo-600 hover:text-indigo-700 transition hover:underline"
            >
              Create account
            </Link>
          </p>
        </div>

        {/* BACK HOME */}
        <div className="text-center mt-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900 transition group"
          >
            <span className="group-hover:-translate-x-1 transition-transform">
              ←
            </span>
            Back to Home
          </Link>
        </div>

        {/* FOOTER TEXT */}
        <p className="text-center text-xs text-slate-500 mt-10 px-6 leading-relaxed">
          Secure authentication powered by Google OAuth. <br />
          By signing in, you agree to our Terms & Privacy Policy.
        </p>
      </div>
    </div>
  );
}

// 'use client';

// import { useAuth } from '@/contexts/AuthContext';
// import { useRouter } from 'next/navigation';
// import { useEffect } from 'react';
// import Link from 'next/link';
// import LoginForm from '@/components/LoginForm';
// import GoogleLoginButton from '@/components/GoogleLoginButton';

// export default function LoginPage() {
//   const { user, loading } = useAuth();
//   const router = useRouter();

//   useEffect(() => {
//     if (!loading && user) {
//       router.push('/dashboard');
//     }
//   }, [user, loading, router]);

//   if (loading) {
//     return (
//       <div className="min-h-screen bg gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex items-center justify-center">
//         <div className="text-center">
//           <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-purple-200 border-t-purple-600 mb-4"></div>
//           <p className="text-gray-600 font-medium">Loading...</p>
//         </div>
//       </div>
//     );
//   }

//   return (
//     <div className="min-h-screen bg gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
//       <div className="absolute inset-0 overflow-hidden pointer-events-none">
//         <div className="absolute -top-40 -right-40 w-80 h-80 bg gradient-to-br from-purple-200 to-blue-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
//         <div className="absolute -bottom-40 -left-40 w-80 h-80 bg gradient-to-br from-blue-200 to-purple-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
//       </div>

//       <div className="w-full max-w-md relative z-10">
//         <div className="text-center mb-10">
//           <div className="inline-flex items-center justify-center w-16 h-16 bg gradient-to-br from-purple-600 to-blue-600 rounded-2xl mb-6 shadow-2xl transform hover:scale-110 transition-transform duration-300">
//             <span className="text-white font-bold text-2xl">G</span>
//           </div>
//           <h1 className="text-4xl font-bold text-gray-900 mt-4 mb-2">GTM Tools</h1>
//           <p className="text-gray-600 text-lg">Welcome back to your workspace</p>
//         </div>

//         <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 backdrop-blur-xl p-8 animation-slideUp">
//           <div className="mb-8">
//             <GoogleLoginButton />
//           </div>

//           <div className="flex items-center mb-8">
//             <div className="flex-1 border-t border-gray-200"></div>
//             <span className="px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
//               or
//             </span>
//             <div className="flex-1 border-t border-gray-200"></div>
//           </div>

//           <LoginForm />

//           <p className="text-center mt-8 text-sm text-gray-600">
//             Dont have an account?{' '}
//             <Link
//               href="/signup"
//               className="font-semibold text-purple-600 hover:text-purple-700 transition-colors duration-200 hover:underline"
//             >
//               Sign up
//             </Link>
//           </p>
//         </div>

//         <div className="text-center mt-8">
//           <Link
//             href="/"
//             className="text-sm text-gray-600 hover:text-gray-900 transition-colors font-semibold inline-flex items-center space-x-1 group"
//           >
//             <span className="transform group-hover:-translate-x-1 transition-transform">←</span>
//             <span>Back to Home</span>
//           </Link>
//         </div>

//         <p className="text-center text-xs text-gray-500 mt-10 px-4">
//           By signing in, you agree to our Terms of Service and Privacy Policy
//         </p>
//       </div>
//     </div>
//   );
// }