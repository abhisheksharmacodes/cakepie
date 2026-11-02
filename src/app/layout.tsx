import type { Metadata } from "next";
import { TimerProvider } from "@/components/TimerContext";
import { Navbar } from "@/components/Navbar";
import "./globals.css";

export const metadata: Metadata = {
  title: "CakePie - Daily Time Tracker",
  description: "A daily time tracking application built with Next.js and MongoDB",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full antialiased">
      <body
        className="min-h-full flex flex-col bg-stone-50 text-slate-900"
        style={{ fontFamily: "Arial, Helvetica, sans-serif" }}
      >
        <TimerProvider>
          <Navbar />
          <main className="flex-1 w-full max-w-5xl mx-auto p-4 sm:p-6 lg:p-8 flex flex-col">
            {children}
          </main>
        </TimerProvider>
      </body>
    </html>
  );
}
