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



import {

  useDashboardStore,

  type DashboardStore,

} from "../store/useDashboardStore";

import { useDashboardActions } from "@/hooks/useDashboardActions";

import type { GtmWorkspace } from "@/lib/gtm/types";
import GtmWebServerConnection from "./components/GtmWebServerConnection";



// ============================================================

// TYPES

// ============================================================



type ServerWorkspace = GtmWorkspace;



type AutomationResult = {

  success: boolean;

  message?: string;

  web?: unknown;

  server?: unknown;

};



// ============================================================

// API RESPONSE HELPER

// ============================================================



type ApiResponse = Record<string, unknown> & {

  error?: unknown;

  details?: unknown;

  partial?: unknown;

  workspace?: unknown;

  success?: unknown;

};



function getApiErrorMessage(

  data: ApiResponse,

  fallback: string

): string {

  const directError = data.error;

  if (typeof directError === "string" && directError.trim()) {

    return directError;

  }



  const details = data.details;

  if (details && typeof details === "object") {

    const nestedError = (details as {

      error?: { message?: unknown };

    }).error;

    if (

      nestedError &&

      typeof nestedError.message === "string" &&

      nestedError.message.trim()

    ) {

      return nestedError.message;

    }

  }



  return fallback;

}



async function readApiResponse(

  response: Response

): Promise<ApiResponse> {

  const responseText = await response.text();



  if (!responseText) {

    if (!response.ok) {

      throw new Error(

        `Request failed with status ${response.status}`

      );

    }



    return {} as ApiResponse;

  }



  let data: unknown;



  try {

    data = JSON.parse(responseText);

  } catch {

    throw new Error(

      `API returned HTML or invalid JSON (${response.status}). ` +

        `Check the API route and server logs. Response: ` +

        responseText.substring(0, 180)

    );

  }



  if (

    typeof data !== "object" ||

    data === null ||

    Array.isArray(data)

  ) {

    throw new Error("The API returned an unexpected response format.");

  }



  return data as ApiResponse;

}



// ============================================================

// DASHBOARD

// ============================================================



