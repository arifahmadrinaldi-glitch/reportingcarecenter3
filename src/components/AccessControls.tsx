import { ShieldCheck, ShieldQuestion } from "lucide-react";
import { useAccess } from "@/lib/app-access";

/** Badge role di header kanan atas */
export function AccessControls() {
  const { isAdmin } = useAccess();

  return (
    <div className="flex items-center gap-1.5">
  {isAdmin && (
    <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-1 text-[10px] font-bold uppercase text-primary">
      <ShieldCheck className="size-3" />
      Super User
    </span>
  )}
    </div>
  );
}
