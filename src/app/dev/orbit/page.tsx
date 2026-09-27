import { notFound } from "next/navigation";
import { OrbitPreview } from "./OrbitPreview";

/** Dev only: the orbit card in its main states, on local test data. */
export default function Page() {
  if (process.env.NODE_ENV === "production") notFound();
  return <OrbitPreview />;
}
