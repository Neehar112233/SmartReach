import React, { useState } from 'react';
import { X, Plus, Sparkles } from 'lucide-react';

interface SkillsBadgeInputProps {
  skills: string[];
  onChange: (skills: string[]) => void;
  disabled?: boolean;
}

const POPULAR_SUGGESTIONS = [
  'Python', 'React', 'TypeScript', 'FastAPI', 'Node.js', 'MongoDB',
  'PostgreSQL', 'Docker', 'AWS', 'Tailwind CSS', 'Git', 'Generative AI'
];

export default function SkillsBadgeInput({
  skills,
  onChange,
  disabled = false,
}: SkillsBadgeInputProps) {
  const [inputVal, setInputVal] = useState('');

  const handleAdd = (val: string) => {
    const trimmed = val.trim();
    if (!trimmed) return;

    // Split by comma if pasted multiple
    const items = trimmed.split(',').map((s) => s.trim()).filter(Boolean);
    const updated = [...skills];
    for (const item of items) {
      if (!updated.some((s) => s.toLowerCase() === item.toLowerCase())) {
        updated.push(item);
      }
    }
    onChange(updated);
    setInputVal('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      handleAdd(inputVal);
    } else if (e.key === 'Backspace' && !inputVal && skills.length > 0) {
      handleRemove(skills.length - 1);
    }
  };

  const handleRemove = (index: number) => {
    if (disabled) return;
    const updated = skills.filter((_, i) => i !== index);
    onChange(updated);
  };

  // Filter suggestions not yet in skills
  const availableSuggestions = POPULAR_SUGGESTIONS.filter(
    (s) => !skills.some((sk) => sk.toLowerCase() === s.toLowerCase())
  ).slice(0, 6);

  return (
    <div className="space-y-3">
      {/* Badges container */}
      <div className="min-h-[48px] p-2.5 rounded-lg border border-border bg-surface flex flex-wrap items-center gap-1.5 focus-within:ring-2 focus-within:ring-primary-500 focus-within:border-transparent transition-all">
        {skills.map((skill, index) => (
          <span
            key={`${skill}-${index}`}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-primary-50 text-primary-700 text-xs font-medium border border-primary-200/60 shadow-xs animate-in fade-in zoom-in duration-150"
          >
            {skill}
            {!disabled && (
              <button
                type="button"
                onClick={() => handleRemove(index)}
                className="text-primary-400 hover:text-primary-700 hover:bg-primary-100 rounded-full p-0.5 transition-colors cursor-pointer"
                aria-label={`Remove ${skill}`}
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </span>
        ))}

        {!disabled && (
          <input
            type="text"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={() => handleAdd(inputVal)}
            placeholder={skills.length === 0 ? 'Type a skill and press Enter...' : 'Add more...'}
            className="flex-1 min-w-[140px] border-none bg-transparent py-1 px-1 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none"
          />
        )}
      </div>

      {/* Quick Suggestions */}
      {!disabled && availableSuggestions.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 text-xs text-text-tertiary">
          <span className="inline-flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-primary-500" />
            Suggested:
          </span>
          {availableSuggestions.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => handleAdd(suggestion)}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-surface-tertiary hover:bg-primary-50 hover:text-primary-700 border border-border text-text-secondary text-xs transition-colors cursor-pointer"
            >
              <Plus className="w-2.5 h-2.5" />
              {suggestion}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
