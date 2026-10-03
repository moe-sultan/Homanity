import Link from "next/link";
import { allPhotos } from "@/lib/data/photos";

export const metadata = { title: "Photo credits · Homanity" };

export default function CreditsPage() {
  const photos = allPhotos();
  return (
    <div className="container fade-in">
      <h1>Photo credits</h1>
      <p className="sub">
        Photos are freely licensed from Wikimedia Commons. They show the area or the type of home, not a specific listing.
      </p>
      {photos.length === 0 ? (
        <p className="muted">No photos yet. Run <code>npm run fetch:photos</code> to add them; until then the app uses drawings.</p>
      ) : (
        <div className="credits-list section">
          {photos.map((p) => (
            <figure key={p.src}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.src} alt={p.title} loading="lazy" />
              <figcaption>
                <a href={p.sourceUrl} target="_blank" rel="noreferrer">{p.title}</a> by {p.credit},{" "}
                {p.licenseUrl ? <a href={p.licenseUrl} target="_blank" rel="noreferrer">{p.license}</a> : p.license}
              </figcaption>
            </figure>
          ))}
        </div>
      )}
      <p className="section"><Link href="/" className="btn btn-ghost">Back to start</Link></p>
    </div>
  );
}
