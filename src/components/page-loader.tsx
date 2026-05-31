export default function PageLoader({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center gap-4">
      <span className="size-9 animate-spin rounded-full border-[3px] border-white/15 border-t-[#00e87a]" />
      {label && (
        <p className="text-sm text-gray-500 animate-pulse">{label}</p>
      )}
    </div>
  );
}
