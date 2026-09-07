import { formatDayDivider } from "@/lib/utils";

export function DateDivider({ iso }: { iso: string }) {
  return (
    <div className="my-4 flex items-center gap-3">
      <div className="h-px flex-1 bg-neutral-200" />
      <span className="text-xs font-medium text-neutral-400">
        {formatDayDivider(iso)}
      </span>
      <div className="h-px flex-1 bg-neutral-200" />
    </div>
  );
}
