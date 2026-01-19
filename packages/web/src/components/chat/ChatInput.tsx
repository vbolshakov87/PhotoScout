import { useState, useRef, useEffect, useImperativeHandle, forwardRef } from 'react';
import { Send, Loader2 } from 'lucide-react';

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
}

export interface ChatInputHandle {
  setValue: (text: string) => void;
  focus: () => void;
}

export const ChatInput = forwardRef<ChatInputHandle, ChatInputProps>(function ChatInput(
  { onSend, disabled },
  ref
) {
  const [value, setValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useImperativeHandle(ref, () => ({
    setValue: (text: string) => {
      setValue(text);
      // Focus the textarea after setting value
      setTimeout(() => textareaRef.current?.focus(), 0);
    },
    focus: () => textareaRef.current?.focus(),
  }));

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [value]);

  const handleSubmit = () => {
    if (value.trim() && !disabled) {
      onSend(value.trim());
      setValue('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="p-4 liquid-glass border-t border-white/10 relative z-10">
      <div className="flex items-end gap-3">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Where do you want to explore?"
          disabled={disabled}
          rows={1}
          className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/40 resize-none focus:border-violet-500/50 focus:bg-white/10 transition-all duration-200"
        />
        <button
          onClick={handleSubmit}
          disabled={!value.trim() || disabled}
          className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-all duration-200 ${
            value.trim() && !disabled
              ? 'bg-gradient-to-br from-violet-500 to-indigo-600 text-white shadow-lg shadow-violet-500/30 hover:scale-105 active:scale-95'
              : 'bg-white/5 text-white/30'
          }`}
        >
          {disabled ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
        </button>
      </div>
    </div>
  );
});
