"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

import WelcomeSection from "./components/WelcomeSection";
import StatsGrid from "./components/StatsGrid";
import QuickActions from "./components/QuickActions";
import Footer from "./components/Footer";
import ContainerModal from "./components/ContainerModal";

import { useDashboardStore } from "../store/useDashboardStore";
import { useDashboardActions } from "@/hooks/useDashboardActions";

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [animateCards, setAnimateCards] = useState(false);

  const store = useDashboardStore();
  console.log("DashboardPage render", store);

  const {
    handleSaveContainer,
    fetchContainers,
    fetchWorkspaces,
    fetchWorkspaceData,
  } = useDashboardActions();

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    } else if (!authLoading) {

      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAnimateCards(true);
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (store.selectedAccountId) {
      fetchContainers();
    }

  }, [store.selectedAccountId]);

  useEffect(() => {
    if (store.selectedContainerId) {
      fetchWorkspaces();
    }

  }, [store.selectedContainerId]);

  useEffect(() => {
    if (store.selectedWorkspaceId) {
      fetchWorkspaceData();
    }

  }, [store.selectedWorkspaceId]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-slate-50 via-white to-slate-100">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>

          <p
            className="text-slate-600 text-sm font-semibold"
            style={{ fontFamily: "'Sora', sans-serif" }}
          >
            Loading your dashboard...
          </p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-50 via-white to-slate-100 px-6 py-10">
      <div className="max-w-7xl mx-auto">
        {/* TOP HEADER BANNER */}
        <div className="mb-8 bg-white/70 backdrop-blur-xl border border-slate-200 rounded-3xl shadow-sm px-6 py-6 flex flex-col md:flex-row md:items-center md:justify-between gap-5">
          <div>
            <h1
              className="text-2xl md:text-3xl font-extrabold text-slate-900"
              style={{ fontFamily: "'Sora', sans-serif" }}
            >
              GTM Tools Dashboard
            </h1>

            <p className="text-sm text-slate-600 mt-1">
              Audit, manage, export, and optimize your Google Tag Manager
              workspace with smart tools.
            </p>
          </div>

          <div className="flex gap-3 flex-wrap">
            <span className="px-4 py-2 rounded-2xl bg-indigo-50 text-indigo-700 text-xs font-semibold border border-indigo-200">
              Workspace Management
            </span>

            <span className="px-4 py-2 rounded-2xl bg-emerald-50 text-emerald-700 text-xs font-semibold border border-emerald-200">
              Export / Import
            </span>

            <span className="px-4 py-2 rounded-2xl bg-orange-50 text-orange-700 text-xs font-semibold border border-orange-200">
              HealthCheck Ready
            </span>
          </div>
        </div>

        {/* WELCOME */}
        <WelcomeSection user={user} />

        {/* STATS */}
        <div className="mt-8">
          <StatsGrid
            animateCards={animateCards}
            containersCount={store.containers.length}
            workspacesCount={store.workspaces.length}
            tagsCount={store.tags.length}
            triggersCount={store.triggers.length}
            variablesCount={store.variables.length}
            templatesCount={store.templates.length}
          />
        </div>

        {/* QUICK ACTIONS */}
        <div className="mt-10">
          <QuickActions />
        </div>

        {/* FOOTER SECTION */}
        <div className="mt-12">
          <Footer />
        </div>

        {/* CUSTOM FOOTER TEXT */}
        {/* <div className="mt-8 text-center text-xs text-slate-500">
          GTM HealthCheck Suite • Export/Import Tools • Container Audit • Workspace
          Safe Operations
        </div> */}

        {/* MODAL */}
        <ContainerModal
          show={store.showContainerModal}
          mode={store.containerModalMode}
          name={store.containerNameInput}
          setName={store.setContainerNameInput}
          loading={store.containerCrudLoading}
          onClose={() => store.setShowContainerModal(false)}
          onSave={handleSaveContainer}
        />
      </div>
    </div>
  );
}



// "use client";

// import { useEffect, useState } from "react";
// import { useRouter } from "next/navigation";
// import { useAuth } from "@/contexts/AuthContext";

// import WelcomeSection from "./components/WelcomeSection";
// import StatsGrid from "./components/StatsGrid";
// import QuickActions from "./components/QuickActions";
// import Footer from "./components/Footer";
// import ContainerModal from "./components/ContainerModal";

// import { useDashboardStore } from "../store/useDashboardStore";
// import { useDashboardActions } from "@/hooks/useDashboardActions";

// export default function DashboardPage() {
//   const router = useRouter();
//   const { user, loading: authLoading } = useAuth();

//   const [animateCards, setAnimateCards] = useState(false);

//   const store = useDashboardStore();

//   const {
//     handleSaveContainer,
//     fetchContainers,
//     fetchWorkspaces,
//     fetchWorkspaceData,
//   } = useDashboardActions();

//   useEffect(() => {
//     if (!authLoading && !user) {
//       router.push("/login");
//     } else if (!authLoading) {
//       setAnimateCards(true);
//     }
//   }, [user, authLoading, router]);

//   useEffect(() => {
//     if (store.selectedAccountId) {
//       fetchContainers();
//     }
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [store.selectedAccountId]);

//   useEffect(() => {
//     if (store.selectedContainerId) {
//       fetchWorkspaces();
//     }
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [store.selectedContainerId]);

//   useEffect(() => {
//     if (store.selectedWorkspaceId) {
//       fetchWorkspaceData();
//     }
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [store.selectedWorkspaceId]);

//   if (authLoading) {
//     return (
//       <div className="min-h-screen flex items-center justify-center">
//         <p
//           className="text-slate-500 text-sm font-medium"
//           style={{ fontFamily: "'Sora', sans-serif" }}
//         >
//           Loading dashboard…
//         </p>
//       </div>
//     );
//   }

//   if (!user) return null;

//   return (
//     // NOTE: Add the font imports in your global layout or _document.tsx:
//     // <link href="https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet" />
//     <div className="min-h-screen bg-slate-50/60 px-6 py-10 max-w-7xl mx-auto">
//       <WelcomeSection user={user} />

//       <StatsGrid
//         animateCards={animateCards}
//         containersCount={store.containers.length}
//         workspacesCount={store.workspaces.length}
//         tagsCount={store.tags.length}
//         triggersCount={store.triggers.length}
//         variablesCount={store.variables.length}
//       />

//       <QuickActions />
//       <Footer />

//       <ContainerModal
//         show={store.showContainerModal}
//         mode={store.containerModalMode}
//         name={store.containerNameInput}
//         setName={store.setContainerNameInput}
//         loading={store.containerCrudLoading}
//         onClose={() => store.setShowContainerModal(false)}
//         onSave={handleSaveContainer}
//       />
//     </div>
//   );
// }