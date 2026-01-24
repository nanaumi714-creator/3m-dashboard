import "./styles/globals.css";
import Link from "next/link";

export const metadata = {
  title: "3m Dashboard",
  description: "Freelance money flow tracker"
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body>
        <main>
          <header>
            <div>
              <h1>3m Dashboard</h1>
              <p className="notice">ローカル運用向けの取引可視化MVP</p>
            </div>
            <nav>
              <Link href="/" className="active">
                Dashboard
              </Link>
              <Link href="/transactions">Transactions</Link>
              <Link href="/triage">Triage Queue</Link>
              <Link href="/vendors">Vendors</Link>
              <Link href="/categories">Categories</Link>
            </nav>
          </header>
          {children}
        </main>
      </body>
    </html>
  );
}
