import { Header } from "./Header";
import { Footer } from "./Footer";

interface SiteShellProps {
  children: React.ReactNode;
}

export function SiteShell({ children }: SiteShellProps) {
  return (
    <>
      <Header />
      <main id="main" className="flex-1 bg-background text-foreground">
        {children}
      </main>
      <Footer />
    </>
  );
}
