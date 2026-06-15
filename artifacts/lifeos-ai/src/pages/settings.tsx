import { Moon, Sun, Monitor, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useTheme } from "@/components/theme-provider";
import { useClerk, useUser } from "@clerk/react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

export default function Settings() {
  const { theme, setTheme } = useTheme();
  const { signOut } = useClerk();
  const { user } = useUser();

  const initials = user?.firstName
    ? `${user.firstName[0]}${user.lastName?.[0] ?? ""}`.toUpperCase()
    : (user?.emailAddresses?.[0]?.emailAddress?.[0] ?? "U").toUpperCase();

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-3xl mx-auto w-full">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">Manage your account and preferences.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
          <CardDescription>Your signed-in account details.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={user?.imageUrl} />
                <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div>
                {user?.firstName && (
                  <p className="font-medium text-foreground">
                    {user.firstName} {user.lastName}
                  </p>
                )}
                <p className="text-sm text-muted-foreground">
                  {user?.emailAddresses?.[0]?.emailAddress}
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              className="gap-2 text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/20"
              onClick={() => signOut({ redirectUrl: `${basePath}/sign-in` })}
            >
              <LogOut className="w-4 h-4" />
              Sign out
            </Button>
          </div>
        </CardContent>
      </Card>

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
