// import {ConvAI} from "@/components/ConvAI";
// import LoginForm from "@/components/LoginForm";

// export default function Home() {
//     return (
//         // <div
//         //     className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
//             // {/* <main className="flex flex-col gap-8 row-start-2 items-center">
//             //     <ConvAI/>
//             // </main> */}
//             <LoginForm type={"login"}/>
//         // </div>
//     );
// }


"use client"

import ConvAI from "@/components/ConvAI";
import dynamic from 'next/dynamic'
import withAuth from "@/components/AuthChecking";


function Home() {
    return (
   
        <div
            className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
            <main className="flex flex-col gap-8 row-start-2 items-center">
                <ConvAI/>
            </main>
        </div>

    );
}
export default withAuth(Home);