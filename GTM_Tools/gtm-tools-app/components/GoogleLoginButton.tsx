"use client";

export default function GoogleOAuthLoginButton() {
  const handleLogin = () => {
    window.location.href = "/api/auth/google/login";
  };

  return (
    <button
      onClick={handleLogin}
      type="button"
      className="group w-full inline-flex items-center justify-center gap-2.5 px-4 py-2.5 rounded-lg bg-[color:var(--bg-elev-2)] hover:bg-[color:var(--fg)] text-[color:var(--fg)] hover:text-[color:var(--bg)] border border-[color:var(--border-strong)] hover:border-[color:var(--fg)] transition-colors duration-200"
    >
      <GoogleG />
      <span className="text-[14px] font-medium">Continue with Google</span>
    </button>
  );
}

function GoogleG() {
  return (
    <svg width="16" height="16" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <path
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z"
        fill="#4285F4"
      />
      <path
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.95v2.32A9 9 0 0 0 9 18z"
        fill="#34A853"
      />
      <path
        d="M3.97 10.72A5.41 5.41 0 0 1 3.68 9c0-.6.1-1.18.29-1.72V4.96H.95A9 9 0 0 0 0 9c0 1.45.35 2.83.95 4.04l3.02-2.32z"
        fill="#FBBC05"
      />
      <path
        d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58A9 9 0 0 0 9 0 9 9 0 0 0 .95 4.96l3.02 2.32C4.68 5.16 6.66 3.58 9 3.58z"
        fill="#EA4335"
      />
    </svg>
  );
}
