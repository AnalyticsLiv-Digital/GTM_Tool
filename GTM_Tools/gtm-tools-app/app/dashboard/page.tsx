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
      setAnimateCards(true);
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (store.selectedAccountId) {
      fetchContainers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store.selectedAccountId]);

  useEffect(() => {
    if (store.selectedContainerId) {
      fetchWorkspaces();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store.selectedContainerId]);

  useEffect(() => {
    if (store.selectedWorkspaceId) {
      fetchWorkspaceData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store.selectedWorkspaceId]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p
          className="text-slate-500 text-sm font-medium"
          style={{ fontFamily: "'Sora', sans-serif" }}
        >
          Loading dashboard…
        </p>
      </div>
    );
  }

  if (!user) return null;

  return (
    // NOTE: Add the font imports in your global layout or _document.tsx:
    // <link href="https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet" />
    <div className="min-h-screen bg-slate-50/60 px-6 py-10 max-w-7xl mx-auto">
      <WelcomeSection user={user} />

      <StatsGrid
        animateCards={animateCards}
        containersCount={store.containers.length}
        workspacesCount={store.workspaces.length}
        tagsCount={store.tags.length}
        triggersCount={store.triggers.length}
        variablesCount={store.variables.length}
      />

      <QuickActions />
      <Footer />

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

//   // ✅ Fetch Containers when Account changes
//   useEffect(() => {
//     if (store.selectedAccountId) {
//       fetchContainers();
//     }
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [store.selectedAccountId]);

//   // ✅ Fetch Workspaces when Container changes
//   useEffect(() => {
//     if (store.selectedContainerId) {
//       fetchWorkspaces();
//     }
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [store.selectedContainerId]);

//   // ✅ Fetch Tags/Triggers/Variables when Workspace changes
//   useEffect(() => {
//     if (store.selectedWorkspaceId) {
//       fetchWorkspaceData();
//     }
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [store.selectedWorkspaceId]);

//   if (authLoading) {
//     return (
//       <div className="min-h-screen flex items-center justify-center">
//         <p className="text-gray-600 font-semibold">Loading dashboard...</p>
//       </div>
//     );
//   }

//   if (!user) return null;

//   return (
//     <div>
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