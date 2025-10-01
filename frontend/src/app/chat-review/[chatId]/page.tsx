'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { botApi } from '@/utils/api';
import MessageBubbleWithTranslation from '@/components/chat/MessageBubbleWithTranslation';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  metadata?: any;
}

interface ChatForReview {
  id: string;
  type: 'test' | 'whatsapp';
  title: string;
  messages: ChatMessage[];
  lastUserMessage: string;
  pendingReply: string;
  pendingReplyId: string;
  sessionId: number;
}

export default function ChatDetailReview() {
  const params = useParams();
  const router = useRouter();
  const chatId = params?.chatId as string;
  
  // Redirect if no chatId
  if (!chatId) {
    router.push('/chat-review');
    return <div>Redirecting...</div>;
  }
  
  const [chat, setChat] = useState<ChatForReview | null>(null);
  const [loading, setLoading] = useState(true);
  const [customReply, setCustomReply] = useState('');
  const [showCustomReply, setShowCustomReply] = useState(false);
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const cardRef = useRef<HTMLDivElement>(null);
  const startX = useRef<number>(0);
  const currentX = useRef<number>(0);
  const isDragging = useRef<boolean>(false);

  useEffect(() => {
    const loadChat = async () => {
      try {
        const response = await botApi.getChatForReview(chatId);
        if (response.data) {
          setChat(response.data);
        }
      } catch (error) {
        console.error('Failed to load chat:', error);
      } finally {
        setLoading(false);
      }
    };

    loadChat();
  }, [chatId]);

  const handleTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    isDragging.current = true;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging.current || !cardRef.current) return;
    
    currentX.current = e.touches[0].clientX;
    const deltaX = currentX.current - startX.current;
    
    // Apply transform and color based on swipe direction
    cardRef.current.style.transform = `translateX(${deltaX}px) rotate(${deltaX * 0.1}deg)`;
    
    if (deltaX > 50) {
      cardRef.current.style.backgroundColor = 'rgba(16, 185, 129, 0.1)'; // success tint for accept
      setSwipeDirection('right');
    } else if (deltaX < -50) {
      cardRef.current.style.backgroundColor = 'rgba(239, 68, 68, 0.1)'; // rouge tint for reject
      setSwipeDirection('left');
    } else {
      cardRef.current.style.backgroundColor = '#333333'; // dark-600
      setSwipeDirection(null);
    }
  };

  const handleTouchEnd = () => {
    if (!isDragging.current || !cardRef.current) return;
    
    const deltaX = currentX.current - startX.current;
    
    if (Math.abs(deltaX) > 100) {
      // Trigger action based on swipe direction
      if (deltaX > 0) {
        handleAccept();
      } else {
        handleReject();
      }
    } else {
      // Snap back to center
      cardRef.current.style.transform = 'translateX(0px) rotate(0deg)';
      cardRef.current.style.backgroundColor = '#333333';
      setSwipeDirection(null);
    }
    
    isDragging.current = false;
  };

  const handleAccept = async () => {
    if (!chat || isProcessing) return;
    
    setIsProcessing(true);
    try {
      // Approve the draft message
      await botApi.approveTestChatDraft(chat.sessionId.toString());
      
      // Navigate back to chat list
      router.push('/chat-review');
    } catch (error) {
      console.error('Failed to accept reply:', error);
      // Reset card position on error
      if (cardRef.current) {
        cardRef.current.style.transform = 'translateX(0px) rotate(0deg)';
        cardRef.current.style.backgroundColor = '#333333';
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = () => {
    if (isProcessing) return;
    
    // Prefill textarea with AI's suggested reply for easy editing
    setCustomReply(chat?.pendingReply || '');
    setShowCustomReply(true);
    // Reset card position
    if (cardRef.current) {
      cardRef.current.style.transform = 'translateX(0px) rotate(0deg)';
      cardRef.current.style.backgroundColor = '#333333';
    }
    setSwipeDirection(null);
  };

  const handleSendCustomReply = async () => {
    if (!chat || !customReply.trim() || isProcessing) return;
    
    setIsProcessing(true);
    try {
      // Send custom reply
      await botApi.sendTestChatMessage(chat.sessionId.toString(), customReply);
      
      // Navigate back to chat list
      router.push('/chat-review');
    } catch (error) {
      console.error('Failed to send custom reply:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-900 flex items-center justify-center">
        <div className="text-lg text-dark-50">Loading chat...</div>
      </div>
    );
  }

  if (!chat) {
    return (
      <div className="min-h-screen bg-dark-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg text-dark-200 mb-4">Chat not found</div>
          <button 
            onClick={() => router.push('/chat-review')}
            className="bg-gradient-to-r from-elysPink-500 to-elysViolet-600 text-white px-4 py-2 rounded-lg hover:from-elysPink-600 hover:to-elysBlue-700 transition-all duration-300"
          >
            Back to Review
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-900">
      {/* Header */}
      <header className="bg-dark-800 shadow-2xl border-b border-elysPink-600">
        <div className="max-w-4xl mx-auto px-3 sm:px-4 py-3 sm:py-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center space-x-2 sm:space-x-3 min-w-0">
              <Image 
                src="/branding/LeylaAI.png" 
                alt="Leyla AI Logo" 
                width={32} 
                height={32}
                className="h-7 sm:h-8 w-auto flex-shrink-0"
              />
              <button 
                onClick={() => router.push('/chat-review')}
                className="text-elysViolet-400 hover:text-elysViolet-300 transition-colors text-sm sm:text-base px-2 py-2 min-h-[44px] flex items-center flex-shrink-0"
              >
                ← <span className="hidden sm:inline ml-1">Back</span>
              </button>
              <h1 className="text-sm sm:text-xl font-bold text-dark-50 truncate">{chat.title}</h1>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto py-4 sm:py-8 px-3 sm:px-4">
        {/* Chat Messages History */}
        <div className="bg-dark-700 rounded-xl shadow-2xl p-3 sm:p-4 mb-4 sm:mb-6 max-h-60 overflow-y-auto border border-dark-600">
          <h3 className="font-medium text-dark-50 mb-3 text-sm sm:text-base">Conversation History</h3>
          <div className="space-y-2">
            {chat.messages.slice(0, -1).map((message) => (
              <MessageBubbleWithTranslation
                key={message.id}
                message={{
                  ...message,
                  timestamp: message.timestamp
                }}
              />
            ))}
          </div>
        </div>

        {/* Swipe Card for Pending Reply */}
        {!showCustomReply && (
          <div className="relative">
            <div className="text-center mb-3 sm:mb-4">
              <div className="text-xs sm:text-sm text-dark-200 mb-2">Swipe to review AI response</div>
              <div className="flex justify-center space-x-4 sm:space-x-8 text-xs">
                <span className="text-elysPink-400">← Reject</span>
                <span className="text-success-400">Accept →</span>
              </div>
            </div>

            <div
              ref={cardRef}
              className="bg-dark-600 rounded-xl shadow-2xl p-6 mx-auto max-w-md cursor-grab active:cursor-grabbing transition-colors border border-dark-500"
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              style={{ touchAction: 'none' }}
            >
              <div className="text-center mb-4">
                <div className="text-sm text-elysPink-400 mb-2">User asked:</div>
                <div className="bg-dark-700 rounded-lg p-3 text-sm text-dark-100 border border-elysPink-400/20">
                  {chat.lastUserMessage}
                </div>
              </div>

              <div className="text-center">
                <div className="text-sm text-elysViolet-400 mb-2">AI wants to reply:</div>
                <div className="bg-dark-700 rounded-lg p-3 text-sm text-dark-100 border border-elysViolet-400/20">
                  {chat.pendingReply}
                </div>
              </div>

              {swipeDirection && (
                <div className={`absolute inset-0 flex items-center justify-center text-6xl font-bold ${
                  swipeDirection === 'right' ? 'text-success-400' : 'text-elysPink-400'
                }`}>
                  {swipeDirection === 'right' ? '✓' : '✗'}
                </div>
              )}
            </div>

            {/* Desktop Buttons */}
            <div className="flex justify-center space-x-4 mt-6 md:flex hidden">
              <button
                onClick={handleReject}
                disabled={isProcessing}
                className="bg-gradient-to-r from-elysPink-500 to-elysPink-600 text-white px-6 py-3 rounded-lg hover:from-elysPink-600 hover:to-elysViolet-600 disabled:opacity-50 transition-all duration-300 shadow-lg"
              >
                ✗ Reject & Write Custom Reply
              </button>
              <button
                onClick={handleAccept}
                disabled={isProcessing}
                className="bg-gradient-to-r from-success-500 to-success-600 text-white px-6 py-3 rounded-lg hover:from-success-600 hover:to-success-700 disabled:opacity-50 transition-all duration-300 shadow-lg"
              >
                ✓ Accept & Send
              </button>
            </div>
          </div>
        )}

        {/* Custom Reply Interface */}
        {showCustomReply && (
          <div className="bg-dark-700 rounded-xl shadow-2xl p-6 border border-dark-600">
            <h3 className="font-medium text-dark-50 mb-4">Write Custom Reply</h3>
            <div className="mb-4">
              <div className="text-sm text-elysPink-400 mb-2">User asked:</div>
              <div className="bg-dark-600 rounded-lg p-3 text-sm text-dark-100 border border-elysPink-400/20">
                {chat.lastUserMessage}
              </div>
            </div>
            
            <textarea
              value={customReply}
              onChange={(e) => setCustomReply(e.target.value)}
              placeholder="Edit the AI's response or type your own..."
              className="w-full p-3 bg-dark-600 border border-dark-500 rounded-lg resize-none h-32 focus:ring-2 focus:ring-elysPink-500 focus:border-elysPink-500 text-dark-100 placeholder-dark-300"
            />
            
            <div className="flex justify-end space-x-3 mt-4">
              <button
                onClick={() => {
                  setShowCustomReply(false);
                  setCustomReply(''); // Clear the custom reply field
                }}
                disabled={isProcessing}
                className="px-4 py-2 text-dark-300 hover:text-dark-200 disabled:opacity-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSendCustomReply}
                disabled={isProcessing || !customReply.trim()}
                className="bg-gradient-to-r from-elysViolet-500 to-elysBlue-600 text-white px-6 py-2 rounded-lg hover:from-elysViolet-600 hover:to-elysBlue-700 disabled:opacity-50 transition-all duration-300 shadow-lg"
              >
                {isProcessing ? 'Sending...' : 'Send Reply'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

