import type {Metadata} from "next";
import "./globals.css";
import {BackgroundWave} from "@/components/background-wave";
import Link from "next/link";
import Image from "next/image";
import Connect from "@/components/Connect";

export const metadata: Metadata = {
    title: "ConvAI",
};

export default function RootLayout({children}: Readonly<{ children: React.ReactNode }>) {
    return (
        <html lang="en" className="h-full w-full">
        <body className="antialiased w-full h-full">
            <div className="relative min-h-screen">
                {/* Background layer */}
                <BackgroundWave />
                
                {/* Content layer */}
                <div className="relative z-10">
                    <nav className="sm:fixed w-full top-0 left-0 py-4 px-8 bg-white/80 backdrop-blur-sm">
                        <div className="flex justify-between w-full">
                            <Link href="/" prefetch={true}>
                                <Image
                                    src="/logo.png"
                                    alt="SARAHAI Logo"
                                    width={120}
                                    height={40}
                                    className="object-contain"
                                />
                            </Link>
                            <Connect/>
                        </div>
                    </nav>
                    <main className="pt-20">
                        {children}
                    </main>
                </div>
            </div>
        </body>
        </html>
    );
}