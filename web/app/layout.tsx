import "./styles/globals.css";

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
      <body className="min-h-screen bg-gray-50 text-gray-900">
        <main className="min-h-screen">
          <header className="border-b bg-white">
            <div className="mx-auto max-w-6xl px-4 py-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h1 className="text-lg font-semibold">3m Dashboard</h1>
                  <p className="text-sm text-gray-600">
                    ローカル運用向けの取引可視化MVP
                  </p>
                </div>
              </div>

              <nav className="mt-4 flex flex-wrap gap-2 text-sm">
                <Link
                  href="/"
                  className="rounded-md px-3 py-2 hover:bg-gray-100"
                >
                  Dashboard
                </Link>
                <Link
                  href="/transactions"
                  className="rounded-md px-3 py-2 hover:bg-gray-100"
                >
                  Transactions
                </Link>
                <Link
                  href="/transactions/new"
                  className="rounded-md px-3 py-2 hover:bg-gray-100"
                >
                  New Entry
                </Link>
                <Link
                  href="/receipts/upload"
                  className="rounded-md px-3 py-2 hover:bg-gray-100"
                >
                  Receipt Upload
                </Link>
                <Link
                  href="/imports"
                  className="rounded-md px-3 py-2 hover:bg-gray-100"
                >
                  CSV Import
                </Link>
                <Link
                  href="/triage"
                  className="rounded-md px-3 py-2 hover:bg-gray-100"
                >
                  Triage Queue
                </Link>
                <Link
                  href="/vendors"
                  className="rounded-md px-3 py-2 hover:bg-gray-100"
                >
                  Vendors
                </Link>
                <Link
                  href="/categories"
                  className="rounded-md px-3 py-2 hover:bg-gray-100"
                >
                  Categories
                </Link>
              </nav>
            </div>
          </header>

          <div className="mx-auto max-w-6xl px-4 py-6">
            {children}
          </div>
        </main>
      </body>
    </html>
  );
}
