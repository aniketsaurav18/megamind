import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ChatMessage from "./components/ChatMessage";
import InputBar from "./components/InputBar";

type Message = { text: string; isBot: boolean };

export default function Page() {
  const [chatHistory, setChatHistory] = useState<Message[]>([]);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const [isAutoScrollEnabled, setIsAutoScrollEnabled] = useState(true);
  const [controller, setController] = useState<AbortController | null>(null);

  const handleScroll = useCallback(() => {
    if (chatContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } =
        chatContainerRef.current;
      const isNearBottom = scrollHeight - scrollTop <= clientHeight + 10;
      setIsAutoScrollEnabled(isNearBottom);
    }
  }, []);

  const scrollToBottom = useCallback(() => {
    if (chatContainerRef.current && isAutoScrollEnabled) {
      chatContainerRef.current.scrollTop =
        chatContainerRef.current.scrollHeight;
    }
  }, [isAutoScrollEnabled]);

  useEffect(() => {
    scrollToBottom();
  }, [chatHistory, scrollToBottom]);

  useEffect(() => {
    const chatContainer = chatContainerRef.current;
    if (chatContainer) {
      chatContainer.addEventListener("scroll", handleScroll);
      return () => chatContainer.removeEventListener("scroll", handleScroll);
    }
  }, [handleScroll]);

  const fetchContent = async (userQuery: string) => {
    const addMessageToHistory = (text: string, isBot: boolean) => {
      setChatHistory((prev) => [...prev, { text, isBot }]);
    };

    // Abort any ongoing fetch request if a new query is submitted
    if (controller) controller.abort();
    const newController = new AbortController();
    setController(newController);

    if (userQuery === "admin-command:test-markdown") {
      addMessageToHistory(userQuery, false);
      // addMessageToHistory(MARKDOWN_TEST_MESSAGE, true);
      return;
    }

    try {
      addMessageToHistory(userQuery, false);

      const response = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/submit`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ query: userQuery }),
          signal: newController.signal,
        }
      );

      if (!response.ok) {
        console.error(`Response status: ${response.status}`);
        addMessageToHistory(
          "Sorry, it looks like the server is not responding well",
          true
        );
        return;
      }

      const reader = response.body?.getReader();
      if (!reader) {
        addMessageToHistory(
          "Sorry, it looks like the response body is empty",
          true
        );
        return;
      }

      const decoder = new TextDecoder();
      addMessageToHistory("", true);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        // Process the chunk of data
        const chunk = decoder.decode(value);
        console.log("chunk", chunk);
        // Update the state with the received data
        updateLastBotMessage(chunk);
      }
    } catch (error: any) {
      if (error.name === "AbortError") {
        console.log("Fetch aborted");
      } else {
        console.error("Fetch error:", error);
        addMessageToHistory(
          "Sorry, something went wrong. Please try again.",
          true
        );
      }
    }
  };

  const updateLastBotMessage = useCallback((message: string) => {
    setChatHistory((prevChatHistory) => {
      if (prevChatHistory.length === 0) return prevChatHistory;
      return prevChatHistory.map((chat, index) => {
        if (index === prevChatHistory.length - 1 && chat.isBot) {
          return { ...chat, text: chat.text + message };
        }
        return chat;
      });
    });
  }, []);

  const memoizedChatMessages = useMemo(() => {
    return chatHistory.map((d, idx) => <ChatMessage key={idx} message={d} />);
  }, [chatHistory]);

  return (
    <main className="relative flex flex-col h-svh max-w-screen-lg w-full mx-auto bg-[#212121] p-2">
      <div
        className="flex flex-col flex-grow overflow-y-auto mb-20 hide-scrollbar"
        ref={chatContainerRef}
      >
        {memoizedChatMessages}
      </div>
      <div className="absolute bottom-6 left-0 right-0 bg-background-black p-2">
        <InputBar fetchContent={fetchContent} />
      </div>
    </main>
  );
}
