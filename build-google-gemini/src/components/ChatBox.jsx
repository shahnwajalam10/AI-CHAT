import { useState, useRef, useEffect } from "react";

const ChatApp = () => {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState(null);
  const [messages, setMessages] = useState([]);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleChat = async () => {
    if (!prompt.trim()) return;

    if (!import.meta.env.VITE_GEMINI_API_KEY) {
      setResponse({ success: false, data: null, error: "API key is missing." });
      return;
    }

    setMessages((prev) => [...prev, { sender: "user", content: prompt }]);
    setLoading(true);
    setResponse(null);

    try {
      const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${import.meta.env.VITE_GEMINI_API_KEY}`;

      const structuredPrompt = `
Please provide the response in the following JSON format:
{
  "answer": "Your answer here.",
  "followup": "A relevant follow-up question."
}

Question: ${prompt}
`;

      const res = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: structuredPrompt }] }],
        }),
      });

      if (!res.ok) throw new Error(`API error: ${res.status}`);

      const data = await res.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "No response received.";

      let structuredData;
      try {
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          structuredData = JSON.parse(jsonMatch[0]);
          if (!structuredData.answer) structuredData = { answer: text, followup: null };
          if (!structuredData.followup) structuredData.followup = null;
        } else {
          structuredData = { answer: text, followup: null };
        }
      } catch (e) {
        structuredData = { answer: text, followup: null };
      }

      setResponse({ success: true, data: structuredData, error: null });
      setMessages((prev) => [
        ...prev,
        { sender: "ai", content: structuredData.answer, followup: structuredData.followup },
      ]);
    } catch (error) {
      setResponse({ success: false, data: null, error: error.message || "An error occurred." });
      setMessages((prev) => [
        ...prev,
        { sender: "ai", content: "Sorry, I encountered an error. Please try again.", isError: true },
      ]);
    } finally {
      setLoading(false);
      setPrompt("");
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleChat();
    }
  };

  const handleFollowUp = (question) => {
    setPrompt(question);
    setTimeout(() => {
      document.getElementById("send-button")?.click();
    }, 50);
  };

  return (
    <div className="w-full max-w-3xl mx-auto mt-8 px-4 sm:px-6 lg:px-8 py-6 bg-gray-900 text-gray-100 flex flex-col min-h-[calc(100vh-2rem)] sm:min-h-[calc(100vh-4rem)] border-4 border-black shadow-[8px_8px_0_0_#000] font-sans">
      <div className="text-center mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-teal-500 uppercase">
          AI Chat
        </h1>
        <p className="text-xs sm:text-sm text-gray-400 mt-2">Engage with raw, real-time responses</p>
      </div>

      {/* Chat container */}
      <div className="flex-grow h-[400px] sm:h-[500px] overflow-y-auto p-4 sm:p-5 bg-gray-800 border-4 border-black shadow-[6px_6px_0_0_#000] scrollbar-thin scrollbar-thumb-teal-500 scrollbar-track-gray-800">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-gray-400">
            <div className="w-12 h-12 sm:w-16 sm:h-16 mb-4 bg-teal-500 border-2 border-black shadow-[4px_4px_0_0_#000] flex items-center justify-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6 sm:h-8 sm:w-8 text-black"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                />
              </svg>
            </div>
            <p className="text-base sm:text-lg font-bold text-gray-300">Start the conversation</p>
            <p className="text-xs sm:text-sm mt-1 text-gray-500">Ask anything to begin</p>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.sender === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[70%] sm:max-w-[60%] px-3 py-2 sm:px-4 sm:py-3 border-2 border-black shadow-[4px_4px_0_0_#000] ${
                    message.sender === "user"
                      ? "bg-teal-500 text-black"
                      : message.isError
                      ? "bg-red-500 text-white"
                      : "bg-gray-700 text-gray-100"
                  }`}
                >
                  <p className="text-xs sm:text-sm break-words font-medium">{message.content}</p>
                  {message.followup && (
                    <button
                      onClick={() => handleFollowUp(message.followup)}
                      className="mt-2 text-xs text-white bg-black border-2 border-black shadow-[3px_3px_0_0_#000] px-2 py-1 hover:shadow-[2px_2px_0_0_#000] transition-shadow focus:outline-none"
                    >
                      {message.followup}
                    </button>
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-gray-700 text-gray-300 px-3 py-2 sm:px-4 sm:py-3 border-2 border-black shadow-[4px_4px_0_0_#000]">
                  <div className="flex space-x-2">
                    <div className="w-2 h-2 rounded-full bg-teal-500 animate-pulse"></div>
                    <div
                      className="w-2 h-2 rounded-full bg-teal-500 animate-pulse"
                      style={{ animationDelay: "0.2s" }}
                    ></div>
                    <div
                      className="w-2 h-2 rounded-full bg-teal-500 animate-pulse"
                      style={{ animationDelay: "0.4s" }}
                    ></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input area */}
      <div className="relative mt-4 sm:mt-6">
        <textarea
          className="w-full p-3 sm:p-4 pr-10 sm:pr-12 bg-gray-800 text-gray-100 border-4 border-black shadow-[6px_6px_0_0_#000] focus:outline-none focus:shadow-[4px_4px_0_0_#000] transition-shadow resize-none placeholder-gray-500 text-xs sm:text-sm font-medium"
          rows="2"
          placeholder="Type your question..."
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={loading}
        />
        <button
          id="send-button"
          onClick={handleChat}
          disabled={loading || !prompt.trim()}
          className="absolute right-2 sm:right-3 bottom-2 sm:bottom-3 p-2 bg-teal-500 text-black border-2 border-black shadow-[4px_4px_0_0_#000] hover:shadow-[2px_2px_0_0_#000] disabled:bg-gray-600 disabled:text-gray-400 disabled:shadow-[4px_4px_0_0_#000] transition-shadow focus:outline-none"
        >
          {loading ? (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4 sm:h-5 sm:w-5 animate-spin"
              viewBox="0 0 24 24"
              fill="none"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
          ) : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4 sm:h-5 sm:w-5"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
            </svg>
          )}
        </button>
      </div>

      <div className="text-xs text-center text-gray-500 mt-4 font-medium">
        Made by SHAHNWAJ • Built with grit
      </div>
    </div>
  );
};

export default ChatApp;