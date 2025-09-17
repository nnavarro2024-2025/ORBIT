import * as React from "react"

interface CustomTextareaProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  maxLength?: number;
  isInvalid?: boolean;
}

export const CustomTextarea: React.FC<CustomTextareaProps> = ({
  value,
  onChange,
  placeholder = "Enter text here..."
  , maxLength
  , isInvalid = false
}) => {
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    if (typeof maxLength === 'number' && val.length > maxLength) {
      onChange(val.slice(0, maxLength));
    } else {
      onChange(val);
    }
    
    // Auto-resize the textarea vertically
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.max(96, textareaRef.current.scrollHeight) + 'px';
    }
  };

  // Auto-resize on value changes from outside
  React.useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.max(96, textareaRef.current.scrollHeight) + 'px';
    }
  }, [value]);

  return (
    <div style={{ 
      width: '100%', 
      maxWidth: '100%', 
      display: 'block',
      boxSizing: 'border-box',
      overflow: 'hidden',
      position: 'relative'
    }}>
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        maxLength={maxLength}
        data-testid="purpose-textarea"
        className={`block w-full min-h-24 p-3 border rounded-md resize-none focus:outline-none ${isInvalid ? 'border-red-500 focus:ring-2 focus:ring-red-200' : 'border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500'}`}
        style={{
          width: '100%',
          maxWidth: '100%',
          minWidth: '0',
          wordWrap: 'break-word',
          overflowWrap: 'anywhere',
          wordBreak: 'break-all',
          whiteSpace: 'pre-wrap',
          overflowX: 'hidden',
          overflowY: 'hidden',
          boxSizing: 'border-box',
          minHeight: '96px',
          resize: 'none',
          fontFamily: 'inherit',
          fontSize: '14px',
          lineHeight: '1.5',
          border: '1px solid #d1d5db',
          borderRadius: '6px',
          padding: '12px',
          outline: 'none',
          background: 'white',
          textAlign: 'left',
          direction: 'ltr'
        }}
        wrap="soft"
        cols={35}
        rows={4}
      />
      {typeof maxLength === 'number' && (
        <div style={{ position: 'absolute', right: 8, bottom: 8, fontSize: 12, color: isInvalid ? '#b91c1c' : '#6b7280' }}>
          {value.length}/{maxLength}
        </div>
      )}
    </div>
  );
};
