import { useGetDashboardSummary, useListTasks, useGetActivityTimeline } from "@workspace/api-client-react";
import { TaskCard } from "@/components/task-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, CheckCircle, Target, TrendingUp } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function Dashboard() {
  const { data: summary, isLoading: isLoadingSummary } = useGetDashboardSummary();
  const { data: tasks, isLoading: isLoadingTasks } = useListTasks({ status: 'active' });

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto w-full">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Here is what is happening today.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard 
          title="Active Tasks" 
          value={summary?.active_task_count} 
          icon={Target} 
          isLoading={isLoadingSummary} 
        />
        <StatCard 
          title="Completed Tasks" 
          value={summary?.completed_task_count} 
          icon={CheckCircle} 
          isLoading={isLoadingSummary} 
        />
        <StatCard 
          title="Units Today" 
          value={summary?.today_activity_count} 
          icon={Activity} 
          isLoading={isLoadingSummary} 
        />
        <StatCard 
          title="Remaining Units" 
          value={summary?.total_units_remaining} 
          icon={TrendingUp} 
          isLoading={isLoadingSummary} 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Active Tasks</h2>
            <Link href="/tasks">
              <Button variant="link" size="sm" className="text-primary">View All</Button>
            </Link>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {isLoadingTasks ? (
              <>
                <Skeleton className="h-[140px] rounded-xl" />
                <Skeleton className="h-[140px] rounded-xl" />
              </>
            ) : tasks && tasks.length > 0 ? (
              tasks.slice(0, 4).map(task => (
                <TaskCard key={task.id} task={task} />
              ))
            ) : (
              <div className="col-span-full py-8 text-center bg-card rounded-xl border border-dashed text-muted-foreground">
                <p>No active tasks.</p>
                <Link href="/chat">
                  <Button variant="outline" size="sm" className="mt-4">Ask AI to create one</Button>
                </Link>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Most Active Task</h2>
          {isLoadingSummary ? (
            <Skeleton className="h-[140px] rounded-xl" />
          ) : summary?.most_active_task ? (
            <TaskCard task={summary.most_active_task} />
          ) : (
            <div className="py-8 text-center bg-card rounded-xl border border-dashed text-muted-foreground text-sm">
              <p>Not enough activity yet.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, isLoading }: { title: string, value?: number, icon: any, isLoading: boolean }) {
  return (
    <Card className="bg-card">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <Icon className="h-4 w-4 text-primary" />
      </CardHeader>
      <CardContent className="p-4 pt-0">
        {isLoading ? (
          <Skeleton className="h-8 w-16" />
        ) : (
          <div className="text-2xl font-bold">{value ?? 0}</div>
        )}
      </CardContent>
    </Card>
  );
}
