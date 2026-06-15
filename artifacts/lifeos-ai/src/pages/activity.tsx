import { useListActivityLogs } from "@workspace/api-client-react";
import { format } from "date-fns";
import { Activity, Plus, Minus, RefreshCw, Pencil } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

export default function ActivityPage() {
  const { data: logs, isLoading } = useListActivityLogs({ limit: 100 });

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-4xl mx-auto w-full">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Activity Log</h1>
        <p className="text-muted-foreground text-sm">A complete history of your execution.</p>
      </div>

      <div className="space-y-8">
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : logs && logs.length > 0 ? (
          <div className="relative border-l border-border ml-3 md:ml-4 space-y-6">
            {logs.map((log) => {
              const Icon = getIconForOperation(log.operation);
              return (
                <div key={log.id} className="relative pl-6 md:pl-8">
                  <div className="absolute -left-3 md:-left-4 top-1 w-6 h-6 md:w-8 md:h-8 rounded-full bg-card border-2 border-background flex items-center justify-center shadow-sm">
                    <Icon className="w-3 h-3 md:w-4 md:h-4 text-primary" />
                  </div>
                  <Card className="bg-card/50">
                    <CardContent className="p-3 md:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="space-y-1">
                        <div className="text-sm font-medium">
                          {log.operation === 'add' && <span className="text-green-500 mr-1">+{log.amount}</span>}
                          {log.operation === 'subtract' && <span className="text-red-500 mr-1">-{log.amount}</span>}
                          {log.operation === 'set' && <span className="text-blue-500 mr-1">Set to {log.amount}</span>}
                          {log.operation === 'create' && <span>Created</span>}
                          <span className="text-muted-foreground ml-1">in</span> {log.task_title}
                        </div>
                        {log.user_message && (
                          <div className="text-xs text-muted-foreground italic border-l-2 border-border pl-2 py-0.5">
                            "{log.user_message}"
                          </div>
                        )}
                      </div>
                      <div className="text-[10px] sm:text-xs text-muted-foreground whitespace-nowrap">
                        {format(new Date(log.created_at), 'MMM d, h:mm a')}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-12 text-center text-muted-foreground border border-dashed rounded-xl bg-card">
            No activity recorded yet.
          </div>
        )}
      </div>
    </div>
  );
}

function getIconForOperation(op: string) {
  switch (op) {
    case 'add': return Plus;
    case 'subtract': return Minus;
    case 'set': return Pencil;
    case 'reset': return RefreshCw;
    case 'create': return Activity;
    default: return Activity;
  }
}
