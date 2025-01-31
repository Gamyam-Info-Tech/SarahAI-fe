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
                    <nav className="fixed w-full top-0 left-0 bg-white/80 backdrop-blur-sm border-b">
                        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                            <div className="flex justify-between items-center h-16 sm:h-20">
                                <div className="flex-shrink-0">
                                    <Link href="/" prefetch={true} className="block">
                                        <Image
                                            src="/logo.png"
                                            alt="SARAHAI Logo"
                                            width={100}
                                            height={40}
                                            className="h-8 w-auto sm:h-10 object-contain"
                                            priority
                                        />
                                    </Link>
                                </div>
                                <div className="flex items-center">
                                    <Connect/>
                                </div>
                            </div>
                        </div>
                    </nav>
                    <main className="pt-16 sm:pt-20">
                        {children}
                    </main>
                </div>
            </div>
        </body>
        </html>
    );
}