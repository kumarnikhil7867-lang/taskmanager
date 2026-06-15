import { useUser, useClerk } from "@clerk/react";
import { LogOut, User as UserIcon, Moon, Sun, Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useTheme } from "@/components/theme-provider";

export default function Settings() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const { theme, setTheme } = useTheme();

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-3xl mx-auto w-full">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">Manage your account and preferences.</p>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Account</CardTitle>
            <CardDescription>Your personal profile information.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src={user?.imageUrl} />
                <AvatarFallback>
                  <UserIcon className="h-8 w-8 text-muted-foreground" />
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium text-lg">{user?.fullName || "User"}</p>
                <p className="text-sm text-muted-foreground">
                  {user?.primaryEmailAddress?.emailAddress}
                </p>
              </div>
            </div>
            
            <div className="pt-4">
              <Button variant="destructive" onClick={() => signOut({ redirectUrl: "/" })} className="gap-2">
                <LogOut className="w-4 h-4" />
                Sign Out
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Appearance</CardTitle>
            <CardDescription>Customize how LifeOS looks on your device.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <Button 
                variant={theme === 'light' ? 'default' : 'outline'} 
                className="flex-1 gap-2"
                onClick={() => setTheme('light')}
              >
                <Sun className="w-4 h-4" /> Light
              </Button>
              <Button 
                variant={theme === 'dark' ? 'default' : 'outline'} 
                className="flex-1 gap-2"
                onClick={() => setTheme('dark')}
              >
                <Moon className="w-4 h-4" /> Dark
              </Button>
              <Button 
                variant={theme === 'system' ? 'default' : 'outline'} 
                className="flex-1 gap-2"
                onClick={() => setTheme('system')}
              >
                <Monitor className="w-4 h-4" /> System
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
