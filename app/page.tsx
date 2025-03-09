"use client"

import withAuth from "@/components/AuthChecking";
import { BackgroundWave } from "@/components/background-wave";
import WhatsAppTTS from "@/components/WhatsAppTTS";
import AssemblyAISTT from "@/components/AssemblyAISTT";
import { useState, useEffect } from "react";

// Extend the AssemblyAISTT component props to include onConnectionChange
interface AssemblyAISTTProps {
  onConnectionChange: (connected: boolean) => void;
}

// Declare the component with its props
declare module "@/components/AssemblyAISTT" {
  export default function AssemblyAISTT(props: AssemblyAISTTProps): JSX.Element;
}

function Home() {
    const [isConnected, setIsConnected] = useState(false);
    
    // This function will be passed to the AssemblyAISTT component
    // to update connection status
    const handleConnectionChange = (connected: boolean) => {
        setIsConnected(connected);
    };
    
    // Add this useEffect to force scroll to top on page load
    useEffect(() => {
        // Force scroll to top when component mounts
        window.scrollTo(0, 0);
        
        // Additional approach: prevent scroll restoration
        if ('scrollRestoration' in history) {
            history.scrollRestoration = 'manual';
        }
        
        // One more approach to handle any delayed rendering
        const timer = setTimeout(() => {
            window.scrollTo(0, 0);
        }, 100);
        
        return () => clearTimeout(timer);
    }, []);
    
    return (
        <div>
            {/* Background */}
            <BackgroundWave />
            
            {/* Speech-to-Text Section - Full viewport height */}
            <div className="min-h-screen flex flex-col items-center justify-center pt-20 px-4">
                <div className="w-full max-w-3xl mb-8">
                    
                    <div className="w-full">
                        <AssemblyAISTT onConnectionChange={handleConnectionChange} />
                    </div>
                </div>
            </div>
            
            {/* WhatsApp TTS Section */}
            <div className="bg-white min-h-screen py-10">
                <div className="container mx-auto">
                    <div className="flex justify-center m-10 md:m-40">                        
                        {/* WhatsApp TTS */}
                        <div className="w-full md:w-1/2">
                            <h2 className="text-2xl font-bold text-center mb-6">WhatsApp Interface</h2>
                            <div className="border rounded-lg overflow-hidden shadow-md h-[600px]">
                                <WhatsAppTTS />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default withAuth(Home);