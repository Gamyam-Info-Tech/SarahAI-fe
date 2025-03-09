"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Send, Mic, MicOff, Volume2, Paperclip } from 'lucide-react';
import { cn } from "@/lib/utils";
import { apiPostService } from "@/app/services/helpers";

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
  audioUrl?: string; // For audio messages
  isAudio?: boolean;
}

interface AssistantResponse {
  status: boolean;
  message: string;
  bot_response: any;
  audio_response?: string;
  transcribed_text?: string;
  response_type: 'text' | 'voice';
}

// Interfaces for TypeScript error fixes
interface ToolCall {
  function?: {
    name: string;
    arguments: string;
  };
}

interface FunctionMessage {
  tool_calls?: ToolCall[];
}

const WhatsAppTTS = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Audio recording
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  
  // Get UID from localStorage
  const getUserId = () => {
    const id = localStorage.getItem('id');
    if (!id) {
      throw new Error('User ID not found in localStorage');
    }
    return id;
  };

  // Text to speech function
  const speakMessage = async (text: string) => {
    setIsSpeaking(true);
    try {
      const response = await apiPostService<AssistantResponse>(
        '/letta/voice_assistant/',
        {
          text,
          user_id: getUserId()
        },
        true
      );

      if (response.audio_response) {
        const audioBlob = await fetch(`data:audio/wav;base64,${response.audio_response}`).then(r => r.blob());
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        audio.onended = () => setIsSpeaking(false);
        await audio.play();
      } else {
        setIsSpeaking(false);
      }
    } catch (error) {
      console.error('Error with text-to-speech:', error);
      setIsSpeaking(false);
      alert('Error with text-to-speech. Please try again.');
    }
  };

  // Speech recognition with MediaRecorder
  const toggleRecording = async () => {
    if (isRecording) {
      // Stop recording
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
    } else {
      // Start recording logic
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioChunksRef.current = [];
        
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;
        
        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };
        
        mediaRecorder.onstop = async () => {
          try {
            await handleSendAudioMessage();
          } catch (error) {
            console.error('Error processing audio:', error);
          }
          
          // Stop all tracks from the stream
          stream.getTracks().forEach(track => track.stop());
        };
        
        mediaRecorder.start();
        setIsRecording(true);
      } catch (error) {
        console.error('Error accessing microphone:', error);
        alert('Could not access microphone. Please check permissions.');
      }
    }
  };

  const handleSendAudioMessage = async () => {
    setIsProcessing(true);
    try {
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
      const userId = getUserId();
      
      // Display a temporary message showing processing
      const tempMessageId = `temp-${Date.now()}`;
      const tempMessage: Message = {
        id: tempMessageId,
        text: "Processing audio...",
        isUser: true,
        timestamp: new Date(),
      };
      
      setMessages(prev => [...prev, tempMessage]);
      
      // Create form data
      const formData = new FormData();
      formData.append('audio', audioBlob);
      formData.append('user_id', userId);
      
      // Send to voice_note_assistant endpoint (for WhatsApp audio messages)
      const response = await apiPostService<AssistantResponse>(
        '/letta/voice_note_assistant/',
        formData,
        true
      );
      
      // Remove temporary message
      setMessages(prev => prev.filter(m => m.id !== tempMessageId));
      
      // Create audio URL from blob
      const audioUrl = URL.createObjectURL(audioBlob);
      
      // Add user audio message
      const userMessage: Message = {
        id: Date.now().toString(),
        text: response.transcribed_text || "Audio message",
        isUser: true,
        timestamp: new Date(),
        audioUrl,
        isAudio: true
      };
      
      setMessages(prev => [...prev, userMessage]);
      
      // Add bot response if available
      if (response.bot_response) {
        // Extract the actual text response from the bot_response object
        let botResponseText = '';
        
        if (response.bot_response.response) {
          botResponseText = response.bot_response.response;
        } else if (typeof response.bot_response === 'object') {
          // If it's an object from Letta, extract the message
          const letta = response.bot_response;
          // Try different possible structures
          if (letta.messages && letta.messages.length > 0) {
            botResponseText = letta.messages[0].content;
          } else if (letta.response) {
            botResponseText = letta.response;
          } else if (letta.message) {
            botResponseText = letta.message;
          } else {
            // If we can't find a standard structure, convert to string
            botResponseText = JSON.stringify(letta);
          }
        }
        
        const botResponse: Message = {
          id: (Date.now() + 1).toString(),
          text: botResponseText,
          isUser: false,
          timestamp: new Date(),
        };
        
        setMessages(prev => [...prev, botResponse]);
      }
      
    } catch (error) {
      console.error('Error processing audio message:', error);
      alert('Error processing audio message. Please try again.');
    } finally {
      setIsProcessing(false);
      audioChunksRef.current = []; // Clear audio chunks
    }
  };

  const handleSendMessage = async () => {
    if (inputMessage.trim() === '' || isProcessing) return;
    
    setIsProcessing(true);
    try {
      const userId = getUserId();
      
      // Add user message to chat
      const userMessage: Message = {
        id: Date.now().toString(),
        text: inputMessage,
        isUser: true,
        timestamp: new Date(),
      };
      
      setMessages(prev => [...prev, userMessage]);
      
      // Send to text_assistant endpoint
      const response = await apiPostService<AssistantResponse>(
        '/letta/chat/',
        {
          text: inputMessage,
          user_id: userId
        },
        true
      );
      
      // Extract the bot response text
      let botResponseText = '';
      
      if (response.bot_response) {
        // Check if bot_response is a simple string
        if (typeof response.bot_response === 'string') {
          botResponseText = response.bot_response;
        }
        // Check if bot_response has a response property
        else if (response.bot_response.response) {
          botResponseText = response.bot_response.response;
        } else {
          // Try to extract from Letta response structure
          const letta = response.bot_response;
          
          // First try to get any function call messages
          let extractedText = '';
          try {
            if (letta.messages && Array.isArray(letta.messages)) {
              // Try to find a function call with 'send_message'
              const functionMessage = letta.messages.find((msg: FunctionMessage) => 
                msg.tool_calls && 
                msg.tool_calls.find(tool => 
                  tool.function && tool.function.name === 'send_message'
                )
              );
              
              if (functionMessage) {
                const toolCall = functionMessage.tool_calls?.find(
                  (tool: ToolCall) => tool.function && tool.function.name === 'send_message'
                );
                if (toolCall && toolCall.function) {
                  try {
                    const args = JSON.parse(toolCall.function.arguments);
                    if (args.message) {
                      extractedText = args.message;
                    }
                  } catch (e) {
                    console.error('Error parsing tool call arguments:', e);
                  }
                }
              }
            }
          } catch (e) {
            console.error('Error extracting tool call message:', e);
          }
          
          if (extractedText) {
            botResponseText = extractedText;
          } else if (typeof letta === 'object') {
            // Try common response patterns
            if (letta.message) {
              botResponseText = letta.message;
            } else if (letta.content) {
              botResponseText = letta.content;
            } else {
              // Fallback to stringifying the response
              botResponseText = JSON.stringify(letta);
            }
          } else {
            botResponseText = "Received a response but couldn't parse it";
          }
        }
      }
      
      // Add bot response to chat
      const botResponse: Message = {
        id: (Date.now() + 1).toString(),
        text: botResponseText || "I received your message but couldn't generate a response.",
        isUser: false,
        timestamp: new Date(),
      };
      
      setMessages(prev => [...prev, botResponse]);
      setInputMessage('');
      
    } catch (error) {
      console.error('Error sending message:', error);
      // Add error message
      const errorMessage: Message = {
        id: Date.now().toString(),
        text: "Error sending message. Please try again.",
        isUser: false,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (messages.length === 0) {
      const userName = localStorage.getItem('user_name') || 'there';
      
      const welcomeMessage: Message = {
        id: 'welcome',
        text: `Hi ${userName}, How can I help you today!`,
        isUser: false,
        timestamp: new Date(),
      };
      setMessages([welcomeMessage]);
    }
  }, []);

  return (
    <div className="flex flex-col h-full">
      <CardHeader className="border-b pb-2">
        <CardTitle className="text-xl font-semibold flex justify-center">
           WhatsApp
        </CardTitle>
      </CardHeader>
      
      <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-gray-50">
        {messages.map((message) => (
          <div 
            key={message.id} 
            className={cn(
              "flex",
              message.isUser ? "justify-end" : "justify-start"
            )}
          >
            <div 
              className={cn(
                "max-w-[80%] rounded-lg p-2 shadow-sm text-sm",
                message.isUser 
                  ? "bg-green-500 text-white rounded-tr-none"
                  : "bg-white rounded-tl-none"
              )}
            >
              {message.isAudio ? (
                <div className="flex items-center gap-2">
                  <audio
                    controls
                    src={message.audioUrl}
                    className="max-w-full h-6"
                  />
                  <span className="text-xs">Audio message</span>
                </div>
              ) : (
                <div>{message.text}</div>
              )}
              <div className="text-xs mt-1 opacity-75 text-right">
                {message.timestamp.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
              </div>
            </div>
            
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      
      <div className="p-3 border-t">
        <div className="flex gap-1 items-end">
          <Button 
            variant="ghost" 
            size="icon"
            className="flex-shrink-0 text-gray-500 h-8 w-8 p-1"
            disabled={isProcessing}
          >
            <Paperclip className="h-4 w-4" />
          </Button>
          
          <div className="flex-1 relative">
            <textarea
              className="w-full rounded-md border border-gray-300 shadow-sm focus:border-primary focus:ring-1 focus:ring-primary min-h-[36px] max-h-[100px] px-2 py-1 text-sm"
              placeholder={isRecording ? "Recording..." : (isProcessing ? "Processing..." : "Type a message...")}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
              disabled={isRecording || isProcessing}
              style={{ resize: 'none' }}
            />
          </div>
          
          {isRecording ? (
            <>
              <Button 
                variant="ghost" 
                size="icon"
                className="flex-shrink-0 text-red-500 h-8 w-8 p-1"
                onClick={toggleRecording}
                disabled={isProcessing}
              >
                <MicOff className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <>
              <Button 
                variant="ghost" 
                size="icon"
                className="flex-shrink-0 text-gray-500 h-8 w-8 p-1"
                onClick={toggleRecording}
                disabled={isProcessing}
              >
                <Mic className="h-4 w-4" />
              </Button>
              
              <Button 
                variant="default" 
                size="icon"
                className="flex-shrink-0 rounded-full h-8 w-8 p-1"
                onClick={handleSendMessage}
                disabled={inputMessage.trim() === '' || isProcessing}
              >
                <Send className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
        
        {/* Recording/Processing indicator */}
        {(isRecording || isProcessing) && (
          <div className="mt-1 text-center text-xs text-red-500 animate-pulse">
            {isRecording ? "Recording audio..." : "Processing..."}
          </div>
        )}
      </div>
    </div>
  );
};

export default WhatsAppTTS;