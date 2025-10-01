'use client';

import { useState, FormEvent } from 'react';
import Button from '../ui/Button';
import { PaperAirplaneIcon } from '@heroicons/react/24/solid';

interface ChatInputProps {
  onSendMessage: (content: string) => void;
  isLoading: boolean;
}

const ChatInput: React.FC<ChatInputProps> = ({ onSendMessage, isLoading }) => {
  const [content, setContent] = useState('');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (content.trim()) {
      onSendMessage(content);
      setContent('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-center space-x-2 sm:space-x-3">
      <input
        type="text"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Type your message..."
        className="flex-1 block w-full px-3 sm:px-4 py-3 text-sm sm:text-base text-gray-900 rounded-lg border border-gray-300 shadow-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500 disabled:opacity-50 placeholder-gray-400 min-h-[44px] bg-white"
        disabled={isLoading}
      />
      <Button 
        type="submit" 
        isLoading={isLoading} 
        size="md"
        className="min-w-[44px] min-h-[44px] flex-shrink-0"
      >
        <PaperAirplaneIcon className="h-5 w-5" />
        <span className="sr-only">Send</span>
      </Button>
    </form>
  );
};

export default ChatInput;
