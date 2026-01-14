import type { Message } from '@photoscout/shared';
import { HtmlPreview } from '../shared/HtmlPreview';
import { useNativeBridge } from '../../hooks/useNativeBridge';
import { Share2, Copy, Check, ArrowRight, Send } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useState, useMemo } from 'react';

interface SuggestionOption {
  emoji?: string;
  label: string;
  value: string;
}

interface ParsedSuggestions {
  multi: boolean;
  options: SuggestionOption[];
}

interface MessageBubbleProps {
  message: Message;
  onSend?: (message: string) => void;
  onSuggest?: (text: string) => void;
  isLastMessage?: boolean;
}

// Parse [[suggestions]] or [[suggestions:multi]] blocks from message content
function parseSuggestions(content: string): { cleanContent: string; suggestions: ParsedSuggestions | null } {
  const regex = /\[\[suggestions(?::multi)?\]\]\n([\s\S]*?)\n\[\[\/suggestions\]\]/;
  const match = content.match(regex);

  if (!match) {
    return { cleanContent: content, suggestions: null };
  }

  const isMulti = content.includes('[[suggestions:multi]]');
  const optionsText = match[1];
  const options: SuggestionOption[] = [];

  for (const line of optionsText.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Format: emoji|label|value or label|value or just value
    const parts = trimmed.split('|');
    if (parts.length >= 3) {
      options.push({ emoji: parts[0], label: parts[1], value: parts[2] });
    } else if (parts.length === 2) {
      options.push({ label: parts[0], value: parts[1] });
    } else {
      options.push({ label: trimmed, value: trimmed });
    }
  }

  const cleanContent = content.replace(regex, '').trim();

  return {
    cleanContent,
    suggestions: options.length > 0 ? { multi: isMulti, options } : null
  };
}

