export function ComingSoonTab({ message }: { message: string }) {
  return (
    <div className="rounded-card border border-(--color-border) bg-(--color-surface) p-10 text-center text-[13.5px] text-(--color-fg-faint) shadow-card">
      {message}
    </div>
  );
}
