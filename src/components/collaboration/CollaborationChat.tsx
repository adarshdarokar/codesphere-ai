import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, Bot, UserCircle } from 'lucide-react';
import { toast } from 'sonner';
import { MembersList } from './MembersList';

interface Collaboration {
  id: string;
  name: string;
  description: string | null;
  creator_id: string;
}

interface Message {
  id: string;
  content: string;
  user_id: string;
  is_ai: boolean;
  created_at: string;
  profiles?: {
    full_name: string | null;
    email: string;
  };
}

interface CollaborationChatProps {
  collaboration: Collaboration;
}

export const CollaborationChat = ({ collaboration }: CollaborationChatProps) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchMessages();
    subscribeToMessages();
  }, [collaboration.id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('collaboration_messages')
        .select('*')
        .eq('collaboration_id', collaboration.id)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Fetch profiles separately
      if (data && data.length > 0) {
        const userIds = [...new Set(data.map(m => m.user_id))];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .in('id', userIds);

        const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
        const messagesWithProfiles = data.map(msg => ({
          ...msg,
          profiles: profileMap.get(msg.user_id),
        }));

        setMessages(messagesWithProfiles);
      } else {
        setMessages(data || []);
      }
    } catch (error: any) {
      toast.error('Failed to load messages');
      console.error('Error fetching messages:', error);
    }
  };

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
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, email')
            .eq('id', payload.new.user_id)
            .single();

          setMessages((prev) => [...prev, { ...payload.new as Message, profiles: profile }]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  };

  const sendMessage = async (content: string, isAi: boolean = false) => {
    if (!user || !content.trim()) return;

    try {
      const { error } = await supabase
        .from('collaboration_messages')
        .insert({
          collaboration_id: collaboration.id,
          user_id: user.id,
          content: content.trim(),
          is_ai: isAi,
        });

      if (error) throw error;
    } catch (error: any) {
      toast.error('Failed to send message');
      console.error('Error sending message:', error);
    }
  };

  const handleSendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage = input;
    setInput('');

    // Check if message is for AI (starts with @ai)
    if (userMessage.trim().toLowerCase().startsWith('@ai')) {
      setLoading(true);
      const aiPrompt = userMessage.slice(3).trim();
      
      await sendMessage(userMessage);

      // Call AI
      try {
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/collaboration-ai`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            },
            body: JSON.stringify({
              message: aiPrompt,
              collaborationId: collaboration.id,
            }),
          }
        );

        if (!response.ok) throw new Error('AI request failed');

        const reader = response.body?.getReader();
        if (!reader) throw new Error('No reader available');

        let aiResponse = '';
        let aiMessageId = crypto.randomUUID();
        
        // Add empty AI message that will be updated
        setMessages(prev => [...prev, {
          id: aiMessageId,
          content: '',
          user_id: user!.id,
          is_ai: true,
          created_at: new Date().toISOString(),
        }]);

        const decoder = new TextDecoder();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') continue;

              try {
                const parsed = JSON.parse(data);
                if (parsed.choices?.[0]?.delta?.content) {
                  aiResponse += parsed.choices[0].delta.content;
                  setMessages(prev => prev.map(msg => 
                    msg.id === aiMessageId 
                      ? { ...msg, content: aiResponse }
                      : msg
                  ));
                }
              } catch (e) {
                console.error('Error parsing chunk:', e);
              }
            }
          }
        }

        // Save final AI message
        if (aiResponse) {
          await sendMessage(aiResponse, true);
        }
      } catch (error: any) {
        toast.error('AI assistant is unavailable');
        console.error('Error calling AI:', error);
      } finally {
        setLoading(false);
      }
    } else {
      // Regular user message
      await sendMessage(userMessage);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flex h-full">
      <div className="flex flex-col flex-1">
      {/* Header */}
      <div className="border-b border-border p-4 bg-muted/30">
        <h2 className="text-xl font-semibold text-foreground">{collaboration.name}</h2>
        {collaboration.description && (
          <p className="text-sm text-muted-foreground mt-1">{collaboration.description}</p>
        )}
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-3 ${
                message.user_id === user?.id ? 'justify-end' : 'justify-start'
              }`}
            >
              {message.user_id !== user?.id && (
                <div className="flex-shrink-0">
                  {message.is_ai ? (
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
                className={`max-w-[70%] rounded-lg px-4 py-2 ${
                  message.user_id === user?.id
                    ? 'bg-primary text-primary-foreground'
                    : message.is_ai
                    ? 'bg-muted border border-border'
                    : 'bg-secondary text-secondary-foreground'
                }`}
              >
                {message.user_id !== user?.id && !message.is_ai && (
                  <div className="text-xs font-medium mb-1 opacity-70">
                    {message.profiles?.full_name || message.profiles?.email}
                  </div>
                )}
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
              </div>

              {message.user_id === user?.id && (
                <div className="flex-shrink-0">
                  <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center">
                    <UserCircle className="h-5 w-5 text-primary-foreground" />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="border-t border-border p-4 bg-muted/30">
        <div className="flex gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message... (Use @ai to talk to AI, Shift+Enter for new line)"
            className="min-h-[60px] max-h-[200px]"
            disabled={loading}
          />
          <Button
            onClick={handleSendMessage}
            disabled={!input.trim() || loading}
            size="icon"
            className="h-[60px] w-[60px]"
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
