import { Moon, Sun, Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useTheme } from "@/components/theme-provider";

export default function Settings() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-3xl mx-auto w-full">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">Customize your experience.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
          <CardDescription>Choose how LifeOS looks on your device.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Button
              variant={theme === "light" ? "default" : "outline"}
              className="flex-1 gap-2"
              onClick={() => setTheme("light")}
              data-testid="button-theme-light"
            >
              <Sun className="w-4 h-4" /> Light
            </Button>
            <Button
              variant={theme === "dark" ? "default" : "outline"}
              className="flex-1 gap-2"
              onClick={() => setTheme("dark")}
              data-testid="button-theme-dark"
            >
              <Moon className="w-4 h-4" /> Dark
            </Button>
            <Button
              variant={theme === "system" ? "default" : "outline"}
              className="flex-1 gap-2"
              onClick={() => setTheme("system")}
              data-testid="button-theme-system"
            >
              <Monitor className="w-4 h-4" /> System
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
