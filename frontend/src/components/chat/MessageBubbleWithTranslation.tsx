import React, { useState } from 'react';
import { ChatMessage } from '@/types';
import { cn, formatTime } from '@/utils';
import { UserIcon, CpuChipIcon, ExclamationTriangleIcon, LanguageIcon, ArrowPathIcon } from '@heroicons/react/24/solid';
import { useTranslateMessage, LANGUAGE_CODES } from '@/hooks/useTranslateMessage';
import { useTranslation } from 'react-i18next';
import ToolCallDisplay from './ToolCallDisplay';

interface MessageBubbleWithTranslationProps {
  message: ChatMessage;
}

const MessageBubbleWithTranslation: React.FC<MessageBubbleWithTranslationProps> = ({ 
  message
}) => {
  const { i18n } = useTranslation();
  const { translateMessage, isTranslating } = useTranslateMessage();
  
  const [translatedContent, setTranslatedContent] = useState<string | null>(null);
  const [showTranslation, setShowTranslation] = useState(false);
  const [translatedToLanguage, setTranslatedToLanguage] = useState<string>('');
  
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';
  
  // Get the target language from user settings (current i18n language)
  const targetLanguage = i18n.language || 'de';

  const handleTranslate = async () => {
    try {
      const result = await translateMessage(message.content, targetLanguage);
      setTranslatedContent(result.text);
      setTranslatedToLanguage(targetLanguage);
      setShowTranslation(true);
    } catch (error) {
      console.error('Translation failed:', error);
      // Could add toast notification here
    }
  };

  const handleShowOriginal = () => {
    setShowTranslation(false);
  };

  const getLanguageName = (code: string) => {
    const names: Record<string, string> = {
      'de': 'Deutsch',
      'en': 'English', 
      'es': 'Español',
      'fr': 'Français',
      'it': 'Italiano',
      'pt': 'Português',
      'ru': 'Русский',
      'pl': 'Polski',
      'cs': 'Čeština',
      'sk': 'Slovenčina',
      'hu': 'Magyar',
      'ro': 'Română',
      'bg': 'Български',
      'hr': 'Hrvatski',
      'sl': 'Slovenščina',
      'sr': 'Српски',
      'mk': 'Македонски',
      'sq': 'Shqip',
      'et': 'Eesti',
      'lv': 'Latviešu',
      'lt': 'Lietuvių',
      'el': 'Ελληνικά',
      'th': 'ไทย',
      'tl': 'Filipino',
      'vi': 'Tiếng Việt',
      'tr': 'Türkçe'
    };
    return names[code] || code.toUpperCase();
  };

  const bubbleClasses = cn(
    'p-2.5 sm:p-3 rounded-lg max-w-[85%] sm:max-w-lg mb-2',
    isUser ? 'bg-primary-600 text-white self-end' : 'bg-gray-200 text-gray-800 self-start',
    isSystem && 'bg-yellow-100 text-yellow-800 self-center w-full text-center'
  );

  const containerClasses = cn(
    'flex items-end space-x-1.5 sm:space-x-2',
    isUser ? 'justify-end' : 'justify-start'
  );

  const icon = isUser ? (
    <UserIcon className="h-5 sm:h-6 w-5 sm:w-6 text-primary-300 flex-shrink-0" />
  ) : isSystem ? (
    <ExclamationTriangleIcon className="h-5 sm:h-6 w-5 sm:w-6 text-yellow-500 flex-shrink-0" />
  ) : (
    <CpuChipIcon className="h-5 sm:h-6 w-5 sm:w-6 text-gray-500 flex-shrink-0" />
  );

  // Don't show translation for very short messages or system messages
  const shouldShowTranslationOptions = !isSystem && message.content.length > 10;

  // Check if message has tool calls
  const hasToolCalls = !isUser && message.metadata?.toolCalls && message.metadata.toolCalls.length > 0;

  return (
    <div className="mb-3 sm:mb-4">
      <div className={containerClasses}>
        {!isUser && <div className="flex-shrink-0">{icon}</div>}
        <div className={bubbleClasses}>
          {/* Message Content */}
          <p className="text-xs sm:text-sm leading-relaxed">
            {showTranslation ? translatedContent : message.content}
          </p>
          
          {/* Translation indicator */}
          {showTranslation && (
            <div className="text-xs opacity-60 mt-1 italic">
              Translated to {getLanguageName(translatedToLanguage)}
            </div>
          )}
          
          {/* Timestamp */}
          <div className="text-xs opacity-75 mt-1 text-right">
            {formatTime(message.timestamp)}
          </div>
        </div>
        {isUser && <div className="flex-shrink-0">{icon}</div>}
      </div>

      {/* Tool Calls Display - Only for assistant messages with tool calls */}
      {hasToolCalls && (
        <div className={cn(
          'ml-6 sm:ml-8',
          isUser ? 'mr-0' : 'mr-0'
        )}>
          <ToolCallDisplay toolCalls={message.metadata!.toolCalls!} />
        </div>
      )}

      {/* Translation Controls */}
      {shouldShowTranslationOptions && (
        <div className={cn(
          'flex flex-wrap gap-2 mt-2 text-xs',
          isUser ? 'justify-end' : 'justify-start'
        )}>
          {!showTranslation ? (
            // Show single translation button
            <button
              onClick={handleTranslate}
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
              onClick={handleShowOriginal}
              className="text-dark-400 hover:text-elysViolet-500 transition-colors underline flex items-center gap-1"
            >
              <ArrowPathIcon className="h-3 w-3" />
              Show Original
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default MessageBubbleWithTranslation;