export function MessageBubble({ message, onSend, onSuggest, isLastMessage }: MessageBubbleProps) {
  const { share, copyToClipboard, haptic } = useNativeBridge();
  const [copied, setCopied] = useState(false);
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const isUser = message.role === 'user';

  // Parse suggestions from message content
  const { cleanContent, suggestions } = useMemo(
    () => parseSuggestions(message.content),
    [message.content]
  );

  const hasHtmlStart = cleanContent.includes('<!DOCTYPE html>') || cleanContent.includes('<html');
  const hasHtmlEnd = cleanContent.includes('</html>');
  const isCompleteHtml = hasHtmlStart && hasHtmlEnd;

  // Check if this is the "plan ready" message asking for confirmation
  const isPlanReadyMessage = !isUser && isLastMessage && (
    cleanContent.includes('Does this plan look good') ||
    cleanContent.includes('generate the full interactive HTML')
  );

  // Show suggestions only on the last assistant message
  const showSuggestions = !isUser && isLastMessage && suggestions && (onSend || onSuggest);

  const handleSuggestionClick = (value: string) => {
    haptic('light');
    if (onSuggest) {
      onSuggest(value);
    } else {
      onSend?.(value);
    }
  };

  const toggleOption = (value: string) => {
    haptic('light');
    setSelectedOptions(prev =>
      prev.includes(value)
        ? prev.filter(v => v !== value)
        : [...prev, value]
    );
  };

  const sendSelectedOptions = () => {
    if (selectedOptions.length > 0) {
      haptic('medium');
      onSend?.(selectedOptions.join(', '));
      setSelectedOptions([]);
    }
  };

  const isMarkdown = !isUser && !isCompleteHtml && (
    cleanContent.includes('**') ||
    cleanContent.includes('\n- ') ||
    cleanContent.includes('\n1. ')
  );

  const handleCopy = () => {
    haptic('light');
    copyToClipboard(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleQuickReply = () => {
    haptic('light');
    onSend?.("Yes, let's go!");
  };

  if (isCompleteHtml) {
    return (
      <div className="space-y-3">
        <HtmlPreview html={cleanContent} />
        <div className="flex gap-2 justify-end">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-card border border-border rounded-lg text-muted hover:text-foreground transition-colors press"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Copied' : 'Copy'}
          </button>
          <button
            onClick={() => { haptic('light'); share(message.content, 'PhotoScout Trip'); }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-primary text-white rounded-lg press"
          >
            <Share2 className="w-3.5 h-3.5" />
            Share
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
      <div className={`max-w-[85%] px-4 py-3 rounded-2xl ${
        isUser
          ? 'bg-primary text-white rounded-br-md'
          : 'bg-card border border-border rounded-bl-md'
      }`}>
        {isMarkdown ? (
          <div className="prose prose-invert prose-sm max-w-none">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                ul: ({ children }) => <ul className="list-disc list-inside space-y-1 my-2">{children}</ul>,
                ol: ({ children }) => <ol className="list-decimal list-inside space-y-1 my-2">{children}</ol>,
                li: ({ children }) => <li className="ml-1">{children}</li>,
                p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                h1: ({ children }) => <h1 className="text-lg font-semibold mb-2">{children}</h1>,
                h2: ({ children }) => <h2 className="text-base font-semibold mb-2">{children}</h2>,
                h3: ({ children }) => <h3 className="text-sm font-semibold mb-1">{children}</h3>,
                code: ({ children }) => <code className="bg-black/20 px-1 rounded text-sm">{children}</code>,
              }}
            >
              {cleanContent}
            </ReactMarkdown>
          </div>
        ) : (
          <p className="whitespace-pre-wrap text-[15px]">{cleanContent}</p>
        )}
      </div>

      {/* Dynamic suggestions from AI */}
      {showSuggestions && !suggestions.multi && (
        <div className="mt-3 p-3 bg-surface/50 rounded-xl border border-border/50">
          <p className="text-xs text-muted mb-2 font-medium">Quick suggestion:</p>
          <div className="flex flex-wrap gap-2">
            {suggestions.options.map((option) => (
              <button
                key={option.value}
                onClick={() => handleSuggestionClick(option.value)}
                className="px-4 py-2.5 bg-card hover:bg-primary hover:text-white border-2 border-border hover:border-primary rounded-xl text-sm font-medium text-foreground transition-all shadow-sm active:scale-95"
              >
                {option.emoji && <span className="mr-1.5">{option.emoji}</span>}
                {option.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Multi-select suggestions from AI */}
      {showSuggestions && suggestions.multi && (
        <div className="mt-3 p-3 bg-surface/50 rounded-xl border border-border/50">
          <p className="text-xs text-muted mb-2 font-medium">Select all that apply:</p>
          <div className="flex flex-wrap gap-2 mb-3">
            {suggestions.options.map((option) => {
              const isSelected = selectedOptions.includes(option.value);
              return (
                <button
                  key={option.value}
                  onClick={() => toggleOption(option.value)}
                  className={`px-4 py-2.5 border-2 rounded-xl text-sm font-medium transition-all shadow-sm active:scale-95 ${
                    isSelected
                      ? 'bg-primary text-white border-primary'
                      : 'bg-card text-foreground border-border hover:border-primary/50'
                  }`}
                >
                  {option.emoji && <span className="mr-1.5">{option.emoji}</span>}
                  {option.label}
                </button>
              );
            })}
          </div>
          {selectedOptions.length > 0 && (
            <button
              onClick={sendSelectedOptions}
              className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white text-sm font-medium rounded-xl transition-all shadow-md hover:shadow-lg active:scale-95"
            >
              <Send className="w-4 h-4" />
              Send ({selectedOptions.length} selected)
            </button>
          )}
        </div>
      )}

      {/* Quick reply button for plan confirmation */}
      {isPlanReadyMessage && onSend && (
        <button
          onClick={handleQuickReply}
          className="mt-3 flex items-center gap-2 px-5 py-3 bg-primary text-white text-sm font-medium rounded-xl shadow-md hover:shadow-lg transition-all active:scale-95"
        >
          Yes, let's go!
          <ArrowRight className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
