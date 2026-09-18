export function EmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <div className="flex flex-col items-start gap-1 rounded border border-dashed border-neutral-800 px-4 py-6">
      <p className="text-sm font-medium text-neutral-300">{title}</p>
      {description && <p className="text-sm text-neutral-500">{description}</p>}
    </div>
  );
}
