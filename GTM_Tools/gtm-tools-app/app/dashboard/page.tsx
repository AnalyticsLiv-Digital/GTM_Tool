/* eslint-disable react-hooks/exhaustive-deps */
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

  console.log("DashboardPage render", {
    account: store.selectedAccountId,
    container: store.selectedContainerId,
    workspace: store.selectedWorkspaceId,
    containers: store.containers,
    workspaces: store.workspaces,
  });

  const {
    handleSaveContainer,
    fetchContainers,
    fetchWorkspaces,
    fetchWorkspaceData,
  } = useDashboardActions();

  // ============================================================
  // AUTH
  // ============================================================

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    } else if (!authLoading) {
      setAnimateCards(true);
    }
  }, [user, authLoading, router]);

  // ============================================================
  // FETCH CONTAINERS
  //
  // Runs whenever the account changes.
  // It DOES NOT clear the selected container.
  // ============================================================

  useEffect(() => {
    if (!store.selectedAccountId) return;

    fetchContainers();
  }, [store.selectedAccountId]);

  // ============================================================
  // FETCH WORKSPACES
  //
  // IMPORTANT:
  // Requires BOTH account and container.
  // ============================================================

  useEffect(() => {
    if (
      !store.selectedAccountId ||
      !store.selectedContainerId
    ) {
      return;
    }

    fetchWorkspaces();
  }, [
    store.selectedAccountId,
    store.selectedContainerId,
  ]);

  // ============================================================
  // FETCH WORKSPACE DATA
  // ============================================================

  useEffect(() => {
    if (
      !store.selectedAccountId ||
      !store.selectedContainerId ||
      !store.selectedWorkspaceId
    ) {
      return;
    }

    fetchWorkspaceData();
  }, [
    store.selectedAccountId,
    store.selectedContainerId,
    store.selectedWorkspaceId,
  ]);

  // ============================================================
  // AUTH LOADING
  // ============================================================

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-page">
        <div className="flex flex-col items-center gap-3">
          <div className="w-9 h-9 border-2 border-edge border-t-accent rounded-full animate-spin" />

          <p className="text-muted text-sm">
            Loading your dashboard…
          </p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="bg-page">
      <div className="max-w-7xl mx-auto">

        {/* TOP HEADER BANNER */}
        <div className="mb-10 flex flex-col md:flex-row md:items-end md:justify-between gap-5">
          <div>
            <h1 className="text-[28px] md:text-[32px] font-semibold text-fg leading-tight tracking-[-0.02em]">
              GTM Tool
            </h1>

            <p className="text-[14.5px] text-muted mt-2 max-w-2xl">
              Audit, manage, export, and optimize your Google Tag Manager workspace.
            </p>
          </div>

          <div className="flex gap-2 flex-wrap">
            <Pill label="Workspace Management" />
            <Pill label="Import/Export" tone="accent" />
            <Pill label="HealthCheck" tone="warn" />
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

function Pill({
  label,
  tone = "neutral",
}: {
  label: string;
  tone?: "neutral" | "accent" | "warn";
}) {
  const styles =
    tone === "accent"
      ? "bg-accent-soft text-accent border-accent/20"
      : tone === "warn"
        ? "bg-[color:var(--warn)]/10 text-[color:var(--warn)] border-[color:var(--warn)]/20"
        : "bg-card-hi text-muted border-line";

  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full border text-[11px] font-medium ${styles}`}
    >
      {label}
    </span>
  );
}
