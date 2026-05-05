"use client";

import {
  CheckCircle,
  ShieldCheck,
  Zap,
  BarChart3,
  FileText,
  XCircle,
  AlertTriangle,
} from "lucide-react";
import { useState } from "react";
import { HealthCheckResult } from "@/lib/healthcheck/types";
import { useDashboardStore } from "@/app/store/useDashboardStore";

type HealthCheckReport = {
  score: number;
  passedCount: number;
  failedCount: number;
  results: HealthCheckResult[];
};

export default function HomePage() {
  const store = useDashboardStore();
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<HealthCheckReport | null>(null);

  const handleRunHealthCheck = async () => {
    try {
      setLoading(true);

      const res = await fetch("/api/auth/healthcheck", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountId: store.selectedAccountId,
          containerId: store.selectedContainerId,
          workspaceId: store.selectedWorkspaceId,
        }),
      });

      const data = await res.json();
      setReport(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const failedChecks = (report?.results || []).filter((r) => !r.passed);
  const passedChecks = (report?.results || []).filter((r) => r.passed);

  return (
    <div
      className="min-h-screen bg-linear-to-br from-slate-50 via-white to-slate-100 px-6 py-10 max-w-7xl mx-auto"
      style={{ fontFamily: "'Sora', sans-serif" }}
    >
      {/* HERO */}
      {!report && (
        <section className="max-w-5xl mx-auto py-14 text-center relative">
          {/* Glow background */}
          <div className="absolute inset-0 -z-10 blur-3xl opacity-30">
            <div className="w-105 h-105 bg-indigo-400 rounded-full absolute top-0 left-1/2 -translate-x-1/2" />
            <div className="w-[320px] h-80 bg-sky-400 rounded-full absolute top-24 left-1/3" />
          </div>

          <h2 className="text-5xl font-extrabold leading-tight text-slate-900 tracking-tight">
            Audit Your Google Tag Manager <br />
            <span className="text-indigo-600">In Minutes</span>
          </h2>

          <p className="mt-6 text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
            GTM HealthCheck helps you identify tracking issues, unused tags,
            duplicate triggers, broken variables, and performance bottlenecks with a
            complete container audit.
          </p>

          <div className="mt-10 flex justify-center gap-4 flex-wrap">
            <button
              onClick={handleRunHealthCheck}
              disabled={loading}
              className="px-7 py-3.5 rounded-2xl bg-indigo-600 text-white text-sm font-semibold shadow-lg shadow-indigo-500/30 hover:bg-indigo-500 disabled:opacity-50 transition-all"
            >
              {loading ? "Running HealthCheck..." : "Run HealthCheck"}
            </button>
          </div>

          {/* Info badges */}
          <div className="mt-12 flex justify-center gap-6 text-slate-600 text-sm flex-wrap">
            <span className="flex items-center gap-2 bg-white border border-slate-200 px-4 py-2 rounded-full shadow-sm">
              <CheckCircle className="w-5 h-5 text-green-500" /> Secure & Fast
            </span>

            <span className="flex items-center gap-2 bg-white border border-slate-200 px-4 py-2 rounded-full shadow-sm">
              <ShieldCheck className="w-5 h-5 text-blue-500" /> Workspace Safe
            </span>

            <span className="flex items-center gap-2 bg-white border border-slate-200 px-4 py-2 rounded-full shadow-sm">
              <Zap className="w-5 h-5 text-yellow-500" /> Automated Audit
            </span>
          </div>
        </section>
      )}

      {/* REPORT */}
      {report && (

        <div className="mt-12 bg-white border border-slate-200 rounded-3xl shadow-md overflow-hidden">
          {/* Report Header */}
          <section className="max-w-5xl mx-auto py-14 text-center relative">
            <div className="absolute inset-0 -z-10 blur-3xl opacity-30">
              <div className="w-105 h-105 bg-indigo-400 rounded-full absolute top-0 left-1/2 -translate-x-1/2" />
              <div className="w-[320px] h-80 bg-sky-400 rounded-full absolute top-24 left-1/3" />
            </div>

            <h2 className="text-5xl font-extrabold leading-tight text-slate-900 tracking-tight">
              Audit Your Google Tag Manager <br />
              <span className="text-indigo-600">In Minutes</span>
            </h2>

            <p className="mt-6 text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
              GTM HealthCheck helps you identify tracking issues, unused tags,
              duplicate triggers, broken variables, and performance bottlenecks with a
              complete container audit.
            </p>

            <div className="mt-10 flex justify-center gap-4 flex-wrap">
              <button
                onClick={handleRunHealthCheck}
                disabled={loading}
                className="px-7 py-3.5 rounded-2xl bg-indigo-600 text-white text-sm font-semibold shadow-lg shadow-indigo-500/30 hover:bg-indigo-500 disabled:opacity-50 transition-all"
              >
                {loading ? "Running HealthCheck..." : "Refresh HealthCheck"}
              </button>
            </div>
          </section>
          <div className="p-6 md:p-8 border-b border-slate-200 bg-linear-to-r from-indigo-50 to-sky-50">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5">

              <div>
                <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                  GTM HealthCheck Report
                </h2>

                <p className="text-sm text-slate-600 mt-2">
                  Passed:{" "}
                  <span className="font-semibold text-green-700">
                    {report.passedCount}
                  </span>{" "}
                  | Failed:{" "}
                  <span className="font-semibold text-red-700">
                    {report.failedCount}
                  </span>
                </p>
              </div>

              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-xs uppercase tracking-widest text-slate-500 font-semibold">
                    Score
                  </p>
                  <p className="text-3xl font-extrabold text-indigo-700">
                    {report.score}%
                  </p>
                </div>

                <div
                  className={`w-14 h-14 rounded-2xl flex items-center justify-center font-extrabold text-white shadow-md ${report.score >= 80
                    ? "bg-green-600"
                    : report.score >= 50
                      ? "bg-yellow-500"
                      : "bg-red-600"
                    }`}
                >
                  {report.score >= 80 ? "A" : report.score >= 50 ? "B" : "C"}
                </div>
              </div>
            </div>
          </div>

          {/* Report Body */}
          <div className="p-6 md:p-8">
            {/* Failed Checks */}
            <div>
              <div className="flex items-center gap-2">
                <XCircle className="w-5 h-5 text-red-600" />
                <h3 className="text-lg font-bold text-red-700">
                  Failed Checks ({failedChecks.length})
                </h3>
              </div>

              <div className="mt-5 space-y-4">
                {failedChecks.map((r) => (
                  <div
                    key={r.id}
                    className="rounded-2xl border border-red-200 bg-linear-to-br from-red-50 to-white shadow-sm p-5"
                  >
                    <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
                      <div className="flex-1">
                        <p className="font-bold text-slate-900 text-base">
                          {r.id} — {r.title}
                        </p>

                        <p className="text-sm text-slate-700 mt-2 leading-relaxed">
                          {r.description}
                        </p>

                        {r.recommendation && (
                          <div className="mt-3 bg-white border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700 font-medium">
                            <span className="font-bold">Fix:</span>{" "}
                            {r.recommendation}
                          </div>
                        )}

                        {/* Affected Tags */}
                        {r.affectedTags && r.affectedTags.length > 0 && (
                          <div className="mt-4">
                            <p className="text-sm font-bold text-slate-800">
                              Affected Tags
                            </p>

                            <div className="mt-2 space-y-2">
                              {r.affectedTags.map((t, index: number) => (
                                <div
                                  key={index}
                                  className="flex items-center justify-between gap-4 px-4 py-2 rounded-xl bg-white border border-slate-200 text-sm"
                                >
                                  <span className="font-semibold text-slate-800">
                                    {t.name}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Affected Triggers */}
                        {r.affectedTriggers && r.affectedTriggers.length > 0 && (
                          <div className="mt-4">
                            <p className="text-sm font-bold text-slate-800">
                              Affected Triggers
                            </p>

                            <div className="mt-2 space-y-2">
                              {r.affectedTriggers.map((t, index: number) => (
                                <div
                                  key={index}
                                  className="flex items-center justify-between gap-4 px-4 py-2 rounded-xl bg-white border border-slate-200 text-sm"
                                >
                                  <span className="font-semibold text-slate-800">
                                    {t.name}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Affected Variables */}
                        {r.affectedVariables &&
                          r.affectedVariables.length > 0 && (
                            <div className="mt-4">
                              <p className="text-sm font-bold text-slate-800">
                                Affected Variables
                              </p>

                              <div className="mt-2 space-y-2">
                                {r.affectedVariables.map((t, index: number) => (
                                  <div
                                    key={index}
                                    className="flex items-center justify-between gap-4 px-4 py-2 rounded-xl bg-white border border-slate-200 text-sm"
                                  >
                                    <span className="font-semibold text-slate-800">
                                      {t.name}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                      </div>

                      {/* Severity Badge */}
                      <div>
                        <span
                          className={`px-4 py-2 rounded-full text-xs font-bold shadow-sm ${r.severity === "HIGH"
                            ? "bg-red-600 text-white"
                            : r.severity === "MEDIUM"
                              ? "bg-yellow-500 text-white"
                              : "bg-blue-600 text-white"
                            }`}
                        >
                          {r.severity}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}

                {failedChecks.length === 0 && (
                  <div className="mt-4 p-5 rounded-2xl bg-green-50 border border-green-200 text-green-700 text-sm font-semibold">
                    🎉 No failed checks found. Your container looks healthy!
                  </div>
                )}
              </div>
            </div>

            {/* Passed Checks */}
            <div className="mt-12">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <h3 className="text-lg font-bold text-green-700">
                  Passed Checks ({passedChecks.length})
                </h3>
              </div>

              <div className="mt-5 grid md:grid-cols-2 gap-4">
                {passedChecks.map((r) => (
                  <div
                    key={r.id}
                    className="rounded-2xl border border-green-200 bg-linear-to-br from-green-50 to-white shadow-sm p-5 hover:shadow-md transition"
                  >
                    <div className="flex justify-between items-start gap-4">
                      <div>
                        <p className="font-bold text-slate-900">
                          {r.id} — {r.title}
                        </p>
                        <p className="text-sm text-slate-700 mt-2 leading-relaxed">
                          {r.description}
                        </p>
                      </div>

                      <span className="px-3 py-1 rounded-full text-xs font-bold bg-green-600 text-white shadow-sm">
                        PASSED
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Note */}
            <div className="mt-12 flex items-start gap-3 p-5 rounded-2xl border border-slate-200 bg-slate-50">
              <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
              <p className="text-sm text-slate-700 leading-relaxed">
                <span className="font-bold text-slate-900">Note:</span> This report
                is based on best-practice GTM rules and automated scanning. Always
                validate in Preview Mode before publishing.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* BELOW SECTIONS ONLY SHOW IF REPORT IS NOT GENERATED */}
      {!report && (
        <>
          {/* FEATURES */}
          <section className="py-16 border-t border-slate-200 mt-16">
            <h3 className="text-3xl font-extrabold text-center text-slate-900 tracking-tight">
              Why GTM HealthCheck?
            </h3>

            <p className="text-center text-slate-600 mt-3 max-w-2xl mx-auto">
              Improve tracking accuracy, reduce container clutter, and optimize tag
              performance.
            </p>

            <div className="grid md:grid-cols-3 gap-6 mt-14">
              <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm hover:shadow-lg transition">
                <BarChart3 className="w-10 h-10 text-indigo-600" />
                <h4 className="text-xl font-bold mt-5 text-slate-900">
                  Tag Performance Audit
                </h4>
                <p className="text-slate-600 mt-3 text-sm leading-relaxed">
                  Identify slow tags, excessive triggers, and unnecessary execution
                  that impacts load time.
                </p>
              </div>

              <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm hover:shadow-lg transition">
                <ShieldCheck className="w-10 h-10 text-green-600" />
                <h4 className="text-xl font-bold mt-5 text-slate-900">
                  Tracking Validation
                </h4>
                <p className="text-slate-600 mt-3 text-sm leading-relaxed">
                  Validate tag firing logic, variable configuration, and ensure
                  correct analytics tracking.
                </p>
              </div>

              <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm hover:shadow-lg transition">
                <FileText className="w-10 h-10 text-yellow-600" />
                <h4 className="text-xl font-bold mt-5 text-slate-900">
                  Smart Reports
                </h4>
                <p className="text-slate-600 mt-3 text-sm leading-relaxed">
                  Generate structured report with issues, severity levels, and
                  actionable recommendations.
                </p>
              </div>
            </div>
          </section>

          {/* HOW IT WORKS */}
          <section className="py-16 border-t border-slate-200">
            <h3 className="text-3xl font-extrabold text-center text-slate-900 tracking-tight">
              How it Works
            </h3>

            <p className="text-center text-slate-600 mt-3 max-w-2xl mx-auto">
              Simple process to get your GTM container health report.
            </p>

            <div className="grid md:grid-cols-3 gap-8 mt-14">
              <div className="p-7 rounded-3xl bg-white border border-slate-200 shadow-sm hover:shadow-md transition">
                <h4 className="text-lg font-bold text-indigo-600">
                  Step 1: Connect
                </h4>
                <p className="text-slate-600 mt-3 text-sm leading-relaxed">
                  Login using Google and select your GTM account, container, and
                  workspace.
                </p>
              </div>

              <div className="p-7 rounded-3xl bg-white border border-slate-200 shadow-sm hover:shadow-md transition">
                <h4 className="text-lg font-bold text-indigo-600">
                  Step 2: Scan Container
                </h4>
                <p className="text-slate-600 mt-3 text-sm leading-relaxed">
                  Our engine scans tags, triggers, variables, templates, and checks
                  best practices.
                </p>
              </div>

              <div className="p-7 rounded-3xl bg-white border border-slate-200 shadow-sm hover:shadow-md transition">
                <h4 className="text-lg font-bold text-indigo-600">
                  Step 3: Get Report
                </h4>
                <p className="text-slate-600 mt-3 text-sm leading-relaxed">
                  Download your audit report and fix issues with clear
                  recommendations.
                </p>
              </div>
            </div>
          </section>

          {/* REPORT INCLUDES */}
          <section className="py-16 border-t border-slate-200">
            <h3 className="text-3xl font-extrabold text-center text-slate-900 tracking-tight">
              HealthCheck Report Includes
            </h3>

            <div className="grid md:grid-cols-2 gap-6 mt-14">
              <div className="bg-white p-7 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition">
                <h4 className="text-lg font-bold text-slate-900">
                  ✔ Duplicate Tags / Triggers
                </h4>
                <p className="text-slate-600 text-sm mt-3 leading-relaxed">
                  Find repeated triggers, unused tags, and redundant setup.
                </p>
              </div>

              <div className="bg-white p-7 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition">
                <h4 className="text-lg font-bold text-slate-900">
                  ✔ Unused Variables
                </h4>
                <p className="text-slate-600 text-sm mt-3 leading-relaxed">
                  Identify variables created but never used in tags/triggers.
                </p>
              </div>

              <div className="bg-white p-7 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition">
                <h4 className="text-lg font-bold text-slate-900">
                  ✔ Template Dependency Check
                </h4>
                <p className="text-slate-600 text-sm mt-3 leading-relaxed">
                  Detect vendor templates used by tags and validate template export
                  requirements.
                </p>
              </div>

              <div className="bg-white p-7 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition">
                <h4 className="text-lg font-bold text-slate-900">
                  ✔ Best Practice Suggestions
                </h4>
                <p className="text-slate-600 text-sm mt-3 leading-relaxed">
                  Recommended improvements for container structure and performance.
                </p>
              </div>
            </div>
          </section>

          {/* CTA */}
          <section className="py-16 text-center border-t border-slate-200">
            <h3 className="text-4xl font-extrabold text-slate-900 tracking-tight">
              Ready to Optimize Your GTM Container?
            </h3>

            <p className="text-slate-600 mt-4 max-w-2xl mx-auto leading-relaxed">
              Run a GTM HealthCheck today and improve tracking accuracy,
              performance, and maintainability.
            </p>

            <div className="mt-10">
              <button
                onClick={handleRunHealthCheck}
                disabled={loading}
                className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white px-9 py-4 rounded-2xl text-sm font-semibold shadow-lg shadow-indigo-500/30 transition"
              >
                {loading ? "Running..." : "Start HealthCheck Now"}
              </button>
            </div>
          </section>
        </>
      )}
    </div>
  );
}

// "use client";

// import { CheckCircle, ShieldCheck, Zap, BarChart3, FileText } from "lucide-react";
// import { useState } from "react";
// import { HealthCheckResult } from "@/lib/healthcheck/types";
// import { useDashboardStore } from "@/app/store/useDashboardStore";


// type HealthCheckReport = {
//     score: number;
//     passedCount: number;
//     failedCount: number;
//     results: HealthCheckResult[];
// };

// export default function HomePage() {
//     const store = useDashboardStore();
//     const [loading, setLoading] = useState(false);
//     const [report, setReport] = useState<HealthCheckReport | null>(null);

//     const handleRunHealthCheck = async () => {
//         try {
//             setLoading(true);

//             const res = await fetch("/api/auth/healthcheck", {
//                 method: "POST",
//                 headers: { "Content-Type": "application/json" },
//                 body: JSON.stringify({
//                     accountId: store.selectedAccountId,
//                     containerId: store.selectedContainerId,
//                     workspaceId: store.selectedWorkspaceId,
//                 }),
//             });

//             const data = await res.json();
//             setReport(data);
//         } catch (err) {
//             console.error(err);
//         } finally {
//             setLoading(false);
//         }
//     };
//     return (
//         <div
//             className="min-h-screen bg-slate-50/60 px-6 py-10 max-w-7xl mx-auto"
//             style={{ fontFamily: "'Sora', sans-serif" }}
//         >
//             {/* Hero Section */}
//             <section className="text-center max-w-5xl mx-auto py-14">
//                 <h2 className="text-5xl font-extrabold leading-tight text-slate-900">
//                     Audit Your Google Tag Manager <br />
//                     <span className="text-indigo-600">In Minutes</span>
//                 </h2>

//                 <p className="mt-6 text-lg text-slate-600 max-w-2xl mx-auto">
//                     GTM HealthCheck helps you identify tracking issues, unused tags,
//                     duplicate triggers, broken variables, and performance bottlenecks with
//                     a complete container audit.
//                 </p>

//                 <div className="mt-10 flex justify-center gap-4 flex-wrap">
//                     {/* <button className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-2xl text-sm font-semibold shadow-lg transition">
//                         Run HealthCheck
//                     </button> */}
//                     <button
//                         onClick={handleRunHealthCheck}
//                         disabled={loading}
//                         className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white px-6 py-3 rounded-2xl text-sm font-semibold shadow-lg transition"
//                     >
//                         {loading ? "Running..." : "Run HealthCheck"}
//                     </button>
//                 </div>
//                 {report && (
//                     <div className="mt-10 bg-white border border-slate-200 rounded-2xl shadow-sm p-6">
//                         {/* Header */}
//                         <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
//                             <div>
//                                 <h2 className="text-xl font-bold text-slate-900">
//                                     HealthCheck Report
//                                 </h2>
//                                 <p className="text-sm text-slate-600 mt-1">
//                                     Passed: {report.passedCount} | Failed: {report.failedCount}
//                                 </p>
//                             </div>

//                             <div className="flex items-center gap-3">
//                                 <span className="text-sm font-semibold text-slate-700">Score</span>
//                                 <span className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-bold text-sm shadow">
//                                     {report.score}%
//                                 </span>
//                             </div>
//                         </div>

//                         {/* Failed Rules */}
//                         <div className="mt-8">
//                             <h3 className="text-lg font-semibold text-red-600">
//                                 Failed Checks ({report.results.filter((r) => !r.passed).length})
//                             </h3>

//                             <div className="mt-4 space-y-4">
//                                 {report.results
//                                     .filter((r) => !r.passed)
//                                     .map((r) => (
//                                         <div
//                                             key={r.id}
//                                             className="p-4 rounded-xl border border-red-200 bg-red-50"
//                                         >
//                                             <div className="flex justify-between items-start gap-4">
//                                                 <div>
//                                                     <p className="font-semibold text-slate-900">
//                                                         {r.id} - {r.title}
//                                                     </p>
//                                                     <p className="text-sm text-slate-700 mt-1">
//                                                         {r.description}
//                                                     </p>

//                                                     {r.recommendation && (
//                                                         <p className="text-sm text-red-700 mt-2">
//                                                             Fix: {r.recommendation}
//                                                         </p>
//                                                     )}

//                                                     {r.affectedTags && r.affectedTags.length > 0 && (
//                                                         <div className="mt-3">
//                                                             <p className="text-sm font-semibold text-slate-800">Affected Tags:</p>
//                                                             <ul className="mt-1 list-disc pl-5 text-sm text-slate-700">
//                                                                 {r.affectedTags.map((t) => (
//                                                                     <li key={t}>{t}</li>
//                                                                 ))}
//                                                             </ul>
//                                                         </div>
//                                                     )}

//                                                     {r.affectedTriggers && r.affectedTriggers.length > 0 && (
//                                                         <div className="mt-3">
//                                                             <p className="text-sm font-semibold text-slate-800">Affected Triggers:</p>
//                                                             <ul className="mt-1 list-disc pl-5 text-sm text-slate-700">
//                                                                 {r.affectedTriggers.map((t) => (
//                                                                     <li key={t}>{t}</li>
//                                                                 ))}
//                                                             </ul>
//                                                         </div>
//                                                     )}

//                                                     {r.affectedVariables && r.affectedVariables.length > 0 && (
//                                                         <div className="mt-3">
//                                                             <p className="text-sm font-semibold text-slate-800">Affected Variables:</p>
//                                                             <ul className="mt-1 list-disc pl-5 text-sm text-slate-700">
//                                                                 {r.affectedVariables.map((t) => (
//                                                                     <li key={t}>{t}</li>
//                                                                 ))}
//                                                             </ul>
//                                                         </div>
//                                                     )}
//                                                 </div>

//                                                 <span
//                                                     className={`px-3 py-1 rounded-full text-xs font-semibold ${r.severity === "HIGH"
//                                                         ? "bg-red-600 text-white"
//                                                         : r.severity === "MEDIUM"
//                                                             ? "bg-yellow-500 text-white"
//                                                             : "bg-blue-500 text-white"
//                                                         }`}
//                                                 >
//                                                     {r.severity}
//                                                 </span>
//                                             </div>
//                                         </div>
//                                     ))}
//                             </div>
//                         </div>

//                         {/* Passed Rules */}
//                         <div className="mt-10">
//                             <h3 className="text-lg font-semibold text-green-600">
//                                 Passed Checks ({report.results.filter((r) => r.passed).length})
//                             </h3>

//                             <div className="mt-4 space-y-3">
//                                 {report.results
//                                     .filter((r) => r.passed)
//                                     .map((r) => (
//                                         <div
//                                             key={r.id}
//                                             className="p-4 rounded-xl border border-green-200 bg-green-50"
//                                         >
//                                             <div className="flex justify-between items-start gap-4">
//                                                 <div>
//                                                     <p className="font-semibold text-slate-900">
//                                                         {r.id} - {r.title}
//                                                     </p>
//                                                     <p className="text-sm text-slate-700 mt-1">
//                                                         {r.description}
//                                                     </p>
//                                                 </div>

//                                                 <span className="px-3 py-1 rounded-full text-xs font-semibold bg-green-600 text-white">
//                                                     PASSED
//                                                 </span>
//                                             </div>
//                                         </div>
//                                     ))}
//                             </div>
//                         </div>
//                     </div>
//                 )}

//                 <div className="mt-12 flex justify-center gap-6 text-slate-600 text-sm flex-wrap">
//                     <span className="flex items-center gap-2">
//                         <CheckCircle className="w-5 h-5 text-green-500" /> Secure & Fast
//                     </span>
//                     <span className="flex items-center gap-2">
//                         <ShieldCheck className="w-5 h-5 text-blue-500" /> Workspace Safe
//                     </span>
//                     <span className="flex items-center gap-2">
//                         <Zap className="w-5 h-5 text-yellow-500" /> Automated Audit
//                     </span>
//                 </div>
//             </section>

//             {/* Features */}
//             <section className="py-16 border-t border-slate-200">
//                 <h3 className="text-3xl font-bold text-center text-slate-900">
//                     Why GTM HealthCheck?
//                 </h3>

//                 <p className="text-center text-slate-600 mt-3 max-w-2xl mx-auto">
//                     Improve tracking accuracy, reduce container clutter, and optimize tag
//                     performance.
//                 </p>

//                 <div className="grid md:grid-cols-3 gap-6 mt-14">
//                     <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition">
//                         <BarChart3 className="w-10 h-10 text-indigo-600" />
//                         <h4 className="text-xl font-semibold mt-5 text-slate-900">
//                             Tag Performance Audit
//                         </h4>
//                         <p className="text-slate-600 mt-3 text-sm">
//                             Identify slow tags, excessive triggers, and unnecessary execution
//                             that impacts load time.
//                         </p>
//                     </div>

//                     <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition">
//                         <ShieldCheck className="w-10 h-10 text-green-600" />
//                         <h4 className="text-xl font-semibold mt-5 text-slate-900">
//                             Tracking Validation
//                         </h4>
//                         <p className="text-slate-600 mt-3 text-sm">
//                             Validate tag firing logic, variable configuration, and ensure
//                             correct analytics tracking.
//                         </p>
//                     </div>

//                     <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition">
//                         <FileText className="w-10 h-10 text-yellow-600" />
//                         <h4 className="text-xl font-semibold mt-5 text-slate-900">
//                             Smart Reports
//                         </h4>
//                         <p className="text-slate-600 mt-3 text-sm">
//                             Generate a structured report with issues, severity levels, and
//                             actionable recommendations.
//                         </p>
//                     </div>
//                 </div>
//             </section>

//             {/* How it Works */}
//             <section className="py-16 border-t border-slate-200">
//                 <h3 className="text-3xl font-bold text-center text-slate-900">
//                     How it Works
//                 </h3>

//                 <p className="text-center text-slate-600 mt-3 max-w-2xl mx-auto">
//                     Simple process to get your GTM container health report.
//                 </p>

//                 <div className="grid md:grid-cols-3 gap-8 mt-14">
//                     <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm">
//                         <h4 className="text-lg font-semibold text-indigo-600">
//                             Step 1: Connect
//                         </h4>
//                         <p className="text-slate-600 mt-2 text-sm">
//                             Login using Google and select your GTM account, container, and
//                             workspace.
//                         </p>
//                     </div>

//                     <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm">
//                         <h4 className="text-lg font-semibold text-indigo-600">
//                             Step 2: Scan Container
//                         </h4>
//                         <p className="text-slate-600 mt-2 text-sm">
//                             Our engine scans tags, triggers, variables, templates, and checks
//                             best practices.
//                         </p>
//                     </div>

//                     <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm">
//                         <h4 className="text-lg font-semibold text-indigo-600">
//                             Step 3: Get Report
//                         </h4>
//                         <p className="text-slate-600 mt-2 text-sm">
//                             Download your audit report and fix issues with clear
//                             recommendations.
//                         </p>
//                     </div>
//                 </div>
//             </section>

//             {/* Reports */}
//             <section className="py-16 border-t border-slate-200">
//                 <h3 className="text-3xl font-bold text-center text-slate-900">
//                     HealthCheck Report Includes
//                 </h3>

//                 <div className="grid md:grid-cols-2 gap-6 mt-14">
//                     <div className="bg-white p-7 rounded-2xl border border-slate-200 shadow-sm">
//                         <h4 className="text-lg font-semibold text-slate-900">
//                             ✔ Duplicate Tags / Triggers
//                         </h4>
//                         <p className="text-slate-600 text-sm mt-2">
//                             Find repeated triggers, unused tags, and redundant setup.
//                         </p>
//                     </div>

//                     <div className="bg-white p-7 rounded-2xl border border-slate-200 shadow-sm">
//                         <h4 className="text-lg font-semibold text-slate-900">
//                             ✔ Unused Variables
//                         </h4>
//                         <p className="text-slate-600 text-sm mt-2">
//                             Identify variables created but never used in tags/triggers.
//                         </p>
//                     </div>

//                     <div className="bg-white p-7 rounded-2xl border border-slate-200 shadow-sm">
//                         <h4 className="text-lg font-semibold text-slate-900">
//                             ✔ Template Dependency Check
//                         </h4>
//                         <p className="text-slate-600 text-sm mt-2">
//                             Detect vendor templates used by tags and validate template export
//                             requirements.
//                         </p>
//                     </div>

//                     <div className="bg-white p-7 rounded-2xl border border-slate-200 shadow-sm">
//                         <h4 className="text-lg font-semibold text-slate-900">
//                             ✔ Best Practice Suggestions
//                         </h4>
//                         <p className="text-slate-600 text-sm mt-2">
//                             Recommended improvements for container structure and performance.
//                         </p>
//                     </div>
//                 </div>
//             </section>

//             {/* CTA */}
//             <section className="py-16 text-center border-t border-slate-200">
//                 <h3 className="text-4xl font-bold text-slate-900">
//                     Ready to Optimize Your GTM Container?
//                 </h3>

//                 <p className="text-slate-600 mt-4 max-w-2xl mx-auto">
//                     Run a GTM HealthCheck today and improve tracking accuracy, performance,
//                     and maintainability.
//                 </p>

//                 <div className="mt-10">
//                     <button className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-4 rounded-2xl text-sm font-semibold shadow-lg transition">
//                         Start HealthCheck Now
//                     </button>
//                 </div>
//             </section>
//         </div>
//     );
// }