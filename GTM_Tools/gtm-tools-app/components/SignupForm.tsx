'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

export default function SignupForm() {
  const router = useRouter();
  const { register, error: authError } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const passwordMatch = password && confirmPassword ? password === confirmPassword : true;
  const passwordLength = password.length >= 6;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      await register(name, email, password);
      router.push('/dashboard');
    } catch (err) {
      const message = err instanceof Error ? err.message : authError || 'Registration failed';
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Name Field */}
      <div>
        <label htmlFor="name" className="block text-sm font-semibold text-gray-900 mb-2">
          Full Name
        </label>
        <div className={`relative transition-all duration-200 ${focusedField === 'name' ? 'scale-105' : ''}`}>
          <input
            type="text"
            id="name"
            placeholder="John Doe"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onFocus={() => setFocusedField('name')}
            onBlur={() => setFocusedField(null)}
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100 transition-all duration-150 bg-gray-50 hover:bg-white"
            required
            disabled={loading}
          />
        </div>
      </div>

      {/* Email Field */}
      <div>
        <label htmlFor="email" className="block text-sm font-semibold text-gray-900 mb-2">
          Email Address
        </label>
        <div className={`relative transition-all duration-200 ${focusedField === 'email' ? 'scale-105' : ''}`}>
          <input
            type="email"
            id="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onFocus={() => setFocusedField('email')}
            onBlur={() => setFocusedField(null)}
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100 transition-all duration-150 bg-gray-50 hover:bg-white"
            required
            disabled={loading}
          />
        </div>
      </div>

      {/* Password Field */}
      <div>
        <label htmlFor="password" className="block text-sm font-semibold text-gray-900 mb-2">
          Password
        </label>
        <div className={`relative transition-all duration-200 ${focusedField === 'password' ? 'scale-105' : ''}`}>
          <input
            type="password"
            id="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onFocus={() => setFocusedField('password')}
            onBlur={() => setFocusedField(null)}
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100 transition-all duration-150 bg-gray-50 hover:bg-white"
            required
            disabled={loading}
          />
        </div>

        <div className="flex items-center mt-2">
          <div className={`h-1 flex-1 rounded-full transition-all duration-300 ${passwordLength ? 'bg-green-500' : 'bg-gray-200'}`}></div>
        </div>

        <p className={`text-xs mt-2 transition-colors duration-200 ${passwordLength ? 'text-green-600' : 'text-gray-500'}`}>
          {passwordLength ? '✓ Strong password' : 'At least 6 characters required'}
        </p>
      </div>

      {/* Confirm Password Field */}
      <div>
        <label htmlFor="confirmPassword" className="block text-sm font-semibold text-gray-900 mb-2">
          Confirm Password
        </label>
        <div className={`relative transition-all duration-200 ${focusedField === 'confirmPassword' ? 'scale-105' : ''}`}>
          <input
            type="password"
            id="confirmPassword"
            placeholder="••••••••"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            onFocus={() => setFocusedField('confirmPassword')}
            onBlur={() => setFocusedField(null)}
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100 transition-all duration-150 bg-gray-50 hover:bg-white"
            required
            disabled={loading}
          />
        </div>

        {confirmPassword && (
          <p className={`text-xs mt-2 transition-colors duration-200 ${passwordMatch ? 'text-green-600' : 'text-red-600'}`}>
            {passwordMatch ? '✓ Passwords match' : '✗ Passwords do not match'}
          </p>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 rounded-lg px-4 py-3">
          <p className="font-medium text-red-900">{error}</p>
        </div>
      )}

      {/* Submit Button */}
      <button
        type="submit"
        disabled={loading}
        className="w-full bg gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:from-gray-300 disabled:to-gray-400 text-white py-3 px-4 rounded-xl font-semibold text-sm shadow-lg hover:shadow-xl transition-all duration-200 disabled:cursor-not-allowed transform hover:scale-105 disabled:hover:scale-100 flex items-center justify-center space-x-2"
      >
        {loading ? (
          <>
            <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            <span>Creating account...</span>
          </>
        ) : (
          <span>Create account</span>
        )}
      </button>

      {/* Terms */}
      <p className="text-xs text-gray-600 text-center">
        By creating an account, you agree to our{' '}
        <a href="#" className="text-purple-600 hover:text-purple-700 font-medium">
          Terms
        </a>{' '}
        and{' '}
        <a href="#" className="text-purple-600 hover:text-purple-700 font-medium">
          Privacy Policy
        </a>
      </p>
    </form>
  );
}