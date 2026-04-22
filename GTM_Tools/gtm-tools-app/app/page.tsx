'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Link from 'next/link';

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.push('/dashboard');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="fixed w-full top-0 bg-white/80 backdrop-blur-sm border-b border-gray-200 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center space-x-2">
              <div className="flex items-center justify-center w-8 h-8 bg-primary-600 rounded-lg">
                <span className="text-white font-bold text-sm">G</span>
              </div>
              <span className="text-xl font-bold text-gray-900">GTM Tools</span>
            </div>

            {/* Navigation Links */}
            <div className="hidden md:flex items-center space-x-8">
              <a href="#features" className="text-gray-700 hover:text-gray-900 text-sm font-medium transition-colors">
                Features
              </a>
              <a href="#pricing" className="text-gray-700 hover:text-gray-900 text-sm font-medium transition-colors">
                Pricing
              </a>
            </div>

            {/* Auth Buttons */}
            <div className="flex items-center space-x-3">
              <Link
                href="/login"
                className="px-4 py-2 text-gray-900 text-sm font-medium hover:bg-gray-100 rounded-lg transition-colors"
              >
                Sign in
              </Link>
              <Link
                href="/signup"
                className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-lg transition-colors"
              >
                Get started
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <div className="mb-8 inline-flex items-center px-3 py-1 bg-primary-50 rounded-full border border-primary-200">
            <span className="text-sm font-medium text-primary-700">✨ Introducing GTM Tools</span>
          </div>

          <h1 className="text-5xl sm:text-6xl font-bold text-gray-900 mb-6 leading-tight">
            Manage Your Google Tag Manager
            <span className="text-primary-600"> Smarter</span>
          </h1>

          <p className="text-xl text-gray-600 mb-10 max-w-2xl mx-auto leading-relaxed">
            GTM Tools makes it simple to create, organize, and deploy tags, triggers, and variables. All in one beautiful, intuitive interface.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <Link
              href="/signup"
              className="px-8 py-3 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-lg shadow-sm hover:shadow-md transition-all duration-150"
            >
              Get started free
            </Link>
            <Link
              href="/login"
              className="px-8 py-3 border border-gray-300 hover:border-gray-400 text-gray-900 font-semibold rounded-lg transition-colors"
            >
              Sign in
            </Link>
          </div>

          {/* Hero Image Placeholder */}
          <div className="bg-linear-to-b from-gray-100 to-gray-50 rounded-lg border border-gray-200 h-96 flex items-center justify-center">
            <div className="text-center">
              <div className="text-5xl mb-4">📊</div>
              <p className="text-gray-600 font-medium">Dashboard Preview</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Powerful Features</h2>
            <p className="text-lg text-gray-600">Everything you need to manage GTM at scale</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <FeatureCard
              title="Container Management"
              description="Create, organize, and manage multiple GTM containers effortlessly."
              icon="📦"
            />
            <FeatureCard
              title="Tag Builder"
              description="Build and test tags without writing code. Deploy with confidence."
              icon="🏷️"
            />
            <FeatureCard
              title="Event Triggers"
              description="Set up pageview and event-based triggers with an intuitive interface."
              icon="⚡"
            />
            <FeatureCard
              title="Variable Control"
              description="Create custom variables and manage your data layer efficiently."
              icon="⚙️"
            />
            <FeatureCard
              title="Version Control"
              description="Track changes, view history, and rollback to previous versions."
              icon="⏱️"
            />
            <FeatureCard
              title="Easy Export"
              description="Export your configurations in multiple formats for backup and sharing."
              icon="📥"
            />
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-4xl font-bold text-gray-900 mb-4 text-center">Why GTM Tools?</h2>
          <p className="text-lg text-gray-600 text-center mb-12">Trusted by marketing teams to manage their tracking infrastructure</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <BenefitItem title="Save Time" description="Manage all your GTM assets in one place. No more switching between tabs." />
            <BenefitItem title="Reduce Errors" description="Built-in validation helps catch issues before they go live." />
            <BenefitItem title="Team Collaboration" description="Invite team members and manage permissions easily." />
            <BenefitItem title="Analytics" description="Track deployments and see what changed with detailed version history." />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-primary-600">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-4xl font-bold text-white mb-4">Ready to get started?</h2>
          <p className="text-lg text-primary-100 mb-10">
            Join teams using GTM Tools to manage their tags efficiently and scale tracking infrastructure.
          </p>
          <Link
            href="/signup"
            className="inline-block px-8 py-3 bg-white hover:bg-gray-100 text-primary-600 font-semibold rounded-lg transition-colors"
          >
            Create free account
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Product</h3>
              <ul className="space-y-2">
                <li><a href="#" className="text-gray-600 hover:text-gray-900 text-sm">Features</a></li>
                <li><a href="#" className="text-gray-600 hover:text-gray-900 text-sm">Pricing</a></li>
                <li><a href="#" className="text-gray-600 hover:text-gray-900 text-sm">Security</a></li>
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Company</h3>
              <ul className="space-y-2">
                <li><a href="#" className="text-gray-600 hover:text-gray-900 text-sm">About</a></li>
                <li><a href="#" className="text-gray-600 hover:text-gray-900 text-sm">Blog</a></li>
                <li><a href="#" className="text-gray-600 hover:text-gray-900 text-sm">Careers</a></li>
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Resources</h3>
              <ul className="space-y-2">
                <li><a href="#" className="text-gray-600 hover:text-gray-900 text-sm">Documentation</a></li>
                <li><a href="#" className="text-gray-600 hover:text-gray-900 text-sm">Tutorials</a></li>
                <li><a href="#" className="text-gray-600 hover:text-gray-900 text-sm">API</a></li>
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Legal</h3>
              <ul className="space-y-2">
                <li><a href="#" className="text-gray-600 hover:text-gray-900 text-sm">Privacy</a></li>
                <li><a href="#" className="text-gray-600 hover:text-gray-900 text-sm">Terms</a></li>
                <li><a href="#" className="text-gray-600 hover:text-gray-900 text-sm">Contact</a></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-200 pt-8">
            <p className="text-center text-gray-600 text-sm">&copy; 2024 GTM Tools. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

interface FeatureCardProps {
  title: string;
  description: string;
  icon: string;
}

function FeatureCard({ title, description, icon }: FeatureCardProps) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-8 hover:border-gray-300 hover:shadow-sm transition-all duration-200">
      <div className="text-3xl mb-4">{icon}</div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600 text-sm leading-relaxed">{description}</p>
    </div>
  );
}

interface BenefitItemProps {
  title: string;
  description: string;
}

function BenefitItem({ title, description }: BenefitItemProps) {
  return (
    <div className="flex gap-4">
      <div className="shrink-0">
        <div className="flex items-center justify-center h-8 w-8 rounded-full bg-primary-100">
          <span className="text-primary-600 font-semibold">✓</span>
        </div>
      </div>
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-1">{title}</h3>
        <p className="text-gray-600">{description}</p>
      </div>
    </div>
  );
}
