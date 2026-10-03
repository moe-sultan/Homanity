import type { Metadata } from "next";
import "leaflet/dist/leaflet.css";
import "./globals.css";
import { DataSources } from "@/components/DataSources";
import { Header } from "@/components/Header";
import { LiveProvider } from "@/lib/live";
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
          <LiveProvider>
            <Header />
            <main>{children}</main>
            <footer className="footer">
              <div className="container row">
                <span>Hackathon demo. Use these numbers to ask better questions, not as a final answer.</span>
                <DataSources />
              </div>
            </footer>
          </LiveProvider>
        </StoreProvider>
      </body>
    </html>
  );
}
