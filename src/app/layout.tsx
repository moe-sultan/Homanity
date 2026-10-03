import type { Metadata } from "next";
import "leaflet/dist/leaflet.css";
import "./globals.css";
import { Header } from "@/components/Header";
import { StoreProvider } from "@/lib/store";

export const metadata: Metadata = {
  title: "Homanity",
  description: "Your home should fit your life, not just your search criteria.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <StoreProvider>
          <Header />
          <main>{children}</main>
          <footer className="footer">
            <div className="container">
              Hackathon demo. Listings are a small curated sample, typical rents are indicative benchmarks, and travel times are
              estimates from distance and transport links. Use them to ask better questions, not as a final answer.
            </div>
          </footer>
        </StoreProvider>
      </body>
    </html>
  );
}
