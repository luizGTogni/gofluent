/** The astronaut. */
export function Avatar({ className = "profile-avatar" }: { className?: string }) {
  return (
    <span className={className} aria-hidden>
      🧑‍🚀
    </span>
  );
}
