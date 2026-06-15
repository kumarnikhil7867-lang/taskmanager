import { useState } from "react";
import { format, formatDistanceToNow } from "date-fns";
import { Check, Clock, MoreVertical, Plus, Minus, Trash } from "lucide-react";
import { Task, TaskStatus } from "@workspace/api-client-react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "./ui/card";
import { Progress } from "./ui/progress";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "./ui/dropdown-menu";

interface TaskCardProps {
  task: Task;
  onAddProgress?: (amount: number) => void;
  onUpdateStatus?: (status: TaskStatus) => void;
  onDelete?: () => void;
}

export function TaskCard({ task, onAddProgress, onUpdateStatus, onDelete }: TaskCardProps) {
  const percent = Math.min(100, Math.round((task.completed_value / task.target_value) * 100));
  const isCompleted = task.status === "completed" || task.completed_value >= task.target_value;

  return (
    <Card className={`transition-all duration-200 overflow-hidden ${isCompleted ? 'bg-muted/50 border-muted' : 'bg-card hover:border-primary/50'}`}>
      <CardHeader className="p-4 pb-2 flex flex-row items-start justify-between space-y-0 gap-2">
        <div className="flex-1 space-y-1">
          <CardTitle className={`text-base font-semibold leading-tight ${isCompleted ? 'text-muted-foreground line-through' : ''}`}>
            {task.title}
          </CardTitle>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {task.due_scope && (
              <Badge variant="secondary" className="px-1.5 py-0 text-[10px] uppercase font-semibold tracking-wider bg-secondary/50">
                {task.due_scope.replace('_', ' ')}
              </Badge>
            )}
            {task.due_date && (
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {format(new Date(task.due_date), "MMM d")}
              </span>
            )}
          </div>
        </div>
        
        {onDelete && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 -mt-1 -mr-2 text-muted-foreground hover:text-foreground">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {!isCompleted && onUpdateStatus && (
                <DropdownMenuItem onClick={() => onUpdateStatus("completed")}>
                  Mark Completed
                </DropdownMenuItem>
              )}
              {isCompleted && onUpdateStatus && (
                <DropdownMenuItem onClick={() => onUpdateStatus("active")}>
                  Mark Active
                </DropdownMenuItem>
              )}
              {onDelete && (
                <DropdownMenuItem onClick={onDelete} className="text-destructive focus:bg-destructive/10">
                  Delete
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </CardHeader>
      
      <CardContent className="p-4 py-2">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="font-medium">{task.completed_value} / {task.target_value} <span className="text-muted-foreground">{task.unit}</span></span>
            <span className="text-muted-foreground font-mono">{percent}%</span>
          </div>
          <Progress value={percent} className="h-2" />
        </div>
      </CardContent>
      
      {onAddProgress && !isCompleted && (
        <CardFooter className="p-2 bg-secondary/20 flex justify-end gap-1">
          <Button variant="ghost" size="sm" className="h-8 px-2 text-xs hover:bg-primary/10 hover:text-primary" onClick={() => onAddProgress(1)}>
            <Plus className="w-3 h-3 mr-1" /> 1
          </Button>
          <Button variant="ghost" size="sm" className="h-8 px-2 text-xs hover:bg-primary/10 hover:text-primary" onClick={() => onAddProgress(5)}>
            <Plus className="w-3 h-3 mr-1" /> 5
          </Button>
          <Button variant="ghost" size="sm" className="h-8 px-2 text-xs hover:bg-primary/10 hover:text-primary" onClick={() => onAddProgress(10)}>
            <Plus className="w-3 h-3 mr-1" /> 10
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}
