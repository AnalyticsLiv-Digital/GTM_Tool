'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Link from 'next/link';
import SignupForm from '@/components/SignupForm';
import GoogleLoginButton from '@/components/GoogleLoginButton';

export default function SignupPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.push('/dashboard');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-purple-200 border-t-purple-600 mb-4"></div>
          <p className="text-gray-600 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      {/* Decorative Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg gradient-to-br from-purple-200 to-blue-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg gradient-to-br from-blue-200 to-purple-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Header Section */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 bg gradient-to-br from-purple-600 to-blue-600 rounded-2xl mb-6 shadow-2xl transform hover:scale-110 transition-transform duration-300">
            <span className="text-white font-bold text-2xl">G</span>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mt-4 mb-2">GTM Tools</h1>
          <p className="text-gray-600 text-lg">Create your account to get started</p>
        </div>

        {/* Card Container */}
        <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 backdrop-blur-xl p-8 animation-slideUp">
          {/* Google Sign-Up */}
          <div className="mb-8">
            <GoogleLoginButton />
          </div>

          {/* Divider */}
          <div className="flex items-center mb-8">
            <div className="flex-1 border-t border-gray-200"></div>
            <span className="px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">or</span>
            <div className="flex-1 border-t border-gray-200"></div>
          </div>

          {/* Email/Password Form */}
          <SignupForm />

          {/* Sign In Link */}
          <p className="text-center mt-8 text-sm text-gray-600">
            Already have an account?{' '}
            <Link 
              href="/login" 
              className="font-semibold text-purple-600 hover:text-purple-700 transition-colors duration-200 hover:underline"
            >
              Sign in
            </Link>
          </p>
        </div>

        {/* Footer */}
        <div className="text-center mt-8">
          <Link 
            href="/" 
            className="text-sm text-gray-600 hover:text-gray-900 transition-colors font-semibold inline-flex items-center space-x-1 group"
          >
            <span className="transform group-hover:-translate-x-1 transition-transform">←</span>
            <span>Back to Home</span>
          </Link>
        </div>

        {/* Help Text */}
        <p className="text-center text-xs text-gray-500 mt-10 px-4">
          By signing up, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  );
}
