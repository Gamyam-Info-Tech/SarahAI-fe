import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { ChevronDown, ChevronUp } from 'lucide-react';

// Define the API functions directly
const getHistoryId = async () => {
  const response = await fetch('http://192.168.31.34:8000/sessions/', {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${localStorage.getItem("sara_token")}`
    }
  });
  
  if (!response.ok) {
    throw new Error('Failed to fetch history IDs');
  }
  
  return response.json();
};

const getHistory = async (id: string) => {
  const apiKey = "sk_b8272f9490709c083007957e563b8a08eaca08f2cc0ca043";
  
  const response = await fetch(
    `https://api.elevenlabs.io/v1/convai/conversations/${id}`,
    {
      method: 'GET',
      headers: {
        'xi-api-key': apiKey,
      }
    }
  );

  if (!response.ok) {
    throw new Error('Failed to get conversation history');
  }

  return response.json();
};

interface SessionData {
  user: number;
  session_id: string;
  created_at: string;
}

interface Transcript {
  role: string;
  message: string;
}

interface ConversationData {
  transcript: Transcript[];
  analysis: {
    transcript_summary: string;
  };
}

const ConversationHistory = () => {
  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [conversations, setConversations] = useState<Record<string, ConversationData>>({});
  const [expandedSession, setExpandedSession] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    try {
      const response = await getHistoryId();
      setSessions(response.sort((a: SessionData, b: SessionData) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      ));
    } catch (err) {
      setError('Failed to fetch sessions');
      console.error('Error fetching sessions:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchConversation = async (sessionId: string) => {
    try {
      const conversation = await getHistory(sessionId);
      setConversations(prev => ({
        ...prev,
        [sessionId]: conversation
      }));
    } catch (err) {
      console.error('Error fetching conversation:', err);
      setError('Failed to fetch conversation details');
    }
  };

  const handleSessionClick = async (sessionId: string) => {
    if (expandedSession === sessionId) {
      setExpandedSession(null);
    } else {
      setExpandedSession(sessionId);
      if (!conversations[sessionId]) {
        await fetchConversation(sessionId);
      }
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <p className="text-gray-500">Loading conversations...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-64">
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  return (
    <div className="w-full min-w-[100%] p-4 space-y-4">
      <h2 className="text-2xl font-bold mb-6">Conversation History</h2>
      
      {sessions.map((session) => (
        <Card key={session.session_id} className="w-full">
          <CardHeader className="cursor-pointer" onClick={() => handleSessionClick(session.session_id)}>
            <div className="flex justify-between items-center">
              <CardTitle className="text-lg">
                Session: {session.session_id.slice(0, 8)}...
              </CardTitle>
              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-500">
                  {formatDate(session.created_at)}
                </span>
                {expandedSession === session.session_id ? 
                  <ChevronUp className="h-5 w-5" /> : 
                  <ChevronDown className="h-5 w-5" />
                }
              </div>
            </div>
          </CardHeader>
          
          {expandedSession === session.session_id && (
            <CardContent className="border-t">
              {conversations[session.session_id] ? (
                <div className="space-y-4">
                  {conversations[session.session_id].transcript.map((t, idx) => (
                    <div key={idx} className={`p-3 rounded-lg ${
                      t.role === 'agent' ? 'bg-blue-50' : 'bg-gray-50'
                    }`}>
                      <p className="font-semibold mb-1">{t.role === 'agent' ? 'Agent' : 'User'}</p>
                      <p>{t.message}</p>
                    </div>
                  ))}
                  
                  <div className="mt-4 pt-4 border-t">
                    <p className="font-semibold">Summary:</p>
                    <p className="text-gray-600">
                      {conversations[session.session_id].analysis.transcript_summary}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="py-4 text-center text-gray-500">
                  Loading conversation...
                </div>
              )}
            </CardContent>
          )}
        </Card>
      ))}
      
      {sessions.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No conversations found
        </div>
      )}
    </div>
  );
};

export default ConversationHistory;