"use client";

import { useState } from "react";
import Image from "next/image";
import { useGtmAccounts } from "@/hooks/useGtmAccounts";
import AccountContainerModal from "./AccountContainerModal";
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
  const [showModal, setShowModal] = useState(false);

  const { accounts, loading: accountsLoading } = useGtmAccounts();

  const { selectedAccountId, selectedContainerId } = useDashboardStore();
console.log("Navbar render - selectedAccountId:", selectedAccountId, "selectedContainerId:", selectedContainerId);
  const [] = useState(false);

  return (
    <>
      <nav className="sticky top-0 z-50 bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 h-16 flex justify-between items-center">
          {/* Left */}
          <div className="flex items-center gap-6">
            <h1 className="text-lg font-bold text-gray-900">My GTM TOOL</h1>

            <button
              onClick={() => setShowModal(true)}
              className="px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-sm font-semibold text-gray-800"
            >
              Account: {selectedAccountId || "Select"} | Container:{" "}
              {selectedContainerId || "Select"}
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

      <AccountContainerModal
        show={showModal}
        onClose={() => setShowModal(false)}
        accounts={accounts}
        accountsLoading={accountsLoading}
      />
    </>
  );
}



// /* eslint-disable @typescript-eslint/no-explicit-any */
// "use client";

// import Image from "next/image";

// interface NavbarProps {
//   user: any;
//   onLogout: () => void;

//   // GTM selection values
//   selectedAccountName?: string;
//   selectedContainerName?: string;
//   selectedWorkspaceName?: string;

//   // Optional workspace info
//   workspaceChangesCount?: number;
// }

// export default function Navbar({
//   user,
//   onLogout,
//   selectedAccountName,
//   selectedContainerName,
//   selectedWorkspaceName,
//   workspaceChangesCount = 0,
// }: NavbarProps) {
//   return (
//     <header className="w-full border-b bg-white shadow-sm">
//       {/* TOP BAR */}
//       <div className="flex items-center justify-between px-5 h-16">
//         {/* LEFT */}
//         <div className="flex items-center gap-4">
//           {/* Back icon */}
//           <button className="p-2 rounded-full hover:bg-gray-100">
//             ←
//           </button>

//           {/* Logo + Title */}
//           <div className="flex items-center gap-3">
//             <div className="w-9 h-9 flex items-center justify-center rounded-sm">
//               {/* Simple GTM style logo */}
//               <div className="w-6 h-6 bg-blue-600 rotate-45 rounded-sm"></div>
//             </div>

//             <h1 className="text-xl font-semibold text-gray-800">
//               GTM TOOL
//             </h1>
//           </div>

//           {/* Breadcrumb */}
//           <div className="hidden md:flex flex-col leading-tight ml-3">
//             <div className="text-xs text-gray-500">
//               All accounts{" "}
//               <span className="mx-1">{">"}</span>{" "}
//               <span className="text-gray-800 font-medium">
//                 {selectedAccountName || "Select Account"}
//               </span>
//             </div>

//             <div className="text-lg font-medium text-gray-900">
//               {selectedContainerName || "Select Container"}
//               {selectedWorkspaceName ? (
//                 <span className="text-gray-500 font-normal text-sm ml-2">
//                   {selectedWorkspaceName}
//                 </span>
//               ) : null}
//             </div>
//           </div>
//         </div>

//         {/* CENTER SEARCH */}
//         <div className="hidden lg:flex flex-1 justify-center px-6">
//           <div className="w-full max-w-2xl flex items-center gap-3 border border-gray-300 rounded-sm px-4 py-2 bg-gray-50">
//             <span className="text-gray-500">🔍</span>
//             <input
//               placeholder="Search workspace"
//               className="w-full bg-transparent outline-none text-sm text-gray-700"
//             />
//           </div>
//         </div>

//         {/* RIGHT */}
//         <div className="flex items-center gap-4">
//           {/* Grid Icon */}
//           <button className="p-2 rounded-full hover:bg-gray-100 text-gray-600">
//             ⬛⬛
//           </button>

//           {/* Help */}
//           <button className="p-2 rounded-full hover:bg-gray-100 text-gray-600">
//             ?
//           </button>

//           {/* More */}
//           <button className="p-2 rounded-full hover:bg-gray-100 text-gray-600">
//             ⋮
//           </button>

//           {/* Profile */}
//           <div className="flex items-center gap-2">
//             {user?.picture ? (
//               <Image
//                 src={user.picture}
//                 alt="User"
//                 width={32}
//                 height={32}
//                 className="rounded-full"
//               />
//             ) : (
//               <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-bold">
//                 {(user?.name?.charAt(0) || "U").toUpperCase()}
//               </div>
//             )}
//           </div>
//         </div>
//       </div>

//       {/* SECOND BAR */}
//       <div className="flex items-center justify-between px-5 h-12 border-t bg-white">
//         {/* LEFT MENU */}
//         <div className="flex items-center gap-8 text-sm font-medium text-gray-600">
//           <button className="text-blue-600 border-b-2 border-blue-600 h-12 px-1">
//             Workspace
//           </button>

//           <button className="hover:text-gray-900">
//             Versions
//           </button>

//           <button className="hover:text-gray-900">
//             Admin
//           </button>
//         </div>

//         {/* RIGHT BUTTONS */}
//         <div className="flex items-center gap-4">
//           {/* Container ID */}
//           <p className="text-sm text-blue-600 font-medium hidden md:block">
//             GTM-XXXXXXX
//           </p>

//           {/* Workspace Changes */}
//           <p className="text-sm text-gray-600 hidden md:block">
//             Workspace Changes:{" "}
//             <span className="font-semibold">{workspaceChangesCount}</span>
//           </p>

//           {/* Preview Button */}
//           <button className="px-4 py-1.5 border border-gray-300 rounded-sm text-sm font-medium text-blue-600 hover:bg-gray-50">
//             Preview
//           </button>

//           {/* Submit Button */}
//           <button className="px-5 py-1.5 bg-blue-600 text-white rounded-sm text-sm font-semibold hover:bg-blue-700">
//             Submit
//           </button>

//           {/* Logout small */}
//           <button
//             onClick={onLogout}
//             className="ml-2 text-sm text-gray-600 hover:text-red-600"
//           >
//             Logout
//           </button>
//         </div>
//       </div>
//     </header>
//   );
// }

