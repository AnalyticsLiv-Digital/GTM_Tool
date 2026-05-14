"use client";

import { useEffect, useRef, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { _registerDialog, type DialogState } from "@/lib/ui/dialog";

export function DialogHost() {
  const [state, setState] = useState<DialogState | null>(null);
  const confirmBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    _registerDialog(setState);
    return () => _registerDialog(null);
  }, []);

  const close = (value: boolean) => {
    state?.resolve(value);
    setState(null);
  };

  const danger = state?.danger ?? false;

  const confirmClass = danger
    ? "bg-(--danger) hover:bg-(--danger)/90 text-white"
    : "bg-(--accent) hover:bg-(--accent)/90 text-white";

  return (
    <Modal
      open={!!state}
      onClose={() => close(false)}
      title={state?.title}
      description={state?.description}
      size="sm"
      initialFocusRef={confirmBtnRef}
      footer={
        <div className="flex justify-end gap-2 w-full">
          {/* CANCEL BUTTON */}
          <button
            type="button"
            onClick={() => close(false)}
            className="
              px-4 py-2 rounded-xl text-sm font-medium
              bg-card border border-line
              text-fg hover:bg-card-hi
              transition-colors
            "
          >
            {state?.cancelLabel ?? "Cancel"}
          </button>

          {/* CONFIRM BUTTON */}
          <button
            ref={confirmBtnRef}
            type="button"
            onClick={() => close(true)}
            className={`
              px-4 py-2 rounded-xl text-sm font-medium
              shadow-sm transition-colors
              ${confirmClass}
            `}
          >
            {state?.confirmLabel ?? (danger ? "Delete" : "Confirm")}
          </button>
        </div>
      }
    />
  );
}



// "use client";

// import { useEffect, useRef, useState } from "react";
// import { Modal } from "@/components/ui/Modal";
// import { _registerDialog, type DialogState } from "@/lib/ui/dialog";

// export function DialogHost() {
//   const [state, setState] = useState<DialogState | null>(null);
//   const confirmBtnRef = useRef<HTMLButtonElement>(null);

//   useEffect(() => {
//     _registerDialog(setState);
//     return () => _registerDialog(null);
//   }, []);

//   const close = (value: boolean) => {
//     state?.resolve(value);
//     setState(null);
//   };

//   const danger = state?.danger ?? false;
//   const confirmClass = danger
//     ? "bg-red-600 hover:bg-red-700 text-white"
//     : "bg-primary-600 hover:bg-primary-700 text-white";

//   return (
//     <Modal
//       open={!!state}
//       onClose={() => close(false)}
//       title={state?.title}
//       description={state?.description}
//       size="sm"
//       initialFocusRef={confirmBtnRef}
//       footer={
//         <>
//           <button
//             type="button"
//             onClick={() => close(false)}
//             className="px-4 py-2 rounded-lg text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50"
//           >
//             {state?.cancelLabel ?? "Cancel"}
//           </button>
//           <button
//             ref={confirmBtnRef}
//             type="button"
//             onClick={() => close(true)}
//             className={`px-4 py-2 rounded-lg text-sm font-medium ${confirmClass}`}
//           >
//             {state?.confirmLabel ?? (danger ? "Delete" : "Confirm")}
//           </button>
//         </>
//       }
//     />
//   );
// }
