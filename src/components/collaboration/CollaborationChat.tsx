import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, Bot, UserCircle } from 'lucide-react';
import { toast } from 'sonner';
import { MembersList } from './MembersList';

/* ============================
   Interfaces
============================ */

export interface Collaboration {
  id: string;
  name: string;
  description: string | null;
  creator_id: string;
}

export interface UserProfile {
  id?: string;
  full_name: string | null;
  email: string;
}

export interface Message {
  id: string;
  content: string;
  user_id: string;
  is_ai: boolean;
  created_at: string;
  profiles?: UserProfile | null;
}

interface CollaborationChatProps {
  collaboration: Collaboration;
}

/* ============================
   Component
============================ */

export const CollaborationChat = ({ collaboration }: CollaborationChatProps) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  /* Load + Subscribe */
  useEffect(() => {
    fetchMessages();
    const cleanup = subscribeToMessages();
    return cleanup;
  }, [collaboration.id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  /* Fetch initial messages */
  const fetchMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('collaboration_messages')
        .select('*')
        .eq('collaboration_id', collaboration.id)
        .order('created_at', { ascending: true });

      if (error) throw error;

      if (data?.length) {
        const userIds = [...new Set(data.map((m) => m.user_id))];

        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .in('id', userIds);

        const map = new Map(profiles?.map((p) => [p.id, p]));
        const list = data.map((msg) => ({
          ...msg,
          profiles: map.get(msg.user_id) ?? null,
        }));

        setMessages(list);
      } else setMessages([]);
    } catch (e) {
      console.error(e);
      toast.error("Failed to load messages");
    }
  };

  /* Real-time listener */
  const subscribeToMessages = () => {
    const channel = supabase
      .channel(`collaboration:${collaboration.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'collaboration_messages',
          filter: `collaboration_id=eq.${collaboration.id}`,
        },
        async (payload) => {
          let profile = null;

          if (payload.new.user_id !== 'ai') {
            const { data } = await supabase
              .from('profiles')
              .select('full_name, email')
              .eq('id', payload.new.user_id)
              .single();

            profile = data || null;
          }

          setMessages((prev) => [...prev, { ...(payload.new as Message), profiles: profile }]);
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  };

  /* Scroll */
  const scrollToBottom = () => {
    if (scrollRef.current)
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  };

  /* Save message */
  const sendMessage = async (content: string, isAi: boolean = false) => {
    if (!content.trim()) return;

    try {
      await supabase.from('collaboration_messages').insert({
        collaboration_id: collaboration.id,
        user_id: isAi ? "ai" : user?.id,
        content: content.trim(),
        is_ai: isAi,
      });
    } catch (e) {
      console.error(e);
      toast.error("Failed to send message");
    }
  };

  /* Send handler */
  const handleSendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage = input;
    setInput('');

    // SAVE USER MESSAGE
    await sendMessage(userMessage);

    // AI TRIGGER
    if (userMessage.trim().toLowerCase().startsWith("@ai")) {
      setLoading(true);

      const prompt = userMessage.slice(3).trim();

      try {
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/collaboration-ai`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            },
            body: JSON.stringify({
              message: prompt,
              collaborationId: collaboration.id,
            }),
          }
        );

        if (!response.ok) throw new Error("AI request failed");

        let aiText = "";
        const aiMessageId = crypto.randomUUID();

        setMessages((prev) => [
          ...prev,
          {
            id: aiMessageId,
            content: "",
            user_id: "ai",
            is_ai: true,
            created_at: new Date().toISOString(),
            profiles: null,
          },
        ]);

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();

        while (true) {
          const { value, done } = await reader!.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;

            const data = line.replace("data: ", "");
            if (data === "[DONE]") continue;

            try {
              const parsed = JSON.parse(data);
              if (parsed.choices?.[0]?.delta?.content) {
                aiText += parsed.choices[0].delta.content;
              }
            } catch {
              aiText += data;
            }

            setMessages((prev) =>
              prev.map((m) =>
                m.id === aiMessageId ? { ...m, content: aiText } : m
              )
            );
          }
        }

        if (aiText.trim()) await sendMessage(aiText, true);
      } catch (err) {
        console.error(err);
        toast.error("AI unavailable");
      } finally {
        setLoading(false);
      }
    }
  };

  /* Enter */
  const handleKeyDown = (e: any) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  /* UI */
  return (
    <div className="flex h-full">
      <div className="flex flex-col flex-1">

        {/* Header */}
        <div className="border-b border-border p-4 bg-muted/40 backdrop-blur-md shadow-sm">
          <h2 className="text-xl font-semibold">{collaboration.name}</h2>
          {collaboration.description && (
            <p className="text-sm mt-1 text-muted-foreground">
              {collaboration.description}
            </p>
          )}
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1 p-4" ref={scrollRef}>
          <div className="space-y-4">
            {messages.map((m) => {
              const isSelf = m.user_id === user?.id;
              const isAI = m.user_id === "ai";

              return (
                <div key={m.id} className={`flex gap-3 ${isSelf ? "justify-end" : "justify-start"}`}>

                  {!isSelf && (
                    <div className="flex-shrink-0 mt-auto">
                      {isAI ? (
                        <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center">
                          <Bot className="h-5 w-5 text-primary-foreground" />
                        </div>
                      ) : (
                        <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                          <UserCircle className="h-5 w-5 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                  )}

                  <div
                    className={`max-w-[70%] px-4 py-2 rounded-2xl shadow-sm
                      ${
                        isSelf
                          ? "bg-primary text-primary-foreground rounded-br-none"
                          : isAI
                          ? "bg-muted border border-border text-foreground rounded-bl-none"
                          : "bg-secondary text-secondary-foreground rounded-bl-none"
                      }`}
                  >
                    {!isSelf && !isAI && (
                      <div className="text-xs mb-1 opacity-70 font-medium">
                        {m.profiles?.full_name || m.profiles?.email}
                      </div>
                    )}

                    <p className="text-sm whitespace-pre-wrap">{m.content}</p>
                  </div>

                  {isSelf && (
                    <div className="flex-shrink-0 mt-auto">
                      <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center">
                        <UserCircle className="h-5 w-5 text-primary-foreground" />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </ScrollArea>

        {/* Input */}
        <div className="border-t border-border p-4 bg-muted/30 backdrop-blur-sm">
          <div className="flex gap-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a message... (Use @ai to talk to AI)"
              className="min-h-[60px] max-h-[200px] rounded-xl border-muted shadow-sm"
              disabled={loading}
            />

            <Button
              onClick={handleSendMessage}
              size="icon"
              disabled={!input.trim() || loading}
              className="h-[60px] w-[60px] rounded-xl shadow-md active:scale-95 transition"
            >
              <Send className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>

      <MembersList collaborationId={collaboration.id} creatorId={collaboration.creator_id} />
    </div>
  );
};
