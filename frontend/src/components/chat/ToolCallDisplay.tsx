'use client';

import React, { useState } from 'react';
import { ToolCall } from '@/types';
import { WrenchScrewdriverIcon, CheckCircleIcon, XCircleIcon, ChevronDownIcon, ChevronRightIcon } from '@heroicons/react/24/solid';

interface ToolCallDisplayProps {
  toolCalls: ToolCall[];
}

const ToolCallDisplay: React.FC<ToolCallDisplayProps> = ({ toolCalls }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!toolCalls || toolCalls.length === 0) {
    return null;
  }

  return (
    <div className="mt-2 mb-1">
      {/* Collapsible Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-1.5 text-xs text-dark-400 hover:text-dark-200 transition-colors px-2 py-1 rounded hover:bg-dark-600/50"
      >
        {isExpanded ? (
          <ChevronDownIcon className="h-3.5 w-3.5" />
        ) : (
          <ChevronRightIcon className="h-3.5 w-3.5" />
        )}
        <WrenchScrewdriverIcon className="h-3.5 w-3.5" />
        <span>Tool Calls ({toolCalls.length})</span>
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="mt-2 space-y-2 pl-2">
          {toolCalls.map((toolCall, index) => (
            <div
              key={index}
              className="p-2.5 bg-dark-600/30 rounded border border-dark-500/50 text-xs"
            >
              {/* Tool Name & Status */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5 font-medium text-dark-100">
                  <WrenchScrewdriverIcon className="h-3.5 w-3.5 text-elysViolet-400" />
                  <span>{toolCall.name}</span>
                </div>
                <div className="flex items-center gap-1">
                  {toolCall.status === 'completed' && !toolCall.result?.error && (
                    <CheckCircleIcon className="h-4 w-4 text-success-400" />
                  )}
                  {toolCall.result?.error && (
                    <XCircleIcon className="h-4 w-4 text-error-400" />
                  )}
                  <span className={`text-xs px-1.5 py-0.5 rounded ${
                    toolCall.status === 'completed' && !toolCall.result?.error
                      ? 'bg-success-900/30 text-success-300'
                      : toolCall.result?.error
                      ? 'bg-error-900/30 text-error-300'
                      : 'bg-dark-500/50 text-dark-300'
                  }`}>
                    {toolCall.status}
                  </span>
                </div>
              </div>

              {/* Parameters */}
              <div className="mb-2">
                <div className="text-dark-300 font-medium mb-1">Parameters:</div>
                <pre className="p-2 bg-dark-700/50 rounded text-[10px] overflow-x-auto text-dark-200 leading-relaxed">
{JSON.stringify(toolCall.parameters, null, 2)}
                </pre>
              </div>

              {/* Result */}
              {toolCall.result && (
                <div>
                  <div className="text-dark-300 font-medium mb-1">Result:</div>
                  <pre className={`p-2 rounded text-[10px] overflow-x-auto leading-relaxed ${
                    toolCall.result?.error
                      ? 'bg-error-900/20 text-error-200'
                      : 'bg-success-900/20 text-success-200'
                  }`}>
{JSON.stringify(toolCall.result, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ToolCallDisplay; 