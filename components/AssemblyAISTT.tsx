"use client"

import { Button } from "@/components/ui/button";
import React, { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Volume2, Mic, MicOff, RefreshCw } from 'lucide-react';

// Enable debug mode
const DEBUG = true;

export default function AssemblyAISTT() {
  // State variables
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [responseText, setResponseText] = useState('');
  const [statusMessage, setStatusMessage] = useState('Ready');
  const [connectionState, setConnectionState] = useState<'open' | 'closed'>('closed');
  const [isInitializing, setIsInitializing] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [responseType, setResponseType] = useState<'text' | 'voice'>('text');
  const [audioResponse, setAudioResponse] = useState<string | null>(null);
  
  // References
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const sessionIdRef = useRef<string>(`session-${Date.now()}`);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  
  // Initialize component
  useEffect(() => {
    const initialize = async (): Promise<void> => {
      try {
        setIsInitializing(true);
        if (DEBUG) console.log("Starting initialization...");
        
        // Check if user is logged in
        const userInfo = getUserInfo();
        if (!userInfo) {
          console.warn("User is not logged in");
          setStatusMessage('Please log in to use speech recognition');
          setIsInitializing(false);
          return;
        }
        
        setStatusMessage('Ready to listen');
      } catch (error) {
        console.error('Failed to initialize:', error);
        setStatusMessage('Failed to initialize speech recognition');
      } finally {
        setIsInitializing(false);
      }
    };
    
    initialize();
    
    // Cleanup function
    return () => {
      closeConnection();
      stopMediaStream();
    };
  }, []);

  // Interface for user info
  interface UserInfo {
    sara_token: string;
    user_id: string;
    user_name: string;
  }
  
  // Get user information from localStorage
  const getUserInfo = (): UserInfo | null => {
    try {
      const sara_token = localStorage.getItem("sara_token");
      const user_id = localStorage.getItem("id");
      const user_name = localStorage.getItem("user_name");
      
      if (!sara_token || !user_id) {
        console.error("Missing user authentication data");
        return null;
      }
      
      return {
        sara_token,
        user_id,
        user_name: user_name || "unknown"
      };
    } catch (error) {
      console.error("Error getting user info:", error);
      return null;
    }
  };
  
  // Function to establish WebSocket connection to our backend
  const connectWebSocket = (): boolean => {
    try {
      const userInfo = getUserInfo();
      if (!userInfo) return false;
      
      // Close existing connection if any
      closeConnection();
      
      // Create a new session ID for this connection
      const sessionId = `session-${Date.now()}`;
      sessionIdRef.current = sessionId;
      
      // Connect to our Django backend WebSocket endpoint
      // IMPORTANT: Using explicit localhost:8000 to connect to our Daphne server
      const wsUrl = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//localhost:8000/ws/assembly/${userInfo.user_id}/${sessionId}/`;
      
      if (DEBUG) console.log(`Connecting to WebSocket: ${wsUrl}`);
      
      const socket = new WebSocket(wsUrl);
      
      socket.onopen = () => {
        if (DEBUG) console.log("WebSocket connection opened successfully!");
        setConnectionState('open');
        setStatusMessage('Connected to speech service');
      };
      
      // Inside your socket.onmessage handler

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (DEBUG) console.log("Received message:", data);
          
          if (data.type === 'partial_transcript') {
            // Handle partial transcript (optional UI update)
            if (DEBUG) console.log("Partial transcript:", data.text);
          } 
          else if (data.type === 'final_transcript') {
            // Handle final transcript and bot response
            if (data.bot_response) {
              let responseContent = "";
              
              // Check for error responses
              const isErrorResponse = 
                data.bot_response.status === false || 
                (typeof data.bot_response.response === 'string' && 
                data.bot_response.response.includes("Sorry, I'm having trouble"));
              
              // Only process and display successful responses
              if (!isErrorResponse) {
                // Extract response content based on structure
                if (typeof data.bot_response === 'string') {
                  responseContent = data.bot_response;
                } else if (data.bot_response.response) {
                  responseContent = data.bot_response.response;
                } else if (typeof data.bot_response === 'object') {
                  responseContent = JSON.stringify(data.bot_response);
                }
                
                if (DEBUG) console.log("Bot response:", responseContent);
                setResponseText(responseContent);
                
                // Handle audio response if available
                if (data.audio_response && data.response_type === 'voice') {
                  setResponseType('voice');
                  setAudioResponse(data.audio_response);
                  playAudioResponse(data.audio_response);
                } else {
                  setResponseType('text');
                  setAudioResponse(null);
                }
              } else {
                // Display error message instead of ignoring it
                if (DEBUG) console.log("Received error response, displaying to user");
                const errorMessage = typeof data.bot_response === 'object' && data.bot_response.response 
                  ? data.bot_response.response 
                  : "Sorry, there was an error processing your request.";
                setResponseText(`Error: ${errorMessage}`);
                setResponseType('text');
                setAudioResponse(null);
              }
            } else {
              if (DEBUG) console.log("No bot response in final_transcript message");
            }
          }
          // Other handlers...
        } catch (error) {
          console.error("Error processing message:", error);
        }
      };
      
      socket.onerror = (error) => {
        console.error("WebSocket error details:", error);
        setStatusMessage('Connection error');
        setConnectionError("Connection failed");
      };
      
      socket.onclose = (event) => {
        if (DEBUG) console.log("WebSocket closed:", event.code, event.reason);
        setConnectionState('closed');
        
        if (event.code !== 1000) {
          setStatusMessage(`Connection closed: ${event.reason || 'Unknown reason'}`);
          if (isListening) setIsListening(false);
        }
      };
      
      wsRef.current = socket;
      return true;
      
    } catch (error) {
      console.error("Error connecting to WebSocket:", error);
      setStatusMessage(`Failed to connect to speech service: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setConnectionError(error instanceof Error ? error.message : "Unknown error");
      return false;
    }
  };
  
  // Function to get user's microphone permission
  async function requestMicrophonePermission(): Promise<{
    success: boolean;
    stream?: MediaStream;
    error?: Error | unknown;
  }> {
    try {
      if (DEBUG) console.log("Requesting microphone permission...");
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });
      if (DEBUG) console.log("Microphone permission granted!");
      return { success: true, stream };
    } catch (error) {
      console.error('Microphone permission denied:', error);
      return { success: false, error };
    }
  }
  
  // Start listening for speech
  const startListening = async (): Promise<void> => {
    if (DEBUG) console.log("Starting listening process...");
    setConnectionError(null);
    
    try {
      // First, get microphone permission
      const { success, stream, error } = await requestMicrophonePermission();
      
      if (!success || !stream) {
        setStatusMessage(`Microphone access denied: ${error instanceof Error ? error.message : 'Unknown error'}`);
        return;
      }
      
      // Save the stream for later cleanup
      mediaStreamRef.current = stream;
      
      // Connect to our backend WebSocket
      if (!connectWebSocket()) {
        stopMediaStream();
        return;
      }
      
      // Set up audio processing to send audio chunks to WebSocket
      // We use 16kHz sample rate to match AssemblyAI's requirements
      const audioContext = new (window.AudioContext || 
        // Use type assertion for webkitAudioContext
        (window as any).webkitAudioContext)({
        sampleRate: 16000, // Explicitly set to 16kHz
        latencyHint: 'interactive'
      });
      
      audioContextRef.current = audioContext;
      
      // Create audio source from the microphone stream
      const source = audioContext.createMediaStreamSource(stream);
      sourceRef.current = source;
      
      // Use 4096 buffer size (power of 2, approximately 256ms of audio at 16kHz)
      const processor = audioContext.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;
      
      processor.onaudioprocess = (e: AudioProcessingEvent) => {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          // Get audio data from the first channel
          const inputData = e.inputBuffer.getChannelData(0);
          
          // Convert to 16-bit PCM
          const pcmData = convertFloat32ToInt16(inputData);
          
          // Send audio data as binary
          if (pcmData.byteLength > 0) {
            wsRef.current.send(pcmData);
          }
        }
      };
      
      // Connect the audio graph
      source.connect(processor);
      processor.connect(audioContext.destination);
      
      // Update state
      setIsListening(true);
      setStatusMessage('Listening...');
      
    } catch (error) {
      console.error('Error starting listening:', error);
      setStatusMessage(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };
  
  // Stop listening for speech
  const stopListening = (): void => {
    if (DEBUG) console.log("Stopping listening process...");
    
    // Stop any playing audio response
    if (audioRef.current) {
      try {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      } catch (audioError) {
        console.error("Error stopping audio playback:", audioError);
      }
    }
    
    // Send termination message to WebSocket
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      try {
        wsRef.current.send(JSON.stringify({ command: 'terminate' }));
        if (DEBUG) console.log("Sent termination command to WebSocket");
      } catch (error) {
        console.error("Error sending termination message:", error);
      }
    }
    
    // Disconnect audio processing
    if (sourceRef.current && processorRef.current) {
      try {
        sourceRef.current.disconnect(processorRef.current);
        processorRef.current.disconnect();
      } catch (disconnectError) {
        console.error("Error disconnecting audio:", disconnectError);
      }
      sourceRef.current = null;
      processorRef.current = null;
    }
    
    // Close audio context
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      try {
        audioContextRef.current.close().catch(err => console.error("Error closing audio context:", err));
      } catch (closeError) {
        console.error("Error closing audio context:", closeError);
      }
      audioContextRef.current = null;
    }
    
    closeConnection();
    stopMediaStream();
    
    setIsListening(false);
    setStatusMessage('Stopped listening');
    
    // Reset response state
    setResponseText('');
    setAudioResponse(null);
    setResponseType('text');
  };
  
  // Close WebSocket connection
  const closeConnection = (): void => {
    if (wsRef.current) {
      try {
        if (wsRef.current.readyState !== WebSocket.CLOSED && 
            wsRef.current.readyState !== WebSocket.CLOSING) {
          wsRef.current.close(1000, "User ended session");
          if (DEBUG) console.log("Closed WebSocket connection");
        }
      } catch (error) {
        console.error("Error closing WebSocket:", error);
      } finally {
        wsRef.current = null;
      }
    }
  };
  
  // Stop and cleanup media stream
  const stopMediaStream = (): void => {
    if (DEBUG) console.log("Stopping media stream...");
    
    if (mediaStreamRef.current) {
      try {
        mediaStreamRef.current.getTracks().forEach((track: MediaStreamTrack) => track.stop());
        if (DEBUG) console.log("Stopped all media tracks");
      } catch (trackError) {
        console.error("Error stopping tracks:", trackError);
      } finally {
        mediaStreamRef.current = null;
      }
    }
  };
  
  // Helper function to convert audio data for transmission
  const convertFloat32ToInt16 = (float32Array: Float32Array): ArrayBuffer => {
    const length = float32Array.length;
    const int16Array = new Int16Array(length);
    
    for (let i = 0; i < length; i++) {
      // Convert float audio sample to 16-bit
      // Match the format from the PyAudio example
      const s = Math.max(-1, Math.min(1, float32Array[i]));
      int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }
    
    return int16Array.buffer;
  };
  
  // Reset the conversation
  const resetConversation = (): void => {
    if (DEBUG) console.log("Resetting conversation...");
    
    setResponseText('');
    setAudioResponse(null);
    
    // Stop any playing audio
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  };
  
  // Play audio response
  const playAudioResponse = (base64Audio: string): void => {
    try {
      // Convert base64 to blob
      const byteCharacters = atob(base64Audio);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'audio/mpeg' });
      
      // Create object URL
      const audioUrl = URL.createObjectURL(blob);
      
      // Play audio
      if (audioRef.current) {
        audioRef.current.src = audioUrl;
        audioRef.current.play().catch((error: Error) => {
          console.error("Error playing audio:", error);
        });
      }
    } catch (error) {
      console.error("Error playing audio response:", error);
    }
  };
  
  // Listen for keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      // Space bar to toggle listening (only when not in an input/textarea)
      if (e.code === 'Space' && 
          e.target instanceof HTMLElement && 
          e.target.tagName !== 'INPUT' && 
          e.target.tagName !== 'TEXTAREA' && 
          !e.target.isContentEditable) {
        e.preventDefault();
        if (isListening) {
          stopListening();
        } else {
          startListening();
        }
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isListening]);
  
  return (
    <div className="flex justify-center items-center min-h-[36px]">
      <Card className="rounded-xl w-full max-w-sm">
        <CardContent className="p-6">
          <CardHeader className="px-0">
            <CardTitle className="text-center text-2xl">
              SARAH AI
            </CardTitle>
          </CardHeader>
          
          <div className="flex flex-col gap-y-6 text-center">
            <div className={cn('orb my-16 mx-auto w-24 h-24',
              isListening ? 'animate-orb' : (isProcessing && 'animate-orb-slow'),
              (isListening || isProcessing) ? 'orb-active' : 'orb-inactive')}
            ></div>
            
            <div className="text-lg font-medium flex items-center justify-center">
              {isInitializing ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Initializing...
                </>
              ) : isListening ? (
                <>Listening...</>
              ) : isProcessing ? (
                <>Processing...</>
              ) : (
                <>{statusMessage}</>
              )}
            </div>
            
            {connectionError && (
              <div className="text-red-500 text-sm">
                Connection error: {connectionError}
              </div>
            )}
            
            <div className="flex justify-center gap-4">
              {!isListening ? (
                <Button
                  variant="outline"
                  className="rounded-full"
                  size="lg"
                  disabled={isProcessing || isInitializing}
                  onClick={startListening}
                >
                  <Mic className="mr-2 h-4 w-4" />
                  Start Listening
                </Button>
              ) : (
                <Button
                  variant="outline"
                  className="rounded-full bg-red-50"
                  size="lg"
                  onClick={stopListening}
                >
                  <MicOff className="mr-2 h-4 w-4" />
                  Stop Listening
                </Button>
              )}
            </div>
            
            {/* Display response text if available */}
            {responseText && (
              <div className="mt-4 p-3 bg-gray-50 rounded-lg text-left">
                <p className="text-sm">{responseText}</p>
              </div>
            )}
            
            {/* Hidden audio element for playing responses */}
            <audio ref={audioRef} style={{ display: 'none' }} />
            
            {connectionState !== 'open' && isListening && (
              <div className="text-amber-500 mt-2 flex items-center justify-center">
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Connecting to speech service...
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}