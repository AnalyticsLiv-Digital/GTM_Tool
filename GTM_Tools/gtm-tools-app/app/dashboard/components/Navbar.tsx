"use client";

import Image from "next/image";
import UnifiedSelectionModal from "./UnifiedSelectionModal";
import { useDashboardStore } from "@/app/store/useDashboardStore";

export default function Navbar({
  user,
  onLogout,
}: {
  user: {
    picture?: string | null;
  } | null;
  onLogout: () => void;
}) {
  const {
    selectedAccountId,
    selectedContainerId,
    selectedWorkspaceId,

    // 👇 NEW (must exist in store)
    selectedAccountName,
    selectedContainerName,
    selectedWorkspaceName,

    showSelectionModal,
    setShowSelectionModal,
  } = useDashboardStore();

  return (
    <>
      <nav className="sticky top-0 z-50 bg-white border-b shadow-sm">
        <div className="w-full px-4 h-16 flex justify-between items-center">
          {/* Left */}
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-bold text-gray-900 whitespace-nowrap">
              MY GTM TOOL
            </h1>

            <button
              onClick={() => setShowSelectionModal(true)}
              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-sm font-semibold text-white"
            >
              {selectedAccountId && selectedContainerId && selectedWorkspaceId
                ? `${selectedAccountName} → ${selectedContainerName} → ${selectedWorkspaceName}`
                : "Select Account / Container / Workspace"}
            </button>
          </div>

          {/* Right */}
          <div className="flex items-center gap-4">
            {user?.picture && (
              <Image
                src={user.picture}
                alt="user"
                width={36}
                height={36}
                className="rounded-full"
              />
            )}

            <button
              onClick={onLogout}
              className="text-sm font-semibold text-gray-700 hover:text-black"
            >
              Logout
            </button>
          </div>
        </div>
      </nav>

      {/* UNIFIED SELECTION MODAL */}
      <UnifiedSelectionModal
        show={showSelectionModal}
        onClose={() => setShowSelectionModal(false)}
      />
    </>
  );
}
// "use client";

// import { useState } from "react";
// import Image from "next/image";
// import { useGtmAccounts } from "@/hooks/useGtmAccounts";
// import AccountContainerModal from "./AccountContainerModal";
// import { useDashboardStore } from "@/app/store/useDashboardStore";

// export default function Navbar({
//   user,
//   onLogout,
// }: {
//   user: {
//     picture?: string | null;
//   } | null;
//   onLogout: () => void;
// }) {
//   const [showModal, setShowModal] = useState(false);

//   const { accounts, loading: accountsLoading } = useGtmAccounts();

//   const { selectedAccountId, selectedContainerId } = useDashboardStore();
// console.log("Navbar render - selectedAccountId:", selectedAccountId, "selectedContainerId:", selectedContainerId);
//   const [] = useState(false);

//   return (
//     <>
//       <nav className="sticky top-0 z-50 bg-white border-b shadow-sm">
//         <div className="max-w-7xl mx-auto px-4 h-16 flex justify-between items-center">
//           {/* Left */}
//           <div className="flex items-center gap-6">
//             <h1 className="text-lg font-bold text-gray-900">My GTM TOOL</h1>

//             <button
//               onClick={() => setShowModal(true)}
//               className="px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-sm font-semibold text-gray-800"
//             >
//               Account: {selectedAccountId || "Select"} | Container:{" "}
//               {selectedContainerId || "Select"}
//             </button>
//           </div>

//           {/* Right */}
//           <div className="flex items-center gap-4">
//             {user?.picture && (
//               <Image
//                 src={user.picture}
//                 alt="user"
//                 width={36}
//                 height={36}
//                 className="rounded-full"
//               />
//             )}

//             <button
//               onClick={onLogout}
//               className="text-sm font-semibold text-gray-700 hover:text-black"
//             >
//               Logout
//             </button>
//           </div>
//         </div>
//       </nav>

//       <AccountContainerModal
//         show={showModal}
//         onClose={() => setShowModal(false)}
//         accounts={accounts}
//         accountsLoading={accountsLoading}
//       />
//     </>
//   );
// }

