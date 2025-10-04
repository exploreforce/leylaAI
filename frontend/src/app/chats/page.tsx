'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { DocumentTextIcon, TrashIcon, ClockIcon, ChatBubbleLeftRightIcon, ArchiveBoxIcon, FunnelIcon, CheckIcon, LanguageIcon, ArrowPathIcon, PhoneIcon } from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';
import { botApi } from '@/utils/api';
import { ChatSession } from '@/types';
import { useTranslateMessage } from '@/hooks/useTranslateMessage';

type FilterStatus = 'all' | 'active' | 'archived' | 'inactive';

export default function AllChatsPage() {
  const { t, i18n } = useTranslation('chat');
  const router = useRouter();
  const { translateMessage, isTranslating } = useTranslateMessage();
  
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [filteredSessions, setFilteredSessions] = useState<ChatSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [archivingId, setArchivingId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [showFilters, setShowFilters] = useState(false);
  
  // Translation state for lastMessages
  const [translatedMessages, setTranslatedMessages] = useState<Record<string, { text: string; language: string }>>({});
  const [showingTranslations, setShowingTranslations] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadSessions();
    
    // Auto-refresh sessions every 5 seconds for real-time WhatsApp updates
    const interval = setInterval(() => {
      loadSessions();
    }, 5000);
    
    return () => clearInterval(interval);
  }, []);

  // Filter sessions based on status
  useEffect(() => {
    let filtered = [...sessions];
    
    if (filterStatus !== 'all') {
      filtered = filtered.filter(session => session.status === filterStatus);
    }
    
    // Sort by last activity (newest first)
    filtered.sort((a, b) => new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime());
    
    setFilteredSessions(filtered);
  }, [sessions, filterStatus]);

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
    if (!confirm(t('chat_list.actions.confirm_delete'))) {
      return;
    }

    setDeletingId(sessionId);
    try {
      await botApi.deleteTestChatSession(sessionId);
      setSessions(sessions.filter(s => s.id !== sessionId));
    } catch (error) {
      console.error('Failed to delete session:', error);
      alert('Fehler beim Löschen der Session. Bitte versuchen Sie es erneut.');
    } finally {
      setDeletingId(null);
    }
  };

  const handleArchiveSession = async (sessionId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'archived' ? 'active' : 'archived';
    const action = newStatus === 'archived' ? 'archivieren' : 'reaktivieren';
    
    if (newStatus === 'archived' && !confirm('Wirklich archivieren?')) {
      return;
    }

    setArchivingId(sessionId);
    try {
      await botApi.updateSessionStatus(sessionId, newStatus);
      setSessions(sessions.map(s => 
        s.id === sessionId ? { ...s, status: newStatus } : s
      ));
    } catch (error) {
      console.error('Failed to update session status:', error);
      alert(`Fehler beim ${action} der Session. Bitte versuchen Sie es erneut.`);
    } finally {
      setArchivingId(null);
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
    if (session.sessionType === 'whatsapp') {
      return session.displayName || session.whatsappNumber || `WhatsApp ${session.id}`;
    }
    return `Chat Session ${session.sessionNumber || session.id}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-success-500';
      case 'archived': return 'bg-dark-400';
      case 'inactive': return 'bg-orange-500';
      default: return 'bg-luxe-500';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active': return 'Aktiv';
      case 'archived': return 'Archiviert';
      case 'inactive': return 'Inaktiv';
      default: return 'Unbekannt';
    }
  };

  // Translation functions for lastMessage
  const handleTranslateLastMessage = async (sessionId: string, content: string) => {
    const targetLanguage = i18n.language || 'de';
    try {
      const result = await translateMessage(content, targetLanguage);
      setTranslatedMessages(prev => ({
        ...prev,
        [sessionId]: { text: result.text, language: targetLanguage }
      }));
      setShowingTranslations(prev => new Set(Array.from(prev).concat([sessionId])));
    } catch (error) {
      console.error('Translation failed:', error);
    }
  };

  const handleShowOriginalMessage = (sessionId: string) => {
    setShowingTranslations(prev => {
      const newSet = new Set(prev);
      newSet.delete(sessionId);
      return newSet;
    });
  };

  const getLanguageName = (code: string) => {
    const names: Record<string, string> = {
      // Core Languages
      'de': 'Deutsch',
      'en': 'English',
      
      // Eastern European Languages
      'ru': 'Русский',
      'pl': 'Polski',
      'cs': 'Čeština',
      'sk': 'Slovenčina',
      'hu': 'Magyar',
      'ro': 'Română',
      'bg': 'български език',
      'sr': 'српски језик',
      'hr': 'Hrvatski',
      'sl': 'Slovenski',
      'bs': 'Bosanski',
      'mk': 'македонски јазик',
      'sq': 'Shqip',
      'lv': 'Latviešu',
      'lt': 'Lietuvių',
      'et': 'Eesti',
      'uk': 'українська',
      'be': 'беларуская',
      
      // Western & Southern European Languages
      'es': 'Español',
      'it': 'Italiano',
      'fr': 'Français',
      'pt': 'Português',
      'nl': 'Nederlands',
      'el': 'Ελληνικά',
      
      // Asian Languages
      'th': 'ไทย',
      'tl': 'Filipino',
      'vi': 'Tiếng Việt',
      'zh': '中文',
      'ja': '日本語',
      'ko': '한국어',
      'hi': 'हिन्दी',
      
      // Middle Eastern & Other
      'tr': 'Türkçe',
      'ar': 'العربية',
    };
    return names[code] || code.toUpperCase();
  };

  const targetLanguage = i18n.language || 'de';

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-900 flex items-center justify-center">
        <div className="text-lg text-dark-50">{t('chat_list.loading')}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-900">
      {/* Header */}
      <header className="bg-dark-800 shadow-2xl border-b border-rouge-600">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-3 sm:py-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
            <div className="flex items-center space-x-2 sm:space-x-3">
              <Image 
                src="/branding/LeylaAI.png" 
                alt="Leyla AI Logo" 
                width={40} 
                height={40}
                className="h-8 sm:h-10 w-auto"
              />
              <h1 className="text-base sm:text-2xl font-bold text-dark-50">
                <span className="hidden sm:inline">Conversation History</span>
                <span className="sm:hidden">Chats</span>
              </h1>
            </div>
            <div className="flex space-x-2 sm:space-x-3 w-full sm:w-auto">
              <Link 
                href="/test-chat?new=true" 
                className="flex-1 sm:flex-initial bg-gradient-to-r from-luxe-500 to-luxe-600 text-white px-3 sm:px-4 py-2.5 rounded-lg hover:from-luxe-600 hover:to-rouge-600 transition-all duration-300 shadow-lg text-center text-sm sm:text-base min-h-[44px] flex items-center justify-center"
              >
                <span className="hidden sm:inline">+ New AI Chat</span>
                <span className="sm:hidden">+ New Chat</span>
              </Link>
              <Link 
                href="/" 
                className="text-elysViolet-400 hover:text-elysViolet-300 px-3 py-2.5 rounded transition-colors text-sm sm:text-base min-h-[44px] flex items-center"
              >
                <span className="hidden sm:inline">{t('common.back_to_dashboard')}</span>
                <span className="sm:hidden">←</span>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Filters and Stats */}
      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-3 sm:py-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 mb-4 sm:mb-6">
          <div className="text-xs sm:text-sm text-dark-200">
            {filteredSessions.length} von {sessions.length} Chat Session{filteredSessions.length !== 1 ? 's' : ''}
            {filterStatus !== 'all' && ` (${getStatusLabel(filterStatus)} gefiltert)`}
          </div>
          
          <div className="relative flex space-x-2 w-full sm:w-auto">
            <button
              onClick={loadSessions}
              className="flex-1 sm:flex-initial flex items-center justify-center space-x-1.5 sm:space-x-2 bg-dark-700 text-dark-200 px-3 sm:px-4 py-2.5 rounded-lg hover:bg-dark-600 transition-colors border border-dark-600 min-h-[44px]"
              title="Refresh chats"
            >
              <ArrowPathIcon className="h-4 w-4" />
              <span className="text-sm sm:text-base">Refresh</span>
            </button>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex-1 sm:flex-initial flex items-center justify-center space-x-1.5 sm:space-x-2 bg-dark-700 text-dark-200 px-3 sm:px-4 py-2.5 rounded-lg hover:bg-dark-600 transition-colors border border-dark-600 min-h-[44px]"
            >
              <FunnelIcon className="h-4 w-4" />
              <span className="text-sm sm:text-base">Filter</span>
            </button>
            
            {showFilters && (
              <div className="absolute right-0 top-full mt-2 w-full sm:w-48 bg-dark-700 border border-dark-600 rounded-lg shadow-xl z-10">
                {[
                  {key: 'all', label: t('chat_list.filters.all')}, 
                  {key: 'active', label: t('chat_list.filters.active')}, 
                  {key: 'archived', label: t('chat_list.filters.archived')}, 
                  {key: 'inactive', label: t('chat_list.filters.inactive')}
                ].map(({key, label}) => (
                  <button
                    key={key}
                    onClick={() => {
                      setFilterStatus(key as FilterStatus);
                      setShowFilters(false);
                    }}
                    className={`w-full text-left px-4 py-3 hover:bg-dark-600 transition-colors first:rounded-t-lg last:rounded-b-lg min-h-[44px] ${
                      filterStatus === key ? 'text-luxe-400' : 'text-dark-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm sm:text-base">{label}</span>
                      {filterStatus === key && <CheckIcon className="h-4 w-4" />}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Chat Sessions List */}
      <main className="max-w-7xl mx-auto py-0 px-3 sm:px-4">
        {filteredSessions.length === 0 ? (
          sessions.length === 0 ? (
            <div className="bg-dark-700 rounded-xl shadow-2xl p-8 text-center border border-dark-600">
              <div className="flex items-center justify-center text-elysPink-400 text-lg mb-4">
                <ChatBubbleLeftRightIcon className="h-6 w-6 mr-2" />
                No chat sessions yet!
              </div>
              <p className="text-dark-200 mb-6">Start your first test chat to see it here.</p>
              <Link 
                href="/test-chat?new=true" 
                className="inline-block bg-gradient-to-r from-elysViolet-500 to-elysBlue-600 text-white px-6 py-3 rounded-lg hover:from-elysViolet-600 hover:to-elysBlue-700 transition-all duration-300 shadow-lg"
              >
                Start AI Chat
              </Link>
            </div>
          ) : (
            <div className="bg-dark-700 rounded-xl shadow-2xl p-8 text-center border border-dark-600">
              <div className="flex items-center justify-center text-elysPink-400 text-lg mb-4">
                <FunnelIcon className="h-6 w-6 mr-2" />
                Keine Chat Sessions gefunden!
              </div>
              <p className="text-dark-200 mb-6">
                {filterStatus === 'all' 
                  ? 'Aktuell sind alle Sessions herausgefiltert.' 
                  : `Keine ${getStatusLabel(filterStatus)} Sessions vorhanden.`
                }
              </p>
              <button
                onClick={() => setFilterStatus('all')}
                className="inline-block bg-gradient-to-r from-elysViolet-500 to-elysBlue-600 text-white px-6 py-3 rounded-lg hover:from-elysViolet-600 hover:to-elysBlue-700 transition-all duration-300 shadow-lg"
              >
                {t('chat_list.filters.all')}
              </button>
            </div>
          )
        ) : (
          <div className="space-y-3 sm:space-y-4">
            {filteredSessions.map((session) => (
              <div key={session.id} className="bg-dark-700 rounded-xl shadow-2xl hover:shadow-rouge-500/20 transition-all duration-300 p-4 sm:p-6 border border-dark-600 hover:border-rouge-500">
                <div className="flex flex-col sm:flex-row items-start justify-between gap-3 sm:gap-0">
                  <div className="flex-1 w-full">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-0 mb-3">
                      <div className="flex items-center flex-wrap gap-2">
                        <span className={`inline-block w-3 h-3 rounded-full ${getStatusColor(session.status)} shadow-lg flex-shrink-0`}></span>
                        {session.sessionType === 'whatsapp' && (
                          <PhoneIcon className="w-4 sm:w-5 h-4 sm:h-5 text-green-400 flex-shrink-0" />
                        )}
                        <h3 className="font-semibold text-dark-50 text-base sm:text-lg">
                          {getSessionTitle(session)}
                        </h3>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          session.status === 'active' ? 'bg-success-500/20 text-success-300 border border-success-500/30' :
                          session.status === 'archived' ? 'bg-dark-500/20 text-dark-300 border border-dark-500/30' :
                          'bg-orange-500/20 text-orange-300 border border-orange-500/30'
                        }`}>
                          {getStatusLabel(session.status)}
                        </span>
                        {session.isFlagged && (
                          <span className="text-xs bg-red-600/20 text-red-300 border border-red-600/30 px-2 py-1 rounded-full shadow-lg">
                            RED FLAG
                          </span>
                        )}
                        {session.stats.draftMessages > 0 && (
                          <span className="text-xs bg-rouge-500 text-white px-2 py-1 rounded-full shadow-lg">
                            {session.stats.draftMessages} Draft{session.stats.draftMessages !== 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4 mb-4">
                      <div className="text-center p-2 sm:p-3 bg-dark-600 rounded-lg border border-elysPink-400/20">
                        <div className="text-lg sm:text-2xl font-bold text-elysPink-400">{session.stats.totalMessages}</div>
                        <div className="text-xs text-elysPink-300">Total</div>
                      </div>
                      <div className="text-center p-2 sm:p-3 bg-dark-600 rounded-lg border border-success-500/20">
                        <div className="text-lg sm:text-2xl font-bold text-success-400">{session.stats.userMessages}</div>
                        <div className="text-xs text-success-300">User</div>
                      </div>
                      <div className="text-center p-2 sm:p-3 bg-dark-600 rounded-lg border border-elysViolet-500/20">
                        <div className="text-lg sm:text-2xl font-bold text-elysViolet-400">{session.stats.assistantMessages}</div>
                        <div className="text-xs text-elysViolet-300">AI</div>
                      </div>
                      <div className="text-center p-2 sm:p-3 bg-dark-600 rounded-lg border border-elysPink-500/20">
                        <div className="text-lg sm:text-2xl font-bold text-elysPink-400">{session.stats.draftMessages}</div>
                        <div className="text-xs text-elysPink-300">Drafts</div>
                      </div>
                    </div>

                    {session.lastMessage && (
                      <div className="bg-dark-600 rounded-lg p-3 mb-4 border border-dark-500">
                        <div className="text-xs text-dark-200 mb-1">
                          Last message ({session.lastMessage.role}):
                        </div>
                        <div className="text-sm text-dark-100 mb-2">
                          {showingTranslations.has(session.id) 
                            ? translatedMessages[session.id]?.text 
                            : session.lastMessage.content
                          }
                        </div>
                        
                        {/* Translation indicator */}
                        {showingTranslations.has(session.id) && (
                          <div className="text-xs opacity-60 mb-2 italic text-dark-300">
                            Translated to {getLanguageName(translatedMessages[session.id]?.language || '')}
                          </div>
                        )}

                        {/* Translation Controls */}
                        {session.lastMessage.content.length > 10 && (
                          <div className="flex flex-wrap gap-2 text-xs">
                            {!showingTranslations.has(session.id) ? (
                              // Show single translation button
                              <button
                                onClick={() => session.lastMessage && handleTranslateLastMessage(session.id, session.lastMessage.content)}
                                disabled={isTranslating}
                                className="text-dark-400 hover:text-elysViolet-500 transition-colors underline disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                              >
                                <LanguageIcon className="h-3 w-3" />
                                {isTranslating ? (
                                  <>
                                    <ArrowPathIcon className="h-3 w-3 animate-spin" />
                                    <span>Translating...</span>
                                  </>
                                ) : (
                                  <span>Translate to {getLanguageName(targetLanguage)}</span>
                                )}
                              </button>
                            ) : (
                              // Show original button
                              <button
                                onClick={() => handleShowOriginalMessage(session.id)}
                                className="text-dark-400 hover:text-elysViolet-500 transition-colors underline flex items-center gap-1"
                              >
                                <ArrowPathIcon className="h-3 w-3" />
                                Show Original
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    <div className="text-xs text-dark-300">
                      Created: {formatTimestamp(session.createdAt)} • 
                      Last activity: {formatTimestamp(session.lastActivity)}
                    </div>
                  </div>
                  
                  <div className="w-full sm:w-auto sm:ml-6 flex flex-row sm:flex-col gap-2 mt-3 sm:mt-0">
                    <button
                      onClick={() => handleOpenSession(session.id)}
                      className="flex-1 sm:flex-initial bg-dark-600 text-elysViolet-400 px-3 sm:px-4 py-2.5 rounded-lg hover:bg-elysViolet-600 hover:text-white text-xs sm:text-sm font-semibold border border-elysViolet-500/30 hover:border-elysViolet-500 transition-all duration-300 flex items-center justify-center min-h-[44px]"
                    >
                      <ChatBubbleLeftRightIcon className="h-4 w-4 mr-1.5 sm:mr-2" />
                      <span className="hidden sm:inline">{t('chat_list.actions.open')}</span>
                      <span className="sm:hidden">Open</span>
                    </button>
                    
                    {session.stats.draftMessages > 0 && (
                      <Link
                        href={`/chat-review/test-${session.id}`}
                        className="flex-1 sm:flex-initial bg-gradient-to-r from-elysPink-500 to-elysViolet-600 text-white px-3 sm:px-4 py-2.5 rounded-lg hover:from-elysPink-600 hover:to-elysBlue-700 text-xs sm:text-sm text-center font-semibold transition-all duration-300 shadow-lg flex items-center justify-center min-h-[44px]"
                      >
                        <DocumentTextIcon className="h-4 w-4 mr-1.5 sm:mr-2" />
                        <span className="hidden sm:inline">Review Drafts</span>
                        <span className="sm:hidden">Review</span>
                      </Link>
                    )}
                    
                    <button
                      onClick={() => handleArchiveSession(session.id, session.status)}
                      disabled={archivingId === session.id}
                      className="flex-1 sm:flex-initial bg-dark-600 text-elysViolet-400 px-3 sm:px-4 py-2.5 rounded-lg hover:bg-elysViolet-600 hover:text-white disabled:opacity-50 text-xs sm:text-sm font-semibold border border-elysViolet-500/30 hover:border-elysViolet-500 transition-all duration-300 flex items-center justify-center min-h-[44px]"
                    >
                      {archivingId === session.id ? (
                        <ClockIcon className="h-4 w-4 mr-1.5 sm:mr-2" />
                      ) : (
                        <ArchiveBoxIcon className="h-4 w-4 mr-1.5 sm:mr-2" />
                      )}
                      <span className="hidden sm:inline">{session.status === 'archived' ? t('chat_list.actions.activate') : t('chat_list.actions.archive')}</span>
                      <span className="sm:hidden">{session.status === 'archived' ? 'Activate' : 'Archive'}</span>
                    </button>
                    
                    <button
                      onClick={() => handleDeleteSession(session.id)}
                      disabled={deletingId === session.id}
                      className="flex-1 sm:flex-initial bg-dark-600 text-elysPink-400 px-3 sm:px-4 py-2.5 rounded-lg hover:bg-elysPink-600 hover:text-white disabled:opacity-50 text-xs sm:text-sm font-semibold border border-elysPink-500/30 hover:border-elysPink-500 transition-all duration-300 flex items-center justify-center min-h-[44px]"
                    >
                      {deletingId === session.id ? (
                        <ClockIcon className="h-4 w-4 mr-1.5 sm:mr-2" />
                      ) : (
                        <TrashIcon className="h-4 w-4 mr-1.5 sm:mr-2" />
                      )}
                      <span className="hidden sm:inline">{t('chat_list.actions.delete')}</span>
                      <span className="sm:hidden">Delete</span>
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

