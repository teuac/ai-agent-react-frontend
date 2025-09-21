import { useState, useRef, useEffect } from "react";
import { GoogleOAuthProvider, GoogleLogin } from "@react-oauth/google";
import userAvatar from "./assets/user.png";
import botAvatar from "./assets/bot.png";
import jwt_decode from "jwt-decode"

export default function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [user, setUser] = useState(null); // guarda token do Google
  const chatEndRef = useRef(null);


  const handleJWT= (credentialResponse) => {
    const decoded = jwt_decode(credentialResponse.credential);
    setUser({
      name:decoded.name,
      email:decoded.email,
      picture:decoded.picture,
      token: credentialResponse.credential
    });
  };
  // Scroll automático
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // 🔹 Envia mensagem para o n8n
  const sendMessage = async () => {
    if (!input.trim() || !user) return;

    const userMessage = { type: "user", text: input, avatar: user.picture };
    setMessages((prev) => [...prev, userMessage]);
    const currentInput = input;
    setInput("");

    try {
      const res = await fetch(
        "https://n8n.teuac.com.br/webhook/a9a5bf9c-c1c0-491b-a3b9-bcdb110ea232/chat",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            token: user.credential, // 🔑 token JWT do Google
            chatInput: currentInput,
            sessionId: user.clientId || "default-session"
          }),
        }
      );

      const data = await res.json();
      const botText = data.output || "🤖 O bot não enviou uma resposta válida.";

      const botMessage = { type: "bot", text: botText, avatar: botAvatar };
      setMessages((prev) => [...prev, botMessage]);
    } catch (err) {
      console.error("Erro ao enviar mensagem:", err);
      setMessages((prev) => [
        ...prev,
        { type: "bot", text: "Ops! Não consegui me conectar.", avatar: botAvatar },
      ]);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") sendMessage();
  };

  // 🔹 Assim que logar, manda init para o n8n
  const handleLogin = async (credentialResponse) => {
    setUser(credentialResponse);

    try {
      const res = await fetch(
        "https://n8n.teuac.com.br/webhook/a9a5bf9c-c1c0-491b-a3b9-bcdb110ea232/chat",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            token: credentialResponse.credential,
            init: true
          }),
        }
      );
      const data = await res.json();
      setMessages([{ type: "bot", text: data.output || "Bem-vindo!", avatar: botAvatar }]);
    } catch (err) {
      console.error("Erro no init:", err);
    }
  };

  return (
    <GoogleOAuthProvider clientId="780984315195-u99sft6fnft4nti9kdacb1s2g2rt88jc.apps.googleusercontent.com">
      <div className="flex flex-col max-w-md mx-auto mt-10 p-4 bg-white rounded-xl shadow-lg h-[80vh]">
        {!user ? (
          <div className="flex justify-center items-center h-full">
            <GoogleLogin
              onSuccess={handleLogin}
              onError={() => alert("Erro ao logar com Google")}
            />
          </div>
        ) : (
          <>
            {/* Chat */}
            <div className="flex-1 overflow-y-auto space-y-4">
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex items-end gap-2 ${
                    msg.type === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  <img src={msg.avatar} className="w-10 h-10 rounded-full" />
                  <div
                    className={`px-4 py-2 rounded-lg max-w-xs break-words ${
                      msg.type === "user"
                        ? "bg-blue-600 text-white"
                        : "bg-gray-200 text-gray-900"
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>

            {/* Input */}
            <div className="mt-4 flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Digite sua mensagem..."
                className="flex-1 p-2 border rounded-lg outline-none"
              />
              <button
                onClick={sendMessage}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Enviar
              </button>
            </div>
          </>
        )}
      </div>
    </GoogleOAuthProvider>
  );
}
