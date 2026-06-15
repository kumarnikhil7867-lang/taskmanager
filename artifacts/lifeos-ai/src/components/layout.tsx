import { Link, useLocation } from "wouter";
import { LayoutDashboard, MessageSquare, CheckSquare, Activity as ActivityIcon, Settings, Plus, X, Info } from "lucide-react";
import { useSendChatMessage, getGetDashboardSummaryQueryKey, getListTasksQueryKey, getGetActivityTimelineQueryKey, getGetChatHistoryQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Textarea } from "./ui/textarea";

const NAV_ITEMS = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/chat", icon: MessageSquare, label: "Chat" },
  { href: "/tasks", icon: CheckSquare, label: "Tasks" },
  { href: "/activity", icon: ActivityIcon, label: "Activity" },
  { href: "/about", icon: Info, label: "About" },
  { href: "/settings", icon: Settings, label: "Settings" },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [quickAddOpen, setQuickAddOpen] = useState(false);

  return (
    <div className="flex h-[100dvh] w-full bg-background overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 border-r border-border bg-card/50">
        <div className="p-6">
          <h1 className="text-xl font-bold tracking-tight text-primary">LifeOS</h1>
        </div>
        <nav className="flex-1 px-4 space-y-2">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = location === item.href;
            return (
              <Link key={item.href} href={item.href}>
                <div className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors cursor-pointer ${isActive ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:text-foreground hover:bg-secondary"}`}>
                  <Icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </div>
              </Link>
            );
          })}
        </nav>
        <div className="p-4">
          <Button className="w-full gap-2 shadow-md" onClick={() => setQuickAddOpen(true)}>
            <Plus className="w-4 h-4" />
            Quick Add
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full overflow-y-auto pb-16 md:pb-0 relative">
        {children}
        
        {/* Mobile Floating Action Button */}
        <div className="md:hidden fixed bottom-20 right-4 z-50">
          <Button 
            size="icon" 
            className="w-14 h-14 rounded-full shadow-xl shadow-primary/20"
            onClick={() => setQuickAddOpen(true)}
          >
            <Plus className="w-6 h-6" />
          </Button>
        </div>
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 w-full bg-card border-t border-border flex items-center justify-around p-2 z-40 pb-safe">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = location === item.href;
          return (
            <Link key={item.href} href={item.href}>
              <div className={`flex flex-col items-center justify-center w-16 h-12 rounded-lg cursor-pointer ${isActive ? "text-primary" : "text-muted-foreground"}`}>
                <Icon className={`w-6 h-6 ${isActive ? "fill-primary/20" : ""}`} />
                <span className="text-[10px] mt-1 font-medium">{item.label}</span>
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Quick Add Dialog */}
      <QuickAddDialog open={quickAddOpen} onOpenChange={setQuickAddOpen} />
    </div>
  );
}

function QuickAddDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [content, setContent] = useState("");
  const sendMessage = useSendChatMessage();
  const qc = useQueryClient();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    sendMessage.mutate({ data: { content: content.trim() } }, {
      onSuccess: () => {
        setContent("");
        onOpenChange(false);
        qc.invalidateQueries({ queryKey: getListTasksQueryKey() });
        qc.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
        qc.invalidateQueries({ queryKey: getGetActivityTimelineQueryKey() });
        qc.invalidateQueries({ queryKey: getGetChatHistoryQueryKey() });
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card/95 backdrop-blur-xl border-border top-[30%] sm:top-1/2 rounded-2xl">
        <DialogTitle className="sr-only">Quick Add</DialogTitle>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Textarea 
            placeholder="Type a command (e.g. '+20 pages of Dune' or 'Create a task for 50 pushups')"
            className="min-h-[100px] resize-none text-lg border-0 focus-visible:ring-0 bg-transparent px-0"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
          />
          <div className="flex justify-end pt-2 border-t border-border/50">
            <Button type="submit" disabled={!content.trim() || sendMessage.isPending} className="rounded-full px-6">
              {sendMessage.isPending ? "Sending..." : "Submit"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
