'use client';

import React from 'react';
import { ToolCall } from '@/types';
import { WrenchScrewdriverIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/solid';

interface ToolCallDisplayProps {
  toolCall: ToolCall;
}

const ToolCallDisplay: React.FC<ToolCallDisplayProps> = ({ toolCall }) => (
  <div className="my-2 p-3 bg-gray-100 rounded-lg border border-gray-300">
    <div className="flex items-center text-sm font-semibold text-gray-700">
      <WrenchScrewdriverIcon className="h-4 w-4 mr-2" />
      <span>Tool Call: {toolCall.name}</span>
    </div>
    <div className="mt-2 text-xs text-gray-600">
      <strong>Parameters:</strong>
      <pre className="mt-1 p-2 bg-gray-200 rounded text-xs overflow-x-auto">
        {JSON.stringify(toolCall.parameters, null, 2)}
      </pre>
    </div>
    <div className="mt-2 text-xs text-gray-600">
      <strong>Result:</strong>
      <div className={`mt-1 flex items-start p-2 rounded ${toolCall.result?.error ? 'bg-red-100' : 'bg-green-100'}`}>
        {toolCall.result?.error ? (
          <XCircleIcon className="h-4 w-4 text-red-500 mr-2 flex-shrink-0" />
        ) : (
          <CheckCircleIcon className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
        )}
        <pre className="text-xs overflow-x-auto">
          {JSON.stringify(toolCall.result, null, 2)}
        </pre>
      </div>
    </div>
  </div>
);

export default ToolCallDisplay; 