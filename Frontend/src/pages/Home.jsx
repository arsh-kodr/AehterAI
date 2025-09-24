import React, { useCallback, useEffect, useState } from 'react';
import { io } from "socket.io-client";
import ChatMobileBar from '../components/chat/ChatMobileBar.jsx';
import ChatSidebar from '../components/chat/ChatSidebar.jsx';
import ChatMessages from '../components/chat/ChatMessages.jsx';
import ChatComposer from '../components/chat/ChatComposer.jsx';
import '../components/chat/ChatLayout.css';
import { useDispatch, useSelector } from 'react-redux';
import axios from 'axios';
import {
  startNewChat,
  selectChat,
  setInput,
  sendingStarted,
  sendingFinished,
  setChats
} from '../store/chatSlice.js';

// Configure axios to always send credentials
axios.defaults.withCredentials = true;

const Home = () => {
  const dispatch = useDispatch();
  const chats = useSelector(state => state.chat.chats);
  const activeChatId = useSelector(state => state.chat.activeChatId);
  const input = useSelector(state => state.chat.input);
  const isSending = useSelector(state => state.chat.isSending);
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const [socket, setSocket] = useState(null);
  const [messages, setMessages] = useState([]);

  const activeChat = chats.find(c => c.id === activeChatId) || null;

  const handleNewChat = async () => {
    let title = window.prompt('Enter a title for the new chat:', '');
    if (title) title = title.trim();
    if (!title) return;

    try {
      const response = await axios.post("http://localhost:3000/api/chat", { title });
      dispatch(startNewChat(response.data.chat));
      dispatch(selectChat(response.data.chat._id));
      setMessages([]); // Clear messages for new chat
      setSidebarOpen(false);
    } catch (error) {
      console.error("Error creating chat:", error);
      if (error.response?.status === 401) {
        // Redirect to login or handle unauthorized
        window.location.href = '/login';
      }
    }
  }

  const getChats = async () => {
    try {
      const response = await axios.get("http://localhost:3000/api/chat");
      dispatch(setChats(response.data.chats.reverse()));
      
      // Auto-select first chat if none selected
      if (response.data.chats.length > 0 && !activeChatId) {
        const firstChat = response.data.chats[0];
        dispatch(selectChat(firstChat._id));
        getMessages(firstChat._id);
      }
    } catch (error) {
      console.error("Error fetching chats:", error);
      if (error.response?.status === 401) {
        // Handle unauthorized
        window.location.href = '/login';
      }
    }
  }

  const getMessages = async (chatId) => {
    try {
      const response = await axios.get(`http://localhost:3000/api/chat/messages/${chatId}`);
      setMessages(response.data.messages.map(m => ({
        type: m.role === 'user' ? 'user' : 'ai',
        content: m.content
      })));
    } catch (error) {
      console.error("Error fetching messages:", error);
    }
  }

  const sendMessage = async () => {
    const trimmed = input.trim();
    if (!trimmed || !activeChatId || isSending) return;

    dispatch(sendingStarted());
    
    // Add user message immediately
    const userMessage = {
      type: 'user',
      content: trimmed
    };
    
    setMessages(prev => [...prev, userMessage]);
    dispatch(setInput(''));

    try {
      // Emit to socket
      socket.emit("ai-message", {
        chat: activeChatId,
        content: trimmed
      });
    } catch (error) {
      console.error("Error sending message:", error);
      dispatch(sendingFinished());
    }
  }

useEffect(() => {
    getChats();

    // Initialize socket connection
    const newSocket = io("http://localhost:3000", {
        withCredentials: true,
    });

    newSocket.on("connect", () => {
        console.log("Socket connected successfully");
    });

    newSocket.on("ai-response", (messagePayload) => {
        console.log("Received AI response:", messagePayload);
        
        setMessages(prev => {
            // Prevent duplicate AI messages
            const lastMessage = prev[prev.length - 1];
            if (lastMessage && lastMessage.type === 'ai' && lastMessage.content === messagePayload.content) {
                return prev; // Skip if same message already exists
            }
            return [...prev, {
                type: 'ai',
                content: messagePayload.content
            }];
        });
        
        dispatch(sendingFinished());
    });

    newSocket.on("ai-response-error", (error) => {
        console.error("AI response error:", error);
        
        setMessages(prev => {
            // Check if we already have an error message
            const hasError = prev.some(msg => 
                msg.type === 'ai' && msg.content.includes('Sorry, I encountered an error')
            );
            
            if (hasError) {
                return prev;
            }
            
            return [...prev, {
                type: 'ai',
                content: 'Sorry, I encountered an error. Please try again.'
            }];
        });
        
        dispatch(sendingFinished());
    });

    newSocket.on("connect_error", (error) => {
        console.error("Socket connection error:", error);
    });

    setSocket(newSocket);

    return () => {
        if (newSocket) {
            newSocket.disconnect();
        }
    };
}, []);
  // Load messages when active chat changes
  useEffect(() => {
    if (activeChatId) {
      getMessages(activeChatId);
    }
  }, [activeChatId]);

  return (
    <div className="chat-layout minimal">
      <ChatMobileBar
        onToggleSidebar={() => setSidebarOpen(o => !o)}
        onNewChat={handleNewChat}
      />
      <ChatSidebar
        chats={chats}
        activeChatId={activeChatId}
        onSelectChat={(id) => {
          dispatch(selectChat(id));
          setSidebarOpen(false);
        }}
        onNewChat={handleNewChat}
        open={sidebarOpen}
      />
      <main className="chat-main" role="main">
        {messages.length === 0 && (
          <div className="chat-welcome" aria-hidden="true">
            <div className="chip">Early Preview</div>
            <h1>ChatGPT Clone</h1>
            <p>Ask anything. Paste text, brainstorm ideas, or get quick explanations. Your chats stay in the sidebar so you can pick up where you left off.</p>
          </div>
        )}
        <ChatMessages messages={messages} isSending={isSending} />
        {activeChatId && (
          <ChatComposer
            input={input}
            setInput={(v) => dispatch(setInput(v))}
            onSend={sendMessage}
            isSending={isSending}
          />
        )}
      </main>
      {sidebarOpen && (
        <button
          className="sidebar-backdrop"
          aria-label="Close sidebar"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
};

export default Home;