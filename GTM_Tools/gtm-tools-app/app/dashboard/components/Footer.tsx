import { ShieldCheck, Code2 } from "lucide-react";

export default function Footer() {
  return (
    <div className="mt-14 border-t border-line pt-6 flex flex-col sm:flex-row justify-between items-center text-[13px] text-muted gap-3">
      <p className="flex items-center gap-2">
        <Code2 size={14} strokeWidth={1.8} />
        GTM Tools · Next.js · Google Tag Manager API
      </p>

      <p className="flex items-center gap-1.5 text-accent">
        <ShieldCheck size={14} strokeWidth={2} />
        Secure auth enabled
      </p>
    </div>
  );
}
