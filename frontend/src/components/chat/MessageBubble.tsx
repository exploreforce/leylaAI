import { ChatMessage } from '@/types';
import { cn, formatTime } from '@/utils';
import { UserIcon, CpuChipIcon, ExclamationTriangleIcon } from '@heroicons/react/24/solid';
// import ToolCallDisplay from './ToolCallDisplay'; // Hidden for production

interface MessageBubbleProps {
  message: ChatMessage;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';

  const bubbleClasses = cn(
    'p-3 rounded-lg max-w-lg mb-2',
    isUser ? 'bg-primary-600 text-white self-end' : 'bg-gray-200 text-gray-800 self-start',
    isSystem && 'bg-yellow-100 text-yellow-800 self-center w-full text-center'
  );

  const containerClasses = cn(
    'flex items-end space-x-2',
    isUser ? 'justify-end' : 'justify-start'
  );

  const icon = isUser ? (
    <UserIcon className="h-6 w-6 text-primary-300" />
  ) : isSystem ? (
    <ExclamationTriangleIcon className="h-6 w-6 text-yellow-500" />
  ) : (
    <CpuChipIcon className="h-6 w-6 text-gray-500" />
  );

  return (
    <div className={containerClasses}>
      {!isUser && <div className="flex-shrink-0">{icon}</div>}
      <div className={bubbleClasses}>
        <p className="text-sm">{message.content}</p>
        {/* Tool calls hidden for production - only for debugging */}
        <div className="text-xs opacity-75 mt-1 text-right">
          {formatTime(message.timestamp)}
        </div>
      </div>
      {isUser && <div className="flex-shrink-0">{icon}</div>}
    </div>
  );
};

export default MessageBubble; 