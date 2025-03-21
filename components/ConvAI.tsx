"use client"

import {Button} from "@/components/ui/button";
import React, {useEffect, useState, useRef} from "react";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";
import {cn} from "@/lib/utils";
import { apiPostService } from "@/app/services/helpers";

// Define interface for API response
interface AssistantResponse {
    transcribed_text?: string;
    bot_response?: {
        response: string;
    };
}

async function requestMicrophonePermission() {
    try {
        await navigator.mediaDevices.getUserMedia({audio: true})
        return true
    } catch {
        console.error('Microphone permission denied')
        return false
    }
}

export default function ConvAI() {
    const [isListening, setIsListening] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [statusMessage, setStatusMessage] = useState('Ready');
    const [transcribedText, setTranscribedText] = useState('');
    const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    
    // Initialize and start recording
    async function startSpeechToText() {
        const hasPermission = await requestMicrophonePermission();
        if (!hasPermission) {
            alert("Microphone permission is required");
            return;
        }
        
        try {
            setStatusMessage('Listening...');
            audioChunksRef.current = [];
            
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const recorder = new MediaRecorder(stream);
            
            recorder.onstart = () => {
                setIsListening(true);
                audioChunksRef.current = [];
            };
            
            recorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };
            
            recorder.onstop = async () => {
                setIsListening(false);
                setIsProcessing(true);
                setStatusMessage('Processing...');
                
                try {
                    await processAudio();
                } catch (error) {
                    console.error('Error processing audio:', error);
                    setStatusMessage('Error processing audio');
                } finally {
                    setIsProcessing(false);
                }
                
                // Stop all tracks from the stream
                stream.getTracks().forEach(track => track.stop());
            };
            
            recorder.start();
            setMediaRecorder(recorder);
            
        } catch (error) {
            console.error('Error starting recording:', error);
            setStatusMessage('Error starting recording');
        }
    }
    
    // Process recorded audio
    async function processAudio() {
        if (audioChunksRef.current.length === 0) {
            setStatusMessage('No audio recorded');
            return;
        }
        
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        const userId = localStorage.getItem("id");
        
        if (!userId) {
            setStatusMessage('User ID not found');
            return;
        }
        
        try {
            // Create form data with audio
            const formData = new FormData();
            formData.append('audio', audioBlob);
            formData.append('user_id', userId);
            
            // Send audio to speech-to-text endpoint
            const response = await apiPostService<AssistantResponse>('/letta/voice_assistant/', formData, true);
            
            // Check if we got a transcription
            if (response.transcribed_text) {
                setTranscribedText(response.transcribed_text);
                setStatusMessage('Speech processed successfully');
                
                // Now send the transcribed text to Letta
                if (response.bot_response) {
                    setStatusMessage('Letta response: ' + response.bot_response.response);
                }
            } else {
                setStatusMessage('No text transcribed');
            }
        } catch (error) {
            console.error('Error processing speech:', error);
            setStatusMessage('Error processing speech');
        }
    }
    
    // Stop recording
    function stopRecording() {
        if (mediaRecorder && isListening) {
            mediaRecorder.stop();
        }
    }
    
    return (
        <div className={"flex justify-center items-center gap-x-4"}>
            <Card className={'rounded-3xl'}>
                <CardContent>
                    <CardHeader>
                        <CardTitle className={'text-center'}>
                            {isListening ? 'Listening...' : (isProcessing ? 'Processing...' : statusMessage)}
                        </CardTitle>
                    </CardHeader>
                    <div className={'flex flex-col gap-y-4 text-center'}>
                        <div className={cn('orb my-16 mx-12',
                            isListening ? 'animate-orb' : (isProcessing && 'animate-orb-slow'),
                            (isListening || isProcessing) ? 'orb-active' : 'orb-inactive')}
                        ></div>

                        {!isListening && !isProcessing && (
                            <Button
                                variant={'outline'}
                                className={'rounded-full'}
                                size={"lg"}
                                onClick={startSpeechToText}
                            >
                                Start listening
                            </Button>
                        )}
                        
                        {isListening && (
                            <Button
                                variant={'outline'}
                                className={'rounded-full'}
                                size={"lg"}
                                onClick={stopRecording}
                            >
                                Stop listening
                            </Button>
                        )}
                        
                        {transcribedText && (
                            <div className="mt-4 p-4 bg-gray-100 rounded-lg text-left">
                                <p className="font-semibold">Transcribed Text:</p>
                                <p>{transcribedText}</p>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}