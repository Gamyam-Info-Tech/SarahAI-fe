import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { getHistoryId, getHistory } from '../app/services/users'; 

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
      const response:any = await getHistoryId();
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

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    const formattedDate = date.toLocaleDateString('en-US', { 
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
    const formattedTime = date.toLocaleTimeString([], { 
      hour: '2-digit',
      minute: '2-digit',
      hour12: false 
    });
    return { formattedDate, formattedTime };
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
    <div className="max-w-4xl mx-auto w-full px-4 sm:px-6">
      <h2 className="text-2xl font-semibold mb-6 text-center">Conversation Historyy</h2>
      <div className="space-y-3">
        {sessions.map((session) => (
          <div 
            key={session.session_id} 
            className="bg-white border rounded-lg overflow-hidden"
          >
            <button 
              className="w-full p-4 cursor-pointer flex justify-between items-center hover:bg-gray-50 text-left"
              onClick={() => handleSessionClick(session.session_id)}
            >
              <div className="flex items-center space-x-4 text-sm text-gray-600">
                <span>{formatDateTime(session.created_at).formattedDate}</span>
                <span>{formatDateTime(session.created_at).formattedTime}</span>
              </div>
              {expandedSession === session.session_id ? 
                <ChevronUp className="h-5 w-5 text-gray-400 flex-shrink-0" /> : 
                <ChevronDown className="h-5 w-5 text-gray-400 flex-shrink-0" />
              }
            </button>
            
            {expandedSession === session.session_id && (
              <div className="border-t">
                {conversations[session.session_id] ? (
                  <div className="p-4 space-y-3">
                    {conversations[session.session_id].transcript.map((t, idx) => (
                      <div 
                        key={idx} 
                        className={`p-3 rounded-lg ${
                          t.role === 'agent' 
                            ? 'bg-blue-50 text-blue-800' 
                            : 'bg-gray-50 text-gray-800'
                        }`}
                      >
                        {t.message}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 text-center text-gray-500">
                    Loading conversation...
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
        
        {sessions.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No conversations found
          </div>
        )}
      </div>
    </div>
  );
};

export default React.memo(ConversationHistory);