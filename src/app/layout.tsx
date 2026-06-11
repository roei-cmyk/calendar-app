import type { Metadata } from "next";
import { Heebo } from "next/font/google";
import "./globals.css";

// Heebo ships full Hebrew + Latin glyph coverage — essential for an RTL app.
const heebo = Heebo({
  subsets: ["hebrew", "latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-heebo",
  display: "swap",
});

export const metadata: Metadata = {
  title: "KNBL Content Planner",
  description: "לוח תוכן לניהול פרסומים ללקוחות KNBL",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="he" dir="rtl" className={heebo.variable}>
      <body className="bg-canvas font-sans text-ink antialiased">
        {children}
      </body>
    </html>
  );
}
