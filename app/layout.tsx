import type {Metadata} from "next";
import "./globals.css";
import {BackgroundWave} from "@/components/background-wave";
import Link from "next/link";
import Connect from "@/components/Connect";

export const metadata: Metadata = {
    title: "ConvAI",
};

export default function RootLayout({children}: Readonly<{ children: React.ReactNode }>) {
    return (
        <html lang="en" className={"h-full w-full"}>
        <body className={`antialiased w-full h-full lex flex-col`}>
        <div className="flex flex-col flex-grow w-full items-center justify-center sm:px-4 ">
            <nav
                className={
                    "sm:fixed w-full top-0 left-0 py-4 px-8"
                }
            >
                <div className={"flex justify-between w-[100%]  "}>
                    <Link href={"/"} prefetch={true}>
                       <p className="text-[24px] font-[700]">SARAHAI</p>
                    </Link>
              <Connect/>
                </div>
            </nav>
            {children}
            <BackgroundWave/>
        </div>
        </body>
        </html>
    );
}
