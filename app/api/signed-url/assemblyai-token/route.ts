// File: /app/api/assemblyai-token/route.ts

import { NextResponse } from 'next/server';

export async function POST() {
  try {
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
      return NextResponse.json(
        { error: `Failed to get token: ${tokenResponse.status}` }, 
        { status: tokenResponse.status }
      );
    }
    
    const tokenData = await tokenResponse.json();
    return NextResponse.json(tokenData);
  } catch (error) {
    console.error('Error getting AssemblyAI token:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' }, 
      { status: 500 }
    );
  }
}