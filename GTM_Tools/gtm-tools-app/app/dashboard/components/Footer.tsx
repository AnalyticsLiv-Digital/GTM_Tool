import { ShieldCheck, Code2 } from "lucide-react";

export default function Footer() {
  return (
    <div className="mt-14 border-t pt-6 flex flex-col sm:flex-row justify-between items-center text-sm text-gray-500 gap-4">
      <p className="flex items-center gap-2">
        <Code2 size={16} />
        GTM Tools Dashboard • Built with Next.js + OAuth + Google Tag Manager API
      </p>

      <p className="flex items-center gap-2 text-green-700 font-semibold">
        <ShieldCheck size={16} />
        Secure Auth Enabled
      </p>
    </div>
  );
}

// export default function Footer() {
//   return (
//     <div className="mt-14 text-center text-sm text-gray-500">
//       <p>
//         GTM Tools Dashboard • Built with Next.js • OAuth + Google Tag Manager API
//       </p>
//     </div>
//   );
// }