// File: /app/api/assemblyai-token/route.ts

import { NextRequest, NextResponse } from 'next/server';

// Handle GET requests
export async function GET() {
  return await getAssemblyAIToken();
}

// Handle POST requests
export async function POST() {
  return await getAssemblyAIToken();
}

// Common function to get token
async function getAssemblyAIToken() {
  try {
    console.log("Getting AssemblyAI token...");
    
    const tokenResponse = await fetch('https://api.assemblyai.com/v2/realtime/token', {
      method: 'POST',
      headers: {
        'authorization': process.env.ASSEMBLYAI_API_KEY || '59b28f55a01f4f67a59f89baca8e25b0',
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        'expires_in': 3600 // Token valid for 1 hour
      })
    });
    
    if (!tokenResponse.ok) {
      console.error(`Failed to get token: ${tokenResponse.status}`);
      return NextResponse.json(
        { error: `Failed to get token: ${tokenResponse.status}` }, 
        { status: tokenResponse.status }
      );
    }
    
    const tokenData = await tokenResponse.json();
    console.log("Successfully got AssemblyAI token");
    return NextResponse.json(tokenData);
  } catch (error) {
    console.error('Error getting AssemblyAI token:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' }, 
      { status: 500 }
    );
  }
}