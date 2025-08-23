'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { DocumentTextIcon, TrashIcon, ClockIcon, ChatBubbleLeftRightIcon } from '@heroicons/react/24/outline';
import { botApi } from '@/utils/api';

interface ChatSession {
  id: string;
  createdAt: string;
  lastActivity: string;
  stats: {
    totalMessages: number;
    userMessages: number;
    assistantMessages: number;
    draftMessages: number;
  };
  lastMessage: {
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: string;
  } | null;
}

export default function AllChatsPage() {
  const router = useRouter();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    try {
      const response = await botApi.getAllTestChatSessions();
      if (response.data) {
        setSessions(response.data);
      }
    } catch (error) {
      console.error('Failed to load chat sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSession = async (sessionId: string) => {
    if (!confirm('Are you sure you want to delete this chat session? This action cannot be undone.')) {
      return;
    }

    setDeletingId(sessionId);
    try {
      await botApi.deleteTestChatSession(sessionId);
      setSessions(sessions.filter(s => s.id !== sessionId));
    } catch (error) {
      console.error('Failed to delete session:', error);
      alert('Failed to delete session. Please try again.');
    } finally {
      setDeletingId(null);
    }
  };

  const handleOpenSession = (sessionId: string) => {
    // Navigate to test chat with specific session (we'll need to modify test chat to accept session ID)
    router.push(`/test-chat?sessionId=${sessionId}`);
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getSessionTitle = (session: ChatSession) => {
    if (session.lastMessage) {
      return session.lastMessage.role === 'user' 
        ? session.lastMessage.content.substring(0, 50) + (session.lastMessage.content.length > 50 ? '...' : '')
        : 'Chat Session';
    }
    return `Chat Session ${session.id}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-900 flex items-center justify-center">
        <div className="text-lg text-dark-50">Loading chat sessions...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-900">
      {/* Header */}
      <header className="bg-dark-800 shadow-2xl border-b border-rouge-600">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Image 
                src="/branding/LeylaAI.png" 
                alt="Leyla AI Logo" 
                width={40} 
                height={40}
                className="h-10 w-auto"
              />
              <h1 className="text-2xl font-bold text-dark-50">Conversation History</h1>
            </div>
            <div className="flex space-x-3">
              <Link 
                href="/test-chat" 
                className="bg-gradient-to-r from-luxe-500 to-luxe-600 text-white px-4 py-2 rounded-lg hover:from-luxe-600 hover:to-rouge-600 transition-all duration-300 shadow-lg"
              >
                + New AI Chat
              </Link>
              <Link 
                href="/" 
                className="text-elysViolet-400 hover:text-elysViolet-300 px-3 py-2 rounded transition-colors"
              >
                ← Back to Dashboard
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Chat Sessions List */}
      <main className="max-w-7xl mx-auto py-8 px-4">
        {sessions.length === 0 ? (
          <div className="bg-dark-700 rounded-xl shadow-2xl p-8 text-center border border-dark-600">
            <div className="flex items-center justify-center text-elysPink-400 text-lg mb-4">
              <ChatBubbleLeftRightIcon className="h-6 w-6 mr-2" />
              No chat sessions yet!
            </div>
            <p className="text-dark-200 mb-6">Start your first test chat to see it here.</p>
            <Link 
              href="/test-chat" 
              className="inline-block bg-gradient-to-r from-elysViolet-500 to-elysBlue-600 text-white px-6 py-3 rounded-lg hover:from-elysViolet-600 hover:to-elysBlue-700 transition-all duration-300 shadow-lg"
            >
              Start AI Chat
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-sm text-dark-200 mb-4">
              {sessions.length} chat session{sessions.length !== 1 ? 's' : ''} found
            </div>
            
            {sessions.map((session) => (
              <div key={session.id} className="bg-dark-700 rounded-xl shadow-2xl hover:shadow-rouge-500/20 transition-all duration-300 p-6 border border-dark-600 hover:border-rouge-500">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center mb-3">
                      <span className="inline-block w-3 h-3 rounded-full bg-luxe-500 mr-3 shadow-lg shadow-luxe-500/25"></span>
                      <h3 className="font-semibold text-dark-50 text-lg">
                        {getSessionTitle(session)}
                      </h3>
                      {session.stats.draftMessages > 0 && (
                        <span className="ml-2 text-xs bg-rouge-500 text-white px-2 py-1 rounded-full shadow-lg">
                          {session.stats.draftMessages} Draft{session.stats.draftMessages !== 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <div className="text-center p-3 bg-dark-600 rounded-lg border border-elysPink-400/20">
                        <div className="text-2xl font-bold text-elysPink-400">{session.stats.totalMessages}</div>
                        <div className="text-xs text-elysPink-300">Total Messages</div>
                      </div>
                      <div className="text-center p-3 bg-dark-600 rounded-lg border border-success-500/20">
                        <div className="text-2xl font-bold text-success-400">{session.stats.userMessages}</div>
                        <div className="text-xs text-success-300">User Messages</div>
                      </div>
                      <div className="text-center p-3 bg-dark-600 rounded-lg border border-elysViolet-500/20">
                        <div className="text-2xl font-bold text-elysViolet-400">{session.stats.assistantMessages}</div>
                        <div className="text-xs text-elysViolet-300">AI Messages</div>
                      </div>
                      <div className="text-center p-3 bg-dark-600 rounded-lg border border-elysPink-500/20">
                        <div className="text-2xl font-bold text-elysPink-400">{session.stats.draftMessages}</div>
                        <div className="text-xs text-elysPink-300">Pending Drafts</div>
                      </div>
                    </div>

                    {session.lastMessage && (
                      <div className="bg-dark-600 rounded-lg p-3 mb-4 border border-dark-500">
                        <div className="text-xs text-dark-200 mb-1">
                          Last message ({session.lastMessage.role}):
                        </div>
                        <div className="text-sm text-dark-100">{session.lastMessage.content}</div>
                      </div>
                    )}

                    <div className="text-xs text-dark-300">
                      Created: {formatTimestamp(session.createdAt)} • 
                      Last activity: {formatTimestamp(session.lastActivity)}
                    </div>
                  </div>
                  
                  <div className="ml-6 flex flex-col space-y-2">
                    <button
                      onClick={() => handleOpenSession(session.id)}
                      className="bg-gradient-to-r from-gold-400 to-gold-500 text-dark-900 px-4 py-2 rounded-lg hover:from-gold-500 hover:to-gold-600 text-sm font-semibold transition-all duration-300 shadow-lg"
                    >
                      📱 Open Chat
                    </button>
                    
                    {session.stats.draftMessages > 0 && (
                      <Link
                        href={`/chat-review/test-${session.id}`}
                        className="bg-gradient-to-r from-elysPink-500 to-elysViolet-600 text-white px-4 py-2 rounded-lg hover:from-elysPink-600 hover:to-elysBlue-700 text-sm text-center font-semibold transition-all duration-300 shadow-lg flex items-center"
                      >
                        <DocumentTextIcon className="h-4 w-4 mr-1" />
                        Review Drafts
                      </Link>
                    )}
                    
                    <button
                      onClick={() => handleDeleteSession(session.id)}
                      disabled={deletingId === session.id}
                      className="bg-dark-600 text-elysPink-400 px-4 py-2 rounded-lg hover:bg-elysPink-600 hover:text-white disabled:opacity-50 text-sm font-semibold border border-elysPink-500/30 hover:border-elysPink-500 transition-all duration-300"
                    >
                      {deletingId === session.id ? (
                        <ClockIcon className="h-4 w-4 mr-1" />
                      ) : (
                        <TrashIcon className="h-4 w-4 mr-1" />
                      )}
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

