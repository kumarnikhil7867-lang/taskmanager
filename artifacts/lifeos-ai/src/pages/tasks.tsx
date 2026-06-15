import { useState } from "react";
import { useListTasks, useCreateTask, useUpdateTaskProgress, useUpdateTask, useDeleteTask, getListTasksQueryKey, getGetDashboardSummaryQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TaskCard } from "@/components/task-card";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Tasks() {
  const [activeTab, setActiveTab] = useState("active");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  
  const { data: activeTasks, isLoading: isLoadingActive } = useListTasks({ status: 'active' });
  const { data: completedTasks, isLoading: isLoadingCompleted } = useListTasks({ status: 'completed' });
  
  const qc = useQueryClient();
  const updateProgress = useUpdateTaskProgress();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();

  const handleAddProgress = (taskId: number, amount: number) => {
    updateProgress.mutate({ 
      id: taskId, 
      data: { operation: 'add', amount } 
    }, {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListTasksQueryKey() });
        qc.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
      }
    });
  };

  const handleUpdateStatus = (taskId: number, status: 'active'|'completed'|'paused') => {
    updateTask.mutate({ id: taskId, data: { status } }, {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListTasksQueryKey() });
        qc.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
      }
    });
  };

  const handleDelete = (taskId: number) => {
    deleteTask.mutate({ id: taskId }, {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListTasksQueryKey() });
        qc.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
      }
    });
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto w-full">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tasks</h1>
          <p className="text-sm text-muted-foreground">Manage and track your goals.</p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">New Task</span>
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-[400px]">
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
        </TabsList>
        
        <TabsContent value="active" className="mt-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {isLoadingActive ? (
              Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-[140px] rounded-xl" />)
            ) : activeTasks && activeTasks.length > 0 ? (
              activeTasks.map(task => (
                <TaskCard 
                  key={task.id} 
                  task={task} 
                  onAddProgress={(amount) => handleAddProgress(task.id, amount)}
                  onUpdateStatus={(status) => handleUpdateStatus(task.id, status)}
                  onDelete={() => handleDelete(task.id)}
                />
              ))
            ) : (
              <div className="col-span-full py-12 text-center bg-card rounded-xl border border-dashed text-muted-foreground">
                <p>No active tasks found.</p>
              </div>
            )}
          </div>
        </TabsContent>
        
        <TabsContent value="completed" className="mt-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {isLoadingCompleted ? (
              Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-[140px] rounded-xl" />)
            ) : completedTasks && completedTasks.length > 0 ? (
              completedTasks.map(task => (
                <TaskCard 
                  key={task.id} 
                  task={task} 
                  onUpdateStatus={(status) => handleUpdateStatus(task.id, status)}
                  onDelete={() => handleDelete(task.id)}
                />
              ))
            ) : (
              <div className="col-span-full py-12 text-center bg-card rounded-xl border border-dashed text-muted-foreground">
                <p>No completed tasks yet.</p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      <CreateTaskDialog open={isCreateOpen} onOpenChange={setIsCreateOpen} />
    </div>
  );
}

function CreateTaskDialog({ open, onOpenChange }: { open: boolean, onOpenChange: (open: boolean) => void }) {
  const [title, setTitle] = useState("");
  const [target, setTarget] = useState("");
  const [unit, setUnit] = useState("");
  const [scope, setScope] = useState<string>("today");
  
  const createTask = useCreateTask();
  const qc = useQueryClient();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !target || !unit) return;

    createTask.mutate({
      data: {
        title,
        target_value: Number(target),
        unit,
        due_scope: scope as any
      }
    }, {
      onSuccess: () => {
        onOpenChange(false);
        setTitle("");
        setTarget("");
        setUnit("");
        setScope("today");
        qc.invalidateQueries({ queryKey: getListTasksQueryKey() });
        qc.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create New Task</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="title">Task Title</Label>
            <Input id="title" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Read Dune" required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="target">Target Value</Label>
              <Input id="target" type="number" min="1" value={target} onChange={e => setTarget(e.target.value)} placeholder="e.g. 50" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="unit">Unit</Label>
              <Input id="unit" value={unit} onChange={e => setUnit(e.target.value)} placeholder="e.g. pages" required />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="scope">Scope</Label>
            <Select value={scope} onValueChange={setScope}>
              <SelectTrigger>
                <SelectValue placeholder="Select scope" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="this_week">This Week</SelectItem>
                <SelectItem value="this_month">This Month</SelectItem>
                <SelectItem value="goal">Long-term Goal</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="pt-4 flex justify-end">
            <Button type="submit" disabled={createTask.isPending}>
              {createTask.isPending ? "Creating..." : "Create Task"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
