/* ----- SAME IMPORTS ----- */

export const CollaborationChat = ({ collaboration }: CollaborationChatProps) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchMessages();
    const cleanup = subscribeToMessages();
    return cleanup;
  }, [collaboration.id]);

  useEffect(() => scrollToBottom(), [messages]);

  const fetchMessages = async () => {
    const { data } = await supabase
      .from("collaboration_messages")
      .select("*")
      .eq("collaboration_id", collaboration.id)
      .order("created_at", { ascending: true });

    const userIds = [...new Set(data?.map((m) => m.user_id) ?? [])];

    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .in("id", userIds);

    const map = new Map(profiles?.map((p) => [p.id, p]) ?? []);

    setMessages(
      (data ?? []).map((m) => ({
        ...m,
        profiles: m.user_id === "ai" ? null : map.get(m.user_id),
      }))
    );
  };

  const subscribeToMessages = () => {
    const channel = supabase
      .channel(`collab:${collaboration.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          table: "collaboration_messages",
          schema: "public",
          filter: `collaboration_id=eq.${collaboration.id}`,
        },
        async (payload) => {
          let profile = null;

          if (payload.new.user_id !== "ai") {
            const { data } = await supabase
              .from("profiles")
              .select("full_name, email")
              .eq("id", payload.new.user_id)
              .single();

            profile = data;
          }

          setMessages((p) => [...p, { ...payload.new, profiles: profile }]);
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  };

  const sendMessage = async (text: string, isAi = false) => {
    await supabase.from("collaboration_messages").insert({
      collaboration_id: collaboration.id,
      user_id: isAi ? "ai" : user?.id,
      is_ai: isAi,
      content: text,
    });
  };

  const handleSendMessage = async () => {
    if (!input.trim()) return;
    const userText = input;
    setInput("");
    await sendMessage(userText);

    if (!userText.toLowerCase().startsWith("@ai")) return;

    setLoading(true);

    const cleanText = userText.replace("@ai", "").trim();

    try {
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/collaboration-ai`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: cleanText }),
        }
      );

      const data = await res.json();

      await sendMessage(data.text, true);
    } catch (err) {
      toast.error("AI unavailable");
      console.log(err);
    }

    setLoading(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flex h-full">
      <div className="flex flex-col flex-1">
        
        {/* Header */}
        <div className="p-4 border-b bg-muted/30">
          <h2 className="text-xl font-semibold">{collaboration.name}</h2>
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1 p-4" ref={scrollRef}>
          <div className="space-y-4">
            {messages.map((m) => {
              const isSelf = m.user_id === user?.id;
              const isAI = m.user_id === "ai";

              return (
                <div
                  key={m.id}
                  className={`flex gap-3 ${isSelf ? "justify-end" : "justify-start"}`}
                >
                  
                  {/* AVATAR LEFT */}
                  {!isSelf && (
                    <div className="flex-shrink-0">
                      {isAI ? (
                        <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center">
                          <Bot className="h-5 w-5 text-white" />
                        </div>
                      ) : (
                        <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                          <UserCircle className="h-5 w-5" />
                        </div>
                      )}
                    </div>
                  )}

                  {/* BUBBLE */}
                  <div
                    className={`max-w-[70%] rounded-lg px-4 py-2 ${
                      isSelf
                        ? "bg-primary text-white"
                        : isAI
                        ? "bg-muted border"
                        : "bg-secondary"
                    }`}
                  >
                    {!isSelf && !isAI && (
                      <p className="text-xs opacity-70 mb-1">{m.profiles?.full_name}</p>
                    )}
                    <p className="text-sm whitespace-pre-wrap">{m.content}</p>
                  </div>

                  {/* AVATAR RIGHT */}
                  {isSelf && (
                    <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center">
                      <UserCircle className="h-5 w-5 text-white" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </ScrollArea>

        {/* Input */}
        <div className="p-4 border-t">
          <div className="flex gap-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a message... Use @ai for AI help"
              className="min-h-[60px]"
            />
            <Button
              disabled={loading}
              onClick={handleSendMessage}
              className="h-[60px] w-[60px]"
            >
              <Send />
            </Button>
          </div>
        </div>
      </div>

      <MembersList
        collaborationId={collaboration.id}
        creatorId={collaboration.creator_id}
      />
    </div>
  );
};
