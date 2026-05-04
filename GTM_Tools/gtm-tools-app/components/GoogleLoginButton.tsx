"use client";

export default function GoogleOAuthLoginButton() {
  const handleLogin = () => {
    window.location.href = "/api/auth/google/login";
  };

  return (
    <button
      onClick={handleLogin}
      className="px-6 py-3 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700"
    >
      Login with Google 
    </button>
  );
}