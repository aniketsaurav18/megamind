"use client";
import { useState, ChangeEvent, useRef, useEffect, KeyboardEvent } from "react";

const InputBar = ({ fetchContent }: { fetchContent: any }) => {
  const [message, setMessage] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const adjustTextareaHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      const newHeight = Math.min(textarea.scrollHeight, 200); // Max height of 200px
      textarea.style.height = `${newHeight}px`;
      textarea.style.overflowY = newHeight === 200 ? "auto" : "hidden";
    }
  };

  useEffect(() => {
    adjustTextareaHeight();
  }, [message]);

  const handleTextareaChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(event.target.value);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault(); // Prevent new line insertion
      if (message.trim()) {
        setMessage("");
        fetchContent(message);
      }
    }
  };

  return (
    <div className="flex w-full items-center">
      <div className="flex w-full flex-col gap-1.5 rounded-[26px] p-1.5 transition-colors bg-[#2F2F2F] dark:bg-token-main-surface-secondary">
        <div className="flex items-end gap-1.5 md:gap-2">
          <div className="flex min-w-0 flex-1 flex-col pl-4">
            <textarea
              ref={textareaRef}
              id="prompt-textarea"
              tabIndex={0}
              dir="auto"
              rows={1}
              placeholder="Type your query here."
              className="m-0 resize-none border-0 px-0 focus:ring-0 focus-visible:ring-0 text-white outline-none"
              spellCheck={false}
              value={message}
              onChange={handleTextareaChange}
              onKeyDown={handleKeyDown}
              style={{
                minHeight: "30px",
                padding: "10px",
                backgroundColor: "transparent",
              }}
            ></textarea>
          </div>
          <button
            data-testid="send-button"
            className={`mb-1 me-1 flex h-10 w-10 items-center justify-center rounded-full transition-colors focus-visible:outline-none ${
              message.trim()
                ? "bg-white text-black cursor-pointer hover:opacity-70" //when button is active
                : "bg-[#676767] text-white " // when button is inactive
            }`}
            disabled={!message.trim()}
            onClick={() => {
              setMessage("");
              fetchContent(message);
            }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="32"
              height="32"
              fill="none"
              viewBox="0 0 32 32"
              className="icon-2xl"
            >
              <path
                fill="currentColor"
                fillRule="evenodd"
                d="M15.192 8.906a1.143 1.143 0 0 1 1.616 0l5.143 5.143a1.143 1.143 0 0 1-1.616 1.616l-3.192-3.192v9.813a1.143 1.143 0 0 1-2.286 0v-9.813l-3.192 3.192a1.143 1.143 0 1 1-1.616-1.616z"
                clipRule="evenodd"
              ></path>
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default InputBar;
