import { useState, useRef, useEffect } from "react";
import { useGetChatHistory, useSendChatMessage, getGetChatHistoryQueryKey, getListTasksQueryKey, getGetDashboardSummaryQueryKey, getGetActivityTimelineQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Send, Bot, User as UserIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { TaskCard } from "@/components/task-card";

export default function Chat() {
  const [content, setContent] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const { data: messages, isLoading } = useGetChatHistory({ limit: 50 });
  const sendMessage = useSendChatMessage();
  const qc = useQueryClient();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, sendMessage.isPending]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || sendMessage.isPending) return;

    const currentContent = content.trim();
    setContent("");

    // Optimistically could add to UI here if we wanted complex local state management
    
    sendMessage.mutate({ data: { content: currentContent } }, {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getGetChatHistoryQueryKey() });
        qc.invalidateQueries({ queryKey: getListTasksQueryKey() });
        qc.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
        qc.invalidateQueries({ queryKey: getGetActivityTimelineQueryKey() });
      }
    });
  };

  return (
    <div className="flex flex-col h-full bg-background max-w-4xl mx-auto w-full">
      <div className="p-4 border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <h1 className="text-xl font-bold tracking-tight">AI Assistant</h1>
        <p className="text-xs text-muted-foreground">Log progress, create tasks, or ask about your goals.</p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-16 w-3/4 rounded-2xl rounded-tl-sm" />
            <Skeleton className="h-16 w-3/4 rounded-2xl rounded-tr-sm ml-auto" />
            <Skeleton className="h-24 w-3/4 rounded-2xl rounded-tl-sm" />
          </div>
        ) : messages && messages.length > 0 ? (
          <div className="space-y-6">
            {messages.map((msg, i) => {
              const isUser = msg.role === 'user';
              return (
                <div key={msg.id || i} className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}>
                  {!isUser && (
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                      <Bot className="w-4 h-4 text-primary" />
                    </div>
                  )}
                  <div className={`flex flex-col gap-1 max-w-[80%] ${isUser ? 'items-end' : 'items-start'}`}>
                    <div className={`px-4 py-3 rounded-2xl text-sm ${
                      isUser 
                        ? 'bg-primary text-primary-foreground rounded-br-sm' 
                        : 'bg-card border border-border text-foreground rounded-bl-sm'
                    }`}>
                      {msg.content}
                    </div>
                    <span className="text-[10px] text-muted-foreground px-1">
                      {msg.created_at ? format(new Date(msg.created_at), 'h:mm a') : ''}
                    </span>
                  </div>
                  {isUser && (
                    <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center shrink-0">
                      <UserIcon className="w-4 h-4 text-muted-foreground" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-3 opacity-50">
            <Bot className="w-12 h-12 text-primary" />
            <p className="text-sm max-w-xs">
              I am your LifeOS execution assistant.<br/>
              Tell me what you did today, or ask me to create a task for you.
            </p>
          </div>
        )}
        
        {/* Temporary Optimistic/Loading State */}
        {sendMessage.isPending && (
          <div className="flex gap-3 justify-start opacity-50">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
              <Bot className="w-4 h-4 text-primary" />
            </div>
            <div className="px-4 py-3 rounded-2xl rounded-bl-sm bg-card border border-border text-sm flex gap-1">
              <span className="animate-pulse">●</span>
              <span className="animate-pulse delay-75">●</span>
              <span className="animate-pulse delay-150">●</span>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 bg-background border-t border-border">
        <form onSubmit={handleSubmit} className="flex gap-2 items-end">
          <Input 
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="e.g. Added 50 pages to reading task..."
            className="flex-1 rounded-full bg-card h-12 px-5"
            autoComplete="off"
            disabled={sendMessage.isPending}
          />
          <Button 
            type="submit" 
            size="icon" 
            className="h-12 w-12 rounded-full shrink-0 shadow-sm"
            disabled={!content.trim() || sendMessage.isPending}
          >
            <Send className="w-5 h-5" />
          </Button>
        </form>
      </div>
    </div>
  );
}
