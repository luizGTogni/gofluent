import { Astronaut } from "./icons";

/** The astronaut. */
export function Avatar({ className = "profile-avatar" }: { className?: string }) {
  return (
    <span className={className} aria-hidden>
      <Astronaut />
    </span>
  );
}
