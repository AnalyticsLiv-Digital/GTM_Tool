export default function PrivacyPolicyPage() {
  return (
    <main className="max-w-4xl mx-auto px-6 py-12">
      <h1 className="text-4xl font-bold mb-4">Privacy Policy</h1>

      <p className="text-sm text-gray-600 mb-8">
        Effective June 5, 2026 · Applies to the GTM Automation Tool at
        gtmhealth.analyticsliv.com
      </p>

      <div className="prose prose-gray max-w-none">
        <p>
          At <strong>ANALYTICS LIV DIGITAL LLP</strong>, accessible from our
          application https://gtmhealth.analyticsliv.com, one of our main priorities is the privacy of our users.
          This Privacy Policy document contains the types of information that are
          collected and recorded by the Service and how we use them.
        </p>

        <p>
          The Service helps users manage, audit, automate, and maintain their
          digital measurement and tagging configurations through authorized access
          to connected Google services. If you have additional questions or
          require more information about our Privacy Policy, do not hesitate to
          contact us.
        </p>

        <p>
          This Privacy Policy applies only to the Service and is valid for users
          of this application with regard to the information that they share
          and/or we collect within the Service. This policy is not applicable to
          any information collected offline or via channels other than this
          application. Other AnalyticsLiv products and the main AnalyticsLiv
          website are governed by their own respective policies.
        </p>
        <br></br>
        <h1><strong>1. Consent</strong></h1>
        <p>
          By signing in to and using the Service with your Google account, you
          hereby consent to this Privacy Policy and agree to its terms.
        </p>
        <br></br>

        <h1><strong>2. Information We Collect</strong></h1>
        When you sign in with Google, we receive:
        <ul>
          <li></li>
          <h3><strong>Profile Information</strong></h3>
          <li>Name</li>
          <li>Email Address</li>
          <li>Profile Picture</li>
        </ul>

        <h3>Connected Google Service Data</h3>
        <p>
          The Service may access information from Google services that you
          explicitly authorize in order to provide auditing, automation,
          reporting, and management functionality.
        </p>

        <h3>OAuth Tokens</h3>
        <p>
          Access tokens and refresh tokens are securely stored so the Service can
          communicate with Google APIs on your behalf.
        </p>
        <br></br>

        <h1><strong>3. Google API Permissions We Request</strong></h1>
        <p>
          The Service requests only the permissions necessary to provide its
          functionality. The exact permissions are displayed and approved through
          Google consent screen before access is granted.
        </p>
        <br></br>

        <h1><strong>4. How We Use Your Information</strong></h1>
        <ul>
          <li>Authenticate users</li>
          <li>Maintain secure sessions</li>
          <li>Provide automation and management features</li>
          <li>Generate reports and recommendations</li>
          <li>Store account history and reports</li>
          <li>Provide customer support</li>
        </ul>
        <br></br>
        <h1><strong>5. Google API Services User Data Policy</strong></h1>
        <p>
          The Service complies with the Google API Services User Data Policy,
          including the Limited Use requirements.
        </p>
        <br></br>

        <h1><strong>6. Use of AI Features</strong></h1>
        <p>
          AI-powered features may analyze authorized configuration data to
          provide recommendations, insights, and answers to user questions.
        </p>
        <br></br>

        <h1><strong>7. Data Storage and Retention</strong></h1>
        <p>
          User profiles, reports, logs, and OAuth credentials may be stored
          securely while accounts remain active.
        </p>
        <br></br>

        <h1><strong>8. Log Files</strong></h1>
        <p>
          Logs may contain IP addresses, browser information, timestamps, and
          diagnostic data used for security, troubleshooting, and service
          administration.
        </p>
        <br></br>
        <h1><strong>9. Revoking Access & Data Deletion</strong></h1>
        <p>Revoke Google access at:</p>

        <a
          href="https://myaccount.google.com/permissions"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 underline"
        >
          https://myaccount.google.com/permissions
        </a>
        <p className="mt-4">
          For deletion requests contact:
          <strong> support@analyticsliv.com</strong>
        </p>
        <br></br>

        <h1><strong>10. Your Rights</strong></h1>
        <ul>
          <li>Access</li>
          <li>Correction</li>
          <li>Deletion</li>
          <li>Portability</li>
          <li>Withdrawal of Consent</li>
          <li>Complaint</li>
        </ul>
        <br></br>
        <h1><strong>11. Cookies</strong></h1>
        <p>
          The Service uses a single session cookie (managed by NextAuth) to keep you signed in between page loads. This cookie is essential to the operation of the Service and cannot be disabled without losing the ability to use the Service.

          We do not use advertising cookies, tracking cookies, third-party analytics cookies, or any other cookies beyond what is strictly necessary to authenticate you.
        </p>
        <br></br>
        <h1><strong>12. Security</strong></h1>
        <p>
          We use industry-standard measures to protect your data: encrypted connections (HTTPS) for all traffic, encrypted storage at rest, scoped database credentials, and least-privilege access controls for engineering staff. No system is perfectly secure, but in the event of a security incident that exposes your personal data, we will notify affected users without undue delay — and, in any case, within 72 hours of confirming the incident — by email to the address associated with your account.
        </p>
        <br></br>

        <h1><strong>13. Children</strong></h1>
        <p>
          The Service is not directed to children under 18 and we do not knowingly collect personal data from them. If you believe a child has provided personal data to the Service, please contact us and we will delete it.
        </p>
        <br></br>

        <h1><strong>14. Changes to This Policy</strong></h1>
        <p>
          We may update this Privacy Policy from time to time. Material changes will be communicated by email or via an in-app notice before they take effect. The “Effective” date at the top of this page indicates when the current version was published.
        </p>
        <br></br>

        <h1><strong>15. Contact & Grievance Officer</strong></h1>
        <p>For any questions, complaints, data-protection requests, or grievances relating to this Privacy Policy or your personal data, please contact our grievance officer at support@analyticsliv.com. We aim to acknowledge all such requests within 7 business days and to substantively resolve them within 30 days.</p>
        <p>
          ANALYTICS LIV DIGITAL LLP.  Ahmedabad, Gujarat, India
        </p>
        <br></br>
      </div>
    </main>
  );
}