export default function DashboardPage() {

  const router = useRouter();

  const { user, loading: authLoading } = useAuth();



  const [animateCards, setAnimateCards] = useState(false);



  const store = useDashboardStore();



  // ==========================================================

  // DASHBOARD ACTIONS

  // ==========================================================



  const {

    handleSaveContainer,

    fetchContainers,

    fetchWorkspaces,

    fetchWorkspaceData,

  } = useDashboardActions();



  // ==========================================================

  // AUTOMATION STATE

  // ==========================================================



  const [serverContainerId, setServerContainerId] = useState("");

  const [serverWorkspaceId, setServerWorkspaceId] = useState("");



  const [serverWorkspaces, setServerWorkspaces] = useState<

    ServerWorkspace[]

  >([]);



  const [serverContainerUrl, setServerContainerUrl] = useState("");

  const [eventName, setEventName] = useState("");



  const [loadingWorkspaces, setLoadingWorkspaces] = useState(false);

  const [automationLoading, setAutomationLoading] = useState(false);



  const [automationError, setAutomationError] = useState("");



  const [automationResult, setAutomationResult] =

    useState<AutomationResult | null>(null);



  // ==========================================================

  // AUTH

  // ==========================================================



  useEffect(() => {

    if (!authLoading && !user) {

      router.push("/login");

    } else if (!authLoading) {

      setAnimateCards(true);

    }

  }, [user, authLoading, router]);



  // ==========================================================

  // FETCH CONTAINERS

  // ==========================================================



  useEffect(() => {

    if (!store.selectedAccountId) return;



    fetchContainers();

  }, [store.selectedAccountId]);



  // ==========================================================

  // FETCH WEB WORKSPACES

  // ==========================================================



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



  // ==========================================================

  // FETCH WEB WORKSPACE DATA

  // ==========================================================



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



  // ==========================================================

  // FETCH SERVER WORKSPACES

  // ==========================================================



  useEffect(() => {

    if (

      !store.selectedAccountId ||

      !serverContainerId

    ) {

      setServerWorkspaces([]);

      setServerWorkspaceId("");

      return;

    }



    let cancelled = false;



    const loadServerWorkspaces = async () => {

      try {

        setLoadingWorkspaces(true);

        setAutomationError("");



        const params = new URLSearchParams({

          accountId: store.selectedAccountId,

          containerId: serverContainerId,

        });



        const response = await fetch(

          `/api/auth/gtm/workspaces?${params.toString()}`,

          { cache: "no-store" }

        );



        const data = await readApiResponse(response);



        if (!response.ok) {

          throw new Error(

            getApiErrorMessage(

              data,

              "Failed to fetch Server GTM workspaces"

            )

          );

        }



        if (cancelled) return;



        setServerWorkspaces(

          Array.isArray(data.workspace)

            ? (data.workspace as ServerWorkspace[])

            : []

        );

        setServerWorkspaceId("");

      } catch (error) {

        if (cancelled) return;



        console.error("Server workspace error:", error);



        setServerWorkspaces([]);

        setServerWorkspaceId("");



        setAutomationError(

          error instanceof Error

            ? error.message

            : "Failed to fetch Server GTM workspaces"

        );

      } finally {

        if (!cancelled) {

          setLoadingWorkspaces(false);

        }

      }

    };



    void loadServerWorkspaces();



    return () => {

      cancelled = true;

    };

  }, [

    store.selectedAccountId,

    serverContainerId,

  ]);



  // ==========================================================

  // CONFIGURE GTM

  // ==========================================================



  const handleConfigureGtm = async () => {

    setAutomationError("");

    setAutomationResult(null);



    if (!store.selectedAccountId) {

      setAutomationError("Please select a GTM account first.");

      return;

    }



    if (!store.selectedContainerId) {

      setAutomationError("Please select the Web GTM container.");

      return;

    }



    if (!store.selectedWorkspaceId) {

      setAutomationError("Please select the Web GTM workspace.");

      return;

    }



    if (!serverContainerId) {

      setAutomationError("Please select the Server GTM container.");

      return;

    }



    if (!serverWorkspaceId) {

      setAutomationError("Please select the Server GTM workspace.");

      return;

    }



    if (!serverContainerUrl.trim()) {

      setAutomationError("Please enter the Server Container URL.");

      return;

    }



    try {

      const parsedUrl = new URL(serverContainerUrl.trim());



      if (parsedUrl.protocol !== "https:") {

        setAutomationError(

          "Please enter a valid HTTPS Server Container URL."

        );

        return;

      }

    } catch {

      setAutomationError(

        "Please enter a valid Server Container URL, including https://."

      );

      return;

    }



    if (!eventName.trim()) {

      setAutomationError("Please enter an event name.");

      return;

    }



    try {

      setAutomationLoading(true);



      const response = await fetch("/api/gtm/connect", {

        method: "POST",

        headers: {

          "Content-Type": "application/json",

        },

        body: JSON.stringify({

          accountId: store.selectedAccountId,

          webContainerId: store.selectedContainerId,

          webWorkspaceId: store.selectedWorkspaceId,

          serverContainerId,

          serverWorkspaceId,

          serverContainerUrl: serverContainerUrl.trim().replace(/\/+$/, ""),

          eventNames: [eventName.trim()],

        }),

      });



      const data = await readApiResponse(response);



      if (!response.ok) {

        const apiError = getApiErrorMessage(

          data,

          "Failed to configure GTM automation"

        );

        throw new Error(

          data.partial === true

            ? `${apiError} Web GTM was updated, but Server GTM may be incomplete.`

            : apiError

        );

      }



      if (

        typeof data !== "object" ||

        data === null ||

        typeof data.success !== "boolean"

      ) {

        throw new Error(

          "The API returned an invalid automation result."

        );

      }



      setAutomationResult(data as AutomationResult);

    } catch (error) {

      console.error("GTM automation error:", error);



      setAutomationError(

        error instanceof Error

          ? error.message

          : "Failed to configure GTM automation"

      );

    } finally {

      setAutomationLoading(false);

    }

  };



  // ==========================================================

  // AUTH LOADING

  // ==========================================================



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



  // ==========================================================

  // DASHBOARD UI

  // ==========================================================



  return (

    <div className="bg-page min-h-screen">

      <div className="max-w-7xl mx-auto">

        {/* TOP HEADER */}



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

            <Pill label="Workspace Management" tone="accent" />

            <Pill label="Import/Export" tone="primary" />

            <Pill label="HealthCheck" tone="warn" />

            <Pill label="Event Automation" tone="primary" />

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



        {/* GTM AUTOMATION */}



        <div className="mt-10">

          <GtmAutomationSection

            store={store}

            serverContainerId={serverContainerId}

            setServerContainerId={setServerContainerId}

            serverWorkspaceId={serverWorkspaceId}

            setServerWorkspaceId={setServerWorkspaceId}

            serverWorkspaces={serverWorkspaces}

            serverContainerUrl={serverContainerUrl}

            setServerContainerUrl={setServerContainerUrl}

            eventName={eventName}

            setEventName={setEventName}

            loadingWorkspaces={loadingWorkspaces}

            automationLoading={automationLoading}

            error={automationError}

            result={automationResult}

            onConfigure={handleConfigureGtm}

          />

        </div>



        {/* FOOTER */}



        <div className="mt-12">

          <Footer />

        </div>



        {/* CONTAINER MODAL */}



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



// ============================================================

// GTM AUTOMATION SECTION

// ============================================================



function GtmAutomationSection({

  store,

  serverContainerId,

  setServerContainerId,

  serverWorkspaceId,

  setServerWorkspaceId,

  serverWorkspaces,

  serverContainerUrl,

  setServerContainerUrl,

  eventName,

  setEventName,

  loadingWorkspaces,

  automationLoading,

  error,

  result,

  onConfigure,

}: {

  store: DashboardStore;



  serverContainerId: string;

  setServerContainerId: (value: string) => void;



  serverWorkspaceId: string;

  setServerWorkspaceId: (value: string) => void;



  serverWorkspaces: ServerWorkspace[];



  serverContainerUrl: string;

  setServerContainerUrl: (value: string) => void;



  eventName: string;

  setEventName: (value: string) => void;



  loadingWorkspaces: boolean;



  automationLoading: boolean;

  error: string;

  result: AutomationResult | null;



  onConfigure: () => void;

}) {

  const serverContainers = store.containers.filter((container) =>

    container.usageContext?.includes("server")

  );



  const eventOptions = [

    "page_view",

    "view_item",

    "add_to_cart",

    "begin_checkout",

    "purchase",

    "generate_lead",

    "sign_up",

    "login",

    "form_submit",

    "contact",

  ];



  return (

    // <section className="rounded-2xl border border-line bg-card p-6 md:p-8">

    //   {/* HEADER */}



    //   <div className="mb-7">

    //     <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">

    //       <div>

    //         <h2 className="text-xl font-semibold text-fg">

    //           GTM Automation

    //         </h2>



    //         <p className="text-sm text-muted mt-1 max-w-2xl">

    //           Route your Web Google Tag through Server GTM and create the matching server-side event tag.

    //         </p>

    //       </div>



    //       <span className="inline-flex w-fit items-center rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[11px] font-medium text-primary">

    //         Automation

    //       </span>

    //     </div>

    //   </div>



    //   {/* STEP 1 — WEB GTM */}



    //   <div className="mb-8">

    //     <h3 className="text-sm font-semibold text-fg mb-4">

    //       1. Web GTM

    //     </h3>



    //     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

    //       <div>

    //         <label className="block text-xs font-medium text-muted mb-2">

    //           Web Container

    //         </label>



    //         <div className="rounded-lg border border-line bg-card-hi px-3 py-2.5 text-sm text-fg">

    //           {store.selectedContainerName ||

    //             store.selectedContainerId ||

    //             "No Web Container selected"}

    //         </div>

    //       </div>



    //       <div>

    //         <label className="block text-xs font-medium text-muted mb-2">

    //           Web Workspace

    //         </label>



    //         <div className="rounded-lg border border-line bg-card-hi px-3 py-2.5 text-sm text-fg">

    //           {store.selectedWorkspaceName ||

    //             store.selectedWorkspaceId ||

    //             "No Web Workspace selected"}

    //         </div>

    //       </div>

    //     </div>

    //   </div>



    //   {/* STEP 2 — SERVER GTM */}



    //   <div className="mb-8">

    //     <h3 className="text-sm font-semibold text-fg mb-4">

    //       2. Server GTM

    //     </h3>



    //     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

    //       <SelectField

    //         label="Server Container"

    //         value={serverContainerId}

    //         onChange={(value) => {

    //           setServerContainerId(value);

    //           setServerWorkspaceId("");

    //         }}

    //         options={serverContainers.map((container) => ({

    //           value: container.containerId,

    //           label: container.name || container.containerId,

    //         }))}

    //         placeholder="Select Server Container"

    //       />



    //       <SelectField

    //         label="Server Workspace"

    //         value={serverWorkspaceId}

    //         onChange={setServerWorkspaceId}

    //         options={serverWorkspaces.map((workspace) => ({

    //           value: workspace.workspaceId,

    //           label: workspace.name || workspace.workspaceId,

    //         }))}

    //         placeholder={

    //           loadingWorkspaces

    //             ? "Loading workspaces..."

    //             : "Select Server Workspace"

    //         }

    //         disabled={!serverContainerId || loadingWorkspaces}

    //       />

    //     </div>



    //     {serverContainers.length === 0 && (

    //       <p className="mt-2 text-xs text-muted">

    //         No Server GTM containers are available in the selected account.

    //       </p>

    //     )}



    //     <div className="mt-4">
    //       <GtmWebServerConnection
    //         accountId={store.selectedAccountId}
    //         webContainerId={store.selectedContainerId}
    //         webWorkspaceId={store.selectedWorkspaceId}
    //         serverContainerId={serverContainerId}
    //         serverContainerUrl={serverContainerUrl}
    //         onServerContainerUrlChange={setServerContainerUrl}
    //         onConnect={onConfigure}
    //         loading={automationLoading}
    //       />
    //     </div>



    //     <div className="mt-4">

    //       <SelectField

    //         label="Event Name"

    //         value={eventName}

    //         onChange={setEventName}

    //         options={eventOptions.map((event) => ({

    //           value: event,

    //           label: event,

    //         }))}

    //         placeholder="Select Event Name"

    //       />

    //     </div>

    //   </div>



    //   {/* AUTOMATION ERROR */}



    //   {error && (

    //     <div className="mb-5 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-500">

    //       {error}

    //     </div>

    //   )}



    //   {/* SUCCESS RESULT */}



    //   {result?.success && (

    //     <div className="mb-6 rounded-xl border border-green-500/20 bg-green-500/10 p-5">

    //       <h3 className="font-semibold text-green-600 mb-3">

    //         GTM Automation Complete

    //       </h3>



    //       <div className="space-y-2 text-sm text-green-700">

    //         <ResultItem text="Web GTM → Server GTM connection configured" />

    //         <ResultItem text="Server event trigger configured" />

    //         <ResultItem text="Server-side GA4 event tag configured" />

    //         <ResultItem text="Event trigger attached to the server-side tag" />



    //         <div className="pt-2 font-medium">

    //           ○ Changes have not been published.

    //         </div>

    //       </div>



    //       {result.message && (

    //         <p className="mt-3 text-sm text-green-700">

    //           {result.message}

    //         </p>

    //       )}

    //     </div>

    //   )}
    // </section>
    <>
    </>

  );

}



// ============================================================

// SELECT FIELD

// ============================================================



function SelectField({

  label,

  value,

  onChange,

  options,

  placeholder,

  disabled = false,

}: {

  label: string;

  value: string;

  onChange: (value: string) => void;

  options: {

    value: string;

    label: string;

  }[];

  placeholder: string;

  disabled?: boolean;

}) {

  return (

    <div>

      <label className="block text-xs font-medium text-muted mb-2">

        {label}

      </label>



      <select

        value={value}

        onChange={(event) => onChange(event.target.value)}

        disabled={disabled}

        className="w-full rounded-lg border border-line bg-card-hi px-3 py-2.5 text-sm text-fg outline-none focus:border-primary disabled:opacity-50"

      >

        <option value="">{placeholder}</option>



        {options.map((option) => (

          <option key={option.value} value={option.value}>

            {option.label}

          </option>

        ))}

      </select>

    </div>

  );

}



// ============================================================

// RESULT ITEM

// ============================================================



function ResultItem({ text }: { text: string }) {

  return (

    <div className="flex items-center gap-2">

      <span>✓</span>

      <span>{text}</span>

    </div>

  );

}



// ============================================================

// PILL

// ============================================================



function Pill({

  label,

  tone = "neutral",

}: {

  label: string;

  tone?: "neutral" | "accent" | "warn" | "primary";

}) {

  const styles =

    tone === "accent"

      ? "bg-accent-soft text-accent border-accent/20"

      : tone === "warn"

        ? "bg-[color:var(--warn)]/10 text-[color:var(--warn)] border-[color:var(--warn)]/20"

        : tone === "primary"

          ? "bg-primary/10 text-primary border-primary/20"

          : "bg-card-hi text-muted border-line";



  return (

    <span

      className={`inline-flex items-center px-2.5 py-1 rounded-full border text-[11px] font-medium ${styles}`}

    >

      {label}

    </span>

  );

}
