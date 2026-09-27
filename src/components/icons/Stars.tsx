import { Star, StarFilled } from "./interface";

/** A rank's stars within its title: filled for the ones held, outlined for the rest. Read as "2 of 3 stars". */
export function Stars({ n, of = 3 }: { n: number; of?: number }) {
  return (
    <span className="stars" role="img" aria-label={`${n} of ${of} stars`}>
      {Array.from({ length: of }, (_, i) => (i < n ? <StarFilled key={i} /> : <Star key={i} />))}
    </span>
  );
}
