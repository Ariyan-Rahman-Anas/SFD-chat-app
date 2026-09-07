import { getAvatarColor, getInitials } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { Users } from "lucide-react";

export function Avatar({
  name,
  isGroup = false,
  size = "md",
}: {
  name: string;
  isGroup?: boolean;
  size?: "sm" | "md" | "lg";
}) {
  const sizeClasses = {
    sm: "h-8 w-8 text-xs",
    md: "h-10 w-10 text-sm",
    lg: "h-14 w-14 text-lg",
  };

  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full font-semibold text-white",
        sizeClasses[size],
        getAvatarColor(name),
      )}
    >
      {isGroup ? (
        <Users className={size === "lg" ? "h-6 w-6" : "h-4 w-4"} />
      ) : (
        getInitials(name)
      )}
    </div>
  );
}
