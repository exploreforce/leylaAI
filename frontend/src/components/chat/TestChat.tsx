'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { botApi } from '@/utils/api';
import { ChatMessage, TestChatSession } from '@/types';
import MessageBubbleWithTranslation from './MessageBubbleWithTranslation';
import ChatInput from './ChatInput';

const STORAGE_KEY = 'lastTestChatSessionId';

interface TestChatProps {
  existingSessionId?: string | null;
}

const TestChat = ({ existingSessionId }: TestChatProps) => {
  const router = useRouter();
  const [session, setSession] = useState<TestChatSession | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const previousMessageCountRef = useRef<number>(0);
  const sessionInitializedRef = useRef<boolean>(false);
  const lastSessionIdRef = useRef<string | null>(null);

  useEffect(() => {
    // Reset flag if sessionId changed (navigating to different session)
    if (lastSessionIdRef.current !== existingSessionId) {
      sessionInitializedRef.current = false;
      lastSessionIdRef.current = existingSessionId || null;
    }

    // Prevent double initialization in React StrictMode (Development)
    if (sessionInitializedRef.current) {
      console.log('⏭️ Session already initialized, skipping...');
      return;
    }

    const initializeSession = async () => {
      sessionInitializedRef.current = true;
      setIsLoading(true);
      try {
        if (existingSessionId) {
          // Load existing session
          console.log('🔵 Loading existing session:', existingSessionId);
          const response = await botApi.getTestChatSession(existingSessionId);
          console.log('📥 Existing session loaded:', JSON.stringify(response, null, 2));
          
          if (response.data) {
            setSession(response.data);
            setMessages(response.data.messages || []);
            console.log('✅ Existing session loaded successfully');
          } else {
            console.error('❌ Failed to load existing session, creating new one');
            await createNewSession();
          }
        } else {
          // Create new session
          await createNewSession();
        }
      } catch (error) {
        console.error('❌ Failed to initialize session:', error);
        if (existingSessionId) {
          console.log('🔄 Fallback: Creating new session');
          await createNewSession();
        }
      } finally {
        setIsLoading(false);
      }
    };

    const createNewSession = async () => {
      try {
        console.log('🔵 Making API call to create new session...');
        const response = await botApi.createTestChatSession();
        console.log('📥 New session response:', JSON.stringify(response, null, 2));
        
        if (response.data) {
          console.log('📝 New session data:', JSON.stringify(response.data, null, 2));
          const newSessionId = response.data.id;
          
          // Save to localStorage
          localStorage.setItem(STORAGE_KEY, newSessionId);
          console.log('💾 Saved session ID to localStorage:', newSessionId);
          
          // Redirect to URL with session ID
          router.push(`/test-chat?sessionId=${newSessionId}`);
          console.log('🔄 Redirecting to session URL');
          
          setSession(response.data);
          setMessages([]);
          console.log('✅ New session created successfully');
        } else {
          console.error('❌ No session data in response');
          throw new Error('No session data in response');
        }
      } catch (error: any) {
        console.error('❌ Failed to create new session:', error);
        console.error('❌ Error details:', {
          message: error?.message,
          response: error?.response,
          status: error?.response?.status
        });
        // Re-throw to be handled by caller
        throw error;
      }
    };

    initializeSession();
  }, [existingSessionId, router]);

  // Intelligent auto-scroll: Only scroll when new messages arrive AND user is near bottom
  useEffect(() => {
    const hasNewMessages = messages.length > previousMessageCountRef.current;
    
    if (!hasNewMessages) {
      previousMessageCountRef.current = messages.length;
      return;
    }

    // Check if user is near the bottom of the chat (within 100px)
    const container = messagesContainerRef.current;
    if (container) {
      const isNearBottom = 
        container.scrollHeight - container.scrollTop - container.clientHeight < 100;
      
      if (isNearBottom) {
        // User is at the bottom, auto-scroll to new message
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }
      // If user is scrolling up to read old messages, don't interrupt them
    } else {
      // No container ref (initial load), always scroll
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }

    previousMessageCountRef.current = messages.length;
  }, [messages]);

  // Refresh session messages every 5 seconds to get approved messages
  useEffect(() => {
    if (!session) return;
    
    const refreshMessages = async () => {
      try {
        const response = await botApi.getTestChatSession(session.id.toString());
        if (response.data && response.data.messages) {
          console.log('🔄 Refreshing messages from server:', response.data.messages);
          console.log('🔍 DEBUG: Raw messages with metadata:', 
            response.data.messages.map(msg => ({
              id: msg.id,
              role: msg.role,
              content: msg.content.substring(0, 50) + '...',
              metadata: msg.metadata
            }))
          );
          
          // STRICT FILTERING: Only show user messages and EXPLICITLY approved assistant messages
          const approvedMessages = response.data.messages.filter(msg => {
            // Always show user messages
            if (msg.role === 'user') return true;
            
            // For assistant messages: VERY STRICT approval check
            if (msg.role === 'assistant') {
              console.log('🔍 STRICT FILTER CHECK: Assistant message:', {
                id: msg.id,
                content: msg.content.substring(0, 30) + '...',
                role: msg.role,
                metadata: msg.metadata,
                hasMetadata: !!msg.metadata,
                approved: msg.metadata?.approved,
                approvedStrict: msg.metadata?.approved === true,
                isCustomReply: msg.metadata?.isCustomReply,
                isDraft: msg.metadata?.isDraft,
                status: msg.metadata?.status
              });
              
              // ONLY show if explicitly approved OR is a custom reply
              // NO fallbacks - must be explicitly marked as approved
              const isApproved = msg.metadata && msg.metadata.approved === true;
              const isCustom = msg.metadata && msg.metadata.isCustomReply === true;
              const isApprovedStatus = msg.metadata && msg.metadata.status === 'approved';
              
              const shouldShow = isApproved || isCustom || isApprovedStatus;
              
              console.log('🔍 FILTER DECISION:', {
                messageId: msg.id,
                isApproved,
                isCustom, 
                isApprovedStatus,
                shouldShow,
                finalDecision: shouldShow ? 'SHOW' : 'HIDE'
              });
              
              return shouldShow;
            }
            
            // Don't show any system messages
            return false;
          });
          
          console.log('🔄 Filtered approved messages:', approvedMessages);
          
          setMessages(currentMessages => {
            const pendingMessages = currentMessages.filter(msg => 
              msg.role === 'system' && msg.content.includes('being reviewed')
            );
            
            const currentUserMessages = currentMessages.filter(msg => msg.role === 'user');
            const currentAssistantMessages = currentMessages.filter(msg => msg.role === 'assistant');
            const approvedUserMessages = approvedMessages.filter(msg => msg.role === 'user');
            const approvedAssistantMessages = approvedMessages.filter(msg => msg.role === 'assistant');
            
            console.log('🔄 WORKFLOW UPDATE ANALYSIS:', {
              currentState: {
                total: currentMessages.length,
                user: currentUserMessages.length,
                assistant: currentAssistantMessages.length,
                pending: pendingMessages.length
              },
              serverState: {
                total: approvedMessages.length,
                user: approvedUserMessages.length,  
                assistant: approvedAssistantMessages.length
              },
              decision: '?'
            });
            
            // CRITICAL: If server has approved assistant messages and we have pending, replace
            if (pendingMessages.length > 0 && approvedAssistantMessages.length > 0) {
              console.log('🔄 ✅ APPROVED MESSAGE READY - REPLACING PENDING');
              console.log('🔄 Removing pending messages:', pendingMessages.map(m => m.content));
              console.log('🔄 Adding approved assistant messages:', approvedAssistantMessages.length);
              return approvedMessages;
            }
            
            // If server has more assistant messages than current, update
            if (approvedAssistantMessages.length > currentAssistantMessages.length) {
              console.log('🔄 ✅ NEW APPROVED MESSAGES FROM SERVER');
              return approvedMessages;
            }
            
            // If server has same amount of user messages but more total messages, likely approved
            if (approvedUserMessages.length === currentUserMessages.length && 
                approvedMessages.length > currentUserMessages.length + pendingMessages.length) {
              console.log('🔄 ✅ SERVER HAS APPROVED RESPONSES FOR EXISTING QUERIES');
              return approvedMessages;
            }
            
            console.log('🔄 ⏸️  NO APPROVED CHANGES - KEEPING CURRENT STATE');
            return currentMessages;
          });
        }
      } catch (error) {
        console.error('Failed to refresh messages:', error);
      }
    };

    // Initial load
    refreshMessages();
    
    const interval = setInterval(refreshMessages, 2000); // Check every 2 seconds for very fast updates
    return () => clearInterval(interval);
  }, [session]);

  const handleSendMessage = async (content: string) => {
    console.log('🚀 handleSendMessage called');
    console.log('📋 Current session state:', JSON.stringify(session, null, 2));
    console.log('📋 Session exists?', !!session);
    console.log('📋 Content:', content);
    console.log('📋 Content trimmed?', !!content.trim());
    
    if (!session) {
      console.error('❌ No session available');
      return;
    }
    
    if (!content.trim()) {
      console.error('❌ No content to send');
      return;
    }
    
    console.log('📋 Session ID from state:', session.id);
    console.log('📋 Session ID type:', typeof session.id);
    console.log('🚀 Proceeding with message send...');
    
    const userMessage: ChatMessage = { id: `user-${Date.now()}`, role: 'user', content, timestamp: new Date().toISOString() };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setIsLoading(true);

    try {
      console.log('📤 WORKFLOW STEP 1: Sending user message to API');
      console.log('📤 Session ID:', session.id);
      console.log('📤 User content:', content);
      
      // Call API to generate AI response (stored as draft for review)
      const response = await botApi.testChat(newMessages, session.id);
      
      console.log('📤 WORKFLOW STEP 2: API responded');
      console.log('📤 Response received but NOT displaying AI answer');
      console.log('📤 AI response saved as DRAFT for review');
      
      // CRITICAL: NEVER show the AI response directly
      // Only show pending message - AI response goes to review system
      const pendingMessage: ChatMessage = { 
        id: `pending-${Date.now()}`, 
        role: 'system', 
        content: '💭 AI response is being reviewed. It will appear after approval.', 
        timestamp: new Date().toISOString() 
      };
      
      console.log('📤 WORKFLOW STEP 3: Showing pending review message');
      setMessages([...newMessages, pendingMessage]);
      
      console.log('📤 WORKFLOW COMPLETE: User message sent, AI response in review queue');
      
    } catch (error) {
      console.error('❌ WORKFLOW ERROR: Failed to send message:', error);
      const errorMessage: ChatMessage = { 
        id: `error-${Date.now()}`, 
        role: 'system', 
        content: 'Sorry, something went wrong. Please try again.', 
        timestamp: new Date().toISOString() 
      };
      setMessages([...newMessages, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[70vh] sm:h-[70vh] bg-dark-700 rounded-xl shadow-2xl border border-dark-600 max-h-[calc(100vh-120px)] sm:max-h-none">
      {/* Header */}
      <div className="p-3 sm:p-4 border-b border-dark-600 flex-shrink-0">
        <h2 className="text-base sm:text-lg font-semibold text-dark-50">Leyla AI Chat</h2>
        <p className="text-xs sm:text-sm text-dark-300 hidden sm:block">Experience intelligent conversation with Leyla AI.</p>
      </div>
      
      {/* Messages Container - Scrollable */}
      <div ref={messagesContainerRef} className="flex-1 p-3 sm:p-4 overflow-y-auto pb-safe">
        {messages.map((msg) => (
          <MessageBubbleWithTranslation 
            key={msg.id} 
            message={msg}
          />
        ))}
        {isLoading && (
          <div className="flex justify-start items-center mb-4">
            <div className="bg-gray-200 rounded-lg p-3 max-w-lg">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-elysPink-500 rounded-full animate-pulse"></div>
                <div className="w-2 h-2 bg-elysPink-500 rounded-full animate-pulse delay-75"></div>
                <div className="w-2 h-2 bg-elysPink-500 rounded-full animate-pulse delay-150"></div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      
      {/* Input Container - Fixed at bottom */}
      <div className="p-3 sm:p-4 border-t border-dark-600 flex-shrink-0 bg-dark-700">
        <ChatInput onSendMessage={handleSendMessage} isLoading={isLoading} />
      </div>
    </div>
  );
};

export default TestChat; 