"use client"

import { Button } from "@/components/ui/button";
import React, { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Volume2, Mic, MicOff, RefreshCw } from 'lucide-react';

// Enable debug mode
const DEBUG = true;

// Remove the hardcoded API key since we'll use the server-side API route
// const ASSEMBLYAI_API_KEY = "59b28f55a01f4f67a59f89baca8e25b0";

export default function AssemblyAISTT() {
  // State variables
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [responseText, setResponseText] = useState('');
  const [statusMessage, setStatusMessage] = useState('Ready');
  const [connectionState, setConnectionState] = useState('closed');
  const [isInitializing, setIsInitializing] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [responseType, setResponseType] = useState('text'); // 'text' or 'voice'
  const [audioResponse, setAudioResponse] = useState<string | null>(null);
  
  // References
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const assemblySocketRef = useRef<WebSocket | null>(null);
  const lastTranscriptRef = useRef('');
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const keepAliveIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const hasReceivedMessageRef = useRef(false);
  const audioProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const audioSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const processingStateRef = useRef(false);
  const lastSentTranscriptRef = useRef('');
  // Debounce/cooldown for API calls
  const lastApiCallTimeRef = useRef(0);
  const API_CALL_COOLDOWN = 3000; // 3 seconds between API calls
  const MAX_RECONNECT_ATTEMPTS = 3;
  
  // Simple initialization
  useEffect(() => {
    const initialize = async () => {
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
      clearKeepAliveInterval();
      closeAssemblyConnection();
      stopMediaStream();
    };
  }, []);
  
  // Get user information from localStorage
  const getUserInfo = () => {
    try {
      // Get important user data
      const sara_token = localStorage.getItem("sara_token");
      const user_id = localStorage.getItem("id");
      const user_name = localStorage.getItem("user_name");
      
      // Validate essential data
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

  // Setup KeepAlive mechanism for WebSocket
  useEffect(() => {
    if (isListening && assemblySocketRef.current && assemblySocketRef.current.readyState === WebSocket.OPEN) {
      clearKeepAliveInterval();
      
      keepAliveIntervalRef.current = setInterval(() => {
        try {
          if (assemblySocketRef.current && assemblySocketRef.current.readyState === WebSocket.OPEN) {
            // Send ping to keep connection alive
            assemblySocketRef.current.send(JSON.stringify({ type: "ping" }));
            if (DEBUG) console.log("Sent ping");
          }
        } catch (error) {
          console.error("Error sending ping:", error);
        }
      }, 20000); // Send every 20 seconds
    }
    
    return () => clearKeepAliveInterval();
  }, [isListening]);
  
  // Helper to clear keep-alive interval
  const clearKeepAliveInterval = () => {
    if (keepAliveIntervalRef.current) {
      clearInterval(keepAliveIntervalRef.current);
      keepAliveIntervalRef.current = null;
    }
  };
  
  // Function to get user's microphone permission
  async function requestMicrophonePermission() {
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

  // Initialize the AssemblyAI WebSocket connection - UPDATED
  const initAssemblySocket = async () => {
    if (DEBUG) console.log("Starting AssemblyAI WebSocket connection...");
    setConnectionError(null);
    hasReceivedMessageRef.current = false;
    lastTranscriptRef.current = '';
    
    try {
      // Get the WebSocket token from our proxy API endpoint
      const tokenResponse = await fetch('/api/assemblyai-token', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!tokenResponse.ok) {
        throw new Error(`Failed to get WebSocket token: ${tokenResponse.status}`);
      }
      
      const tokenData = await tokenResponse.json();
      if (DEBUG) console.log("Received token data:", tokenData);
      
      if (!tokenData.token) {
        throw new Error('Invalid WebSocket token');
      }
      
      // Close any existing connection
      closeAssemblyConnection();
      
      // Create a new WebSocket connection with sample_rate in URL
      if (DEBUG) console.log("Connecting to AssemblyAI...");
      const socket = new WebSocket(`wss://api.assemblyai.com/v2/realtime/ws?sample_rate=16000&token=${tokenData.token}`);
      
      // Set up event handlers
      socket.onopen = () => {
        if (DEBUG) console.log("WebSocket connection opened");
        
        setConnectionState('open');
        setStatusMessage('Connected to AssemblyAI');
      };
      
      socket.onmessage = (event) => {
        try {
          const result = JSON.parse(event.data);
          if (DEBUG) console.log("Received message:", result);
          hasReceivedMessageRef.current = true;
          
          if (result.message_type === 'PartialTranscript') {
            // Only log partial transcripts for debugging
            // Don't send these to the backend
            const transcriptText = result.text || '';
            
            if (transcriptText && transcriptText.trim().length > 0) {
              if (DEBUG) console.log("Received partial transcript:", transcriptText);
            }
            
          } else if (result.message_type === 'FinalTranscript') {
            // Only send final transcript segments to the backend
            if (result.text && result.text.trim()) {
              // Get the final transcript segment
              const finalSegment = result.text.trim();
              
              // Store this segment in our complete transcript (for reference only)
              const currentTranscript = lastTranscriptRef.current;
              const updatedTranscript = currentTranscript 
                ? `${currentTranscript} ${finalSegment}`
                : finalSegment;
                
              // Update the last transcript reference
              lastTranscriptRef.current = updatedTranscript;
              
              if (DEBUG) console.log("Final transcript segment:", finalSegment);
              
              // Generate a unique request ID
              const requestId = `final-${Date.now()}`;
              
              // Always send final transcripts immediately
              if (!processingStateRef.current) {
                sendStreamToBackend(finalSegment, requestId);
                lastSentTranscriptRef.current = finalSegment;
                lastApiCallTimeRef.current = Date.now();
              }
            }
          } else if (result.message_type === 'SessionBegins') {
            if (DEBUG) console.log("Session began successfully");
          } else if (result.error) {
            console.error("AssemblyAI error:", result);
            setConnectionError("AssemblyAI error: " + (result.error || "Unknown error"));
            
            // If we get sample rate error, try to reconnect with a fixed configuration
            if (result.error && result.error.includes("Sample rate")) {
              if (DEBUG) console.log("Sample rate error detected, will attempt to fix");
              attemptReconnect();
            }
          }
        } catch (error) {
          console.error("Error processing message:", error);
        }
      };
      
      socket.onerror = (event) => {
        console.error("WebSocket error:", event);
        setStatusMessage('Connection error');
        setConnectionError("Connection failed - see console for details");
      };
      
      socket.onclose = (event) => {
        if (DEBUG) console.log("WebSocket closed:", event.code, event.reason);
        
        clearKeepAliveInterval();
        setConnectionState('closed');
        
        if (event.code !== 1000) {
          setStatusMessage(`Connection closed: ${event.reason || 'Unknown reason'}`);
          if (isListening) setIsListening(false);
        }
      };
      
      assemblySocketRef.current = socket;
      return true;
      
    } catch (error: any) {
      console.error("Error:", error);
      setStatusMessage('Failed to initialize speech recognition');
      setConnectionError(error.message || "Unknown error");
      return false;
    }
  };
  
  // Send transcript stream to backend continuously during speech
  const sendStreamToBackend = async (transcript: string, requestId: string) => {
    if (!transcript || transcript.trim() === '') return;
    
    try {
      processingStateRef.current = true;
      const userInfo = getUserInfo();
      if (!userInfo) {
        if (DEBUG) console.log("No user info available");
        processingStateRef.current = false;
        return;
      }
      
      if (DEBUG) console.log(`Streaming to backend [${requestId}]:`, transcript);
      
      // Call the voice_assistant endpoint with the transcript text
      const response = await fetch(`${process.env.NEXT_PUBLIC_BE_API_URL || ''}/letta/voice_assistant/`, {
        method: 'POST',
        headers: {
          'Authorization': 'Bot ZmlaXnksCbjdVhgf_8',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          text: transcript,
          user_id: userInfo.user_id,
          request_id: requestId // Add unique ID to track requests
        })
      });
      
      if (!response.ok) {
        throw new Error(`Backend API error: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.status) {
        // Process the response from Letta
        if (data.bot_response) {
          const responseContent = data.bot_response.response || 
                              (typeof data.bot_response === 'object' ? 
                                JSON.stringify(data.bot_response) : data.bot_response);
          
          setResponseText(responseContent);
        }
        
        // Handle audio responses if available
        if (data.audio_response && data.response_type === 'voice') {
          setResponseType('voice');
          setAudioResponse(data.audio_response);
          
          // Play audio automatically
          playAudioResponse(data.audio_response);
        } else {
          setResponseType('text');
          setAudioResponse(null);
        }
      } else {
        console.error("Error from backend:", data.message);
      }
      
      if (DEBUG) console.log(`Completed request [${requestId}]`);
      
    } catch (error) {
      console.error(`Error streaming to backend [${requestId}]:`, error);
    } finally {
      processingStateRef.current = false;
    }
  };
  
  // Play audio response
  const playAudioResponse = (base64Audio: string) => {
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
  
  // Attempt to reconnect to AssemblyAI
  const attemptReconnect = () => {
    if (reconnectAttemptsRef.current >= MAX_RECONNECT_ATTEMPTS) {
      if (DEBUG) console.log(`Exceeded maximum reconnection attempts (${MAX_RECONNECT_ATTEMPTS})`);
      setStatusMessage(`Connection failed after ${MAX_RECONNECT_ATTEMPTS} attempts`);
      setIsListening(false);
      return;
    }
    
    reconnectAttemptsRef.current++;
    
    // Exponential backoff
    const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 10000);
    
    if (DEBUG) console.log(`Attempting to reconnect in ${delay}ms (attempt ${reconnectAttemptsRef.current}/${MAX_RECONNECT_ATTEMPTS})`);
    setStatusMessage(`Reconnecting... (${reconnectAttemptsRef.current}/${MAX_RECONNECT_ATTEMPTS})`);
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    
    // Using 'as NodeJS.Timeout' to satisfy TypeScript
    reconnectTimeoutRef.current = setTimeout(() => {
      if (isListening) {
        initAssemblySocket();
      }
    }, delay) as NodeJS.Timeout;
  };
  
  // Start listening for speech
  const startListening = async () => {
    if (DEBUG) console.log("Starting listening process...");
    setConnectionError(null);
    hasReceivedMessageRef.current = false;
    reconnectAttemptsRef.current = 0;
    lastTranscriptRef.current = '';
    lastSentTranscriptRef.current = '';
    
    try {
      // First, get microphone permission
      const { success, stream, error } = await requestMicrophonePermission();
      
      if (!success || !stream) {
        setStatusMessage(`Microphone access denied: ${error}`);
        return;
      }
      
      // Save the stream for later cleanup
      mediaStreamRef.current = stream;
      
      // Initialize WebSocket connection first
      if (!await initAssemblySocket()) {
        stopMediaStream();
        return;
      }
      
      // Initialize audio processing with fixed sample rate
      const SAMPLE_RATE = 16_000; // Must match the sample_rate in the WebSocket config
      
      try {
        // Create audio context with specific sample rate
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
          sampleRate: SAMPLE_RATE,
          latencyHint: 'interactive'
        });
        
        audioContextRef.current = audioContext;
        
        if (DEBUG) console.log("AudioContext created with sample rate:", audioContext.sampleRate);
        
        // Create audio source from the microphone stream
        const source = audioContext.createMediaStreamSource(stream);
        audioSourceRef.current = source;
        
        // Script processor is deprecated but still works in most browsers
        // For production, consider upgrading to AudioWorkletNode
        const processor = audioContext.createScriptProcessor(4096, 1, 1);
        audioProcessorRef.current = processor;
        
        processor.onaudioprocess = (e) => {
          if (assemblySocketRef.current && assemblySocketRef.current.readyState === WebSocket.OPEN) {
            // Get audio data from the first channel
            const inputData = e.inputBuffer.getChannelData(0);
            
            // Convert to 16-bit PCM
            const pcmData = convertFloat32ToInt16(inputData);
            
            // Send audio data as binary
            if (pcmData.byteLength > 0) {
              assemblySocketRef.current.send(pcmData);
            }
          }
        };
        
        // Connect the audio graph: source -> processor -> destination
        source.connect(processor);
        processor.connect(audioContext.destination);
        
        // Update state
        setIsListening(true);
        setStatusMessage('Listening...');
        
      } catch (processorError) {
        console.error('Error setting up audio processor:', processorError);
        closeAssemblyConnection();
        stopMediaStream();
        setStatusMessage('Failed to start audio processing');
      }
      
    } catch (error) {
      console.error('Error starting listening:', error);
      setStatusMessage(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };
  
  // Stop listening for speech
  const stopListening = () => {
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
    
    // Cancel any ongoing speech synthesis
    if (window.speechSynthesis && window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
    }
    
    // Send a termination message
    if (assemblySocketRef.current && assemblySocketRef.current.readyState === WebSocket.OPEN) {
      try {
        assemblySocketRef.current.send(JSON.stringify({ terminate_session: true }));
        if (DEBUG) console.log("Sent termination message");
      } catch (closeError) {
        console.error("Error sending termination message:", closeError);
      }
    }
    
    // Disconnect audio processing
    if (audioSourceRef.current && audioProcessorRef.current) {
      try {
        audioSourceRef.current.disconnect(audioProcessorRef.current);
        audioProcessorRef.current.disconnect();
      } catch (disconnectError) {
        console.error("Error disconnecting audio:", disconnectError);
      }
      audioSourceRef.current = null;
      audioProcessorRef.current = null;
    }
    
    closeAssemblyConnection();
    stopMediaStream();
    clearKeepAliveInterval();
    
    // Clear timeouts
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    // Cancel any processing state
    processingStateRef.current = false;
    
    setIsListening(false);
    setStatusMessage('Stopped listening');
    
    // Reset state to ensure we don't get any more responses
    setResponseText('');
    setAudioResponse(null);
    setResponseType('text');
    lastTranscriptRef.current = '';
    lastSentTranscriptRef.current = '';
  };
  
  // Helper function to close the AssemblyAI WebSocket connection
  const closeAssemblyConnection = () => {
    if (DEBUG) console.log("Closing WebSocket connection...");
    
    if (assemblySocketRef.current) {
      try {
        if (assemblySocketRef.current.readyState !== WebSocket.CLOSED && 
            assemblySocketRef.current.readyState !== WebSocket.CLOSING) {
          assemblySocketRef.current.close(1000, "User ended session");
        }
      } catch (error) {
        console.error("Error closing WebSocket:", error);
      } finally {
        assemblySocketRef.current = null;
      }
    }
  };
  
  // Stop and cleanup media stream
  const stopMediaStream = () => {
    if (DEBUG) console.log("Stopping media stream...");
    
    if (mediaStreamRef.current) {
      try {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      } catch (trackError) {
        console.error("Error stopping tracks:", trackError);
      } finally {
        mediaStreamRef.current = null;
      }
    }
    
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      try {
        audioContextRef.current.close().catch(console.error);
      } catch (closeError) {
        console.error("Error closing audio context:", closeError);
      } finally {
        audioContextRef.current = null;
      }
    }
  };
  
  // Helper function to convert audio data for transmission
  const convertFloat32ToInt16 = (float32Array: Float32Array) => {
    const length = float32Array.length;
    const int16Array = new Int16Array(length);
    
    for (let i = 0; i < length; i++) {
      // Convert float audio sample to 16-bit
      const s = Math.max(-1, Math.min(1, float32Array[i]));
      int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }
    
    return int16Array.buffer;
  };
  
  // Reset the conversation - now integrated with stopListening
  const resetConversation = () => {
    if (DEBUG) console.log("Resetting conversation...");
    
    setResponseText('');
    lastTranscriptRef.current = '';
    lastSentTranscriptRef.current = '';
    setAudioResponse(null);
    
    // Stop any playing audio
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  };
  
  // Listen for keyboard shortcuts - removed R key shortcut for reset
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
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
  
  // Play audio response when button is clicked
  const handlePlayAudio = () => {
    if (audioResponse) {
      playAudioResponse(audioResponse);
    } else if (responseText) {
      // If no audio response available, use browser's speech synthesis
      const speech = new SpeechSynthesisUtterance(responseText);
      window.speechSynthesis.speak(speech);
    }
  };
  
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
            
            {/* Hidden audio element for playing responses */}
            <audio ref={audioRef} style={{ display: 'none' }} />
            
            {/* Response text is now hidden from UI */}
            
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