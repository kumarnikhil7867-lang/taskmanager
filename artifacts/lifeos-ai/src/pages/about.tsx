import { Bot, CheckSquare, LayoutDashboard, MessageSquare, Activity, Zap, Target, Trash2, BarChart2, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const features = [
  {
    icon: MessageSquare,
    title: "AI Chat Assistant",
    badge: "Core",
    description:
      "Talk to LifeOS in plain English. The AI understands typos, casual phrasing, and abbreviations. It remembers the last few messages for context so conversations feel natural.",
    examples: [
      "\"I solved 20 SQL questions\"",
      "\"how many tasks left today?\"",
      "\"delete the reading task\"",
      "\"hi, what can you do?\"",
    ],
  },
  {
    icon: Target,
    title: "Task Creation",
    badge: "AI",
    description:
      "Create measurable goals by just describing them. The AI extracts the title, target number, unit, and timeframe automatically.",
    examples: [
      "\"I want to solve 50 SQL questions today\"",
      "\"add a goal: read 30 pages this week\"",
      "\"100 pushups this month\"",
    ],
  },
  {
    icon: Zap,
    title: "Progress Logging",
    badge: "AI",
    description:
      "Log your progress conversationally. The AI fuzzy-matches your message to the right task even if you use different words.",
    examples: [
      "\"done 10 more\"",
      "\"I finished 5 sql problems\"",
      "\"set my reading to 20 pages total\"",
      "\"reset the SQL task\"",
    ],
  },
  {
    icon: Trash2,
    title: "Task Deletion",
    badge: "AI",
    description:
      "Remove tasks you no longer need by asking the AI. You can delete a specific task or all tasks at once.",
    examples: [
      "\"delete the SQL questions task\"",
      "\"remove this task\"",
      "\"delete all tasks\"",
    ],
  },
  {
    icon: LayoutDashboard,
    title: "Dashboard",
    badge: "View",
    description:
      "Your mission control. See all active tasks with progress bars, today's activity count, and a quick summary of what's done versus what's remaining.",
    examples: [
      "Tasks with live progress bars",
      "Today's completed activity count",
      "Remaining work at a glance",
    ],
  },
  {
    icon: CheckSquare,
    title: "Tasks Page",
    badge: "View",
    description:
      "View and manage all your tasks in one place. See full details — target, completed amount, unit, due scope, and status for every goal.",
    examples: [
      "All active and completed tasks",
      "Progress per task",
      "Due scope (today / this week / goal)",
    ],
  },
  {
    icon: Activity,
    title: "Activity Timeline",
    badge: "View",
    description:
      "A chronological log of everything you've done — every task creation, progress update, and reset — with the exact message you sent.",
    examples: [
      "Full history of all actions",
      "What message triggered each change",
      "Timestamps for every entry",
    ],
  },
  {
    icon: BarChart2,
    title: "Quick Add",
    badge: "Shortcut",
    description:
      "A keyboard-friendly shortcut (the + button) to send an AI command without leaving your current page. Press Enter to submit.",
    examples: [
      "Available on every page",
      "Press Enter to submit instantly",
      "Same AI power as the Chat page",
    ],
  },
  {
    icon: Clock,
    title: "Persistent Sessions",
    badge: "Auth",
    description:
      "Secure login with persistent sessions — you stay signed in across browser restarts. Supports email/password login, Google sign-in, and forgot password.",
    examples: [
      "Stay logged in automatically",
      "Google sign-in",
      "Forgot password via email",
    ],
  },
];

const chatExamples = [
  { input: "sql 50 question today", output: "Creates 'SQL questions' task — 50 questions, due today" },
  { input: "I solved 20 questions", output: "Logs +20 progress on the SQL questions task" },
  { input: "how many left?", output: "Shows remaining for all active tasks" },
  { input: "delete these tasks", output: "Deletes all tasks" },
  { input: "hi", output: "Greets you and explains what it can help with" },
  { input: "what's a good study strategy?", output: "Gives genuine advice as a conversational response" },
];

export default function About() {
  return (
    <div className="p-4 md:p-6 space-y-8 max-w-3xl mx-auto w-full">
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Bot className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">About LifeOS AI</h1>
            <p className="text-sm text-muted-foreground">Version 1.0 · Built with Gemini 2.5 Flash</p>
          </div>
        </div>
        <p className="text-muted-foreground leading-relaxed pt-2">
          LifeOS AI is a personal execution assistant that helps you track measurable goals through
          natural conversation. Tell it what you did, ask it what's left, or just chat — it handles
          everything without forms or manual input.
        </p>
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold tracking-tight">Features</h2>
        <div className="grid gap-4">
          {features.map((f) => {
            const Icon = f.icon;
            return (
              <Card key={f.title} className="border-border/60">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Icon className="w-4 h-4 text-primary" />
                    </div>
                    <CardTitle className="text-base font-semibold">{f.title}</CardTitle>
                    <Badge variant="secondary" className="text-[10px] ml-auto shrink-0">{f.badge}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground leading-relaxed">{f.description}</p>
                  <div className="flex flex-wrap gap-2">
                    {f.examples.map((ex) => (
                      <span
                        key={ex}
                        className="text-[11px] bg-secondary text-secondary-foreground px-2 py-1 rounded-md font-mono"
                      >
                        {ex}
                      </span>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold tracking-tight">How the AI understands you</h2>
        <Card className="border-border/60">
          <CardContent className="pt-4 space-y-0 divide-y divide-border/50">
            {chatExamples.map((ex) => (
              <div key={ex.input} className="py-3 grid grid-cols-1 sm:grid-cols-2 gap-1 sm:gap-4">
                <span className="text-sm font-mono text-primary">"{ex.input}"</span>
                <span className="text-sm text-muted-foreground">→ {ex.output}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold tracking-tight">Tech stack</h2>
        <div className="flex flex-wrap gap-2">
          {[
            "React + Vite",
            "TypeScript",
            "Tailwind CSS v4",
            "shadcn/ui",
            "Express.js",
            "PostgreSQL",
            "Drizzle ORM",
            "Gemini 2.5 Flash",
            "Clerk Auth",
            "pnpm monorepo",
          ].map((tech) => (
            <Badge key={tech} variant="outline" className="text-xs font-normal">
              {tech}
            </Badge>
          ))}
        </div>
      </div>
    </div>
  );
}
