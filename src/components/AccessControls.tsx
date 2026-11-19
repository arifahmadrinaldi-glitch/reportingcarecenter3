import { ShieldCheck, ShieldQuestion } from "lucide-react";
import { useAccess } from "@/lib/app-access";

/** Badge role di header kanan atas */
export function AccessControls() {
  const { isAdmin } = useAccess();

  return (
    <div className="flex items-center gap-1.5">
      <span
        className={`hidden items-center gap-1 rounded-full px-2 py-1 text-[10px] font-bold uppercase sm:inline-flex ${
          isAdmin
            ? "bg-primary/10 text-primary"
            : "bg-muted text-muted-foreground"
        }`}
      >
        {isAdmin ? <ShieldCheck className="size-3" /> : <ShieldQuestion className="size-3" />}
        {isAdmin ? "Super User" : "User Biasa"}
      </span>
    </div>
  );
}
