"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { JiraAuth, JiraAuthSchema } from "@/lib/schemas";
import { useAuthStore } from "@/store/auth-store";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Info, Eye, EyeOff, Loader2, CheckCircle2, Link2 } from "lucide-react";

interface LoginModalProps {
  open: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function LoginModal({ open, onOpenChange }: LoginModalProps) {
  const { login, isLoading, error, clearError } = useAuthStore();
  const [showSecurityWarning] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<JiraAuth>({
    resolver: zodResolver(JiraAuthSchema),
    defaultValues: {
      baseUrl: "",
      email: "",
      apiToken: "",
    },
  });

  const onSubmit = async (data: JiraAuth) => {
    clearError();
    const result = await login(data);
    
    if (result.success) {
      reset();
      onOpenChange?.(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] glass-strong border-border/50 shadow-layered-lg animate-slide-up">
        <DialogHeader className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-glow">
              <Link2 className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <DialogTitle className="text-2xl font-bold">Connect to Jira</DialogTitle>
              <DialogDescription className="text-sm mt-1">
            Enter your Jira credentials to authenticate and fetch user stories.
          </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 mt-6">
          {showSecurityWarning && (
            <Alert className="glass border-border/50 animate-fade-in">
              <Info className="h-4 w-4 text-primary" />
              <AlertDescription className="text-sm">
                <strong className="text-foreground">Security Notice:</strong> Your credentials are stored in browser localStorage 
                for development convenience. For production use, implement secure session management.
              </AlertDescription>
            </Alert>
          )}

          {error && (
            <Alert variant="destructive" className="animate-fade-in border-destructive/50">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="baseUrl" className="text-sm font-medium">
              Jira Base URL
            </Label>
            <div className="relative">
            <Input
              id="baseUrl"
              type="url"
              placeholder="https://your-domain.atlassian.net"
              {...register("baseUrl")}
              disabled={isLoading}
                onFocus={() => setFocusedField("baseUrl")}
                onBlur={() => setFocusedField(null)}
                className={`transition-all duration-200 ${
                  focusedField === "baseUrl" ? "ring-2 ring-primary/50 shadow-glow" : ""
                } ${errors.baseUrl ? "border-destructive" : ""}`}
            />
            </div>
            {errors.baseUrl && (
              <p className="text-sm text-destructive animate-fade-in">{errors.baseUrl.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-medium">
              Email
            </Label>
            <div className="relative">
            <Input
              id="email"
              type="email"
              placeholder="your-email@example.com"
              {...register("email")}
              disabled={isLoading}
                onFocus={() => setFocusedField("email")}
                onBlur={() => setFocusedField(null)}
                className={`transition-all duration-200 ${
                  focusedField === "email" ? "ring-2 ring-primary/50 shadow-glow" : ""
                } ${errors.email ? "border-destructive" : ""}`}
            />
            </div>
            {errors.email && (
              <p className="text-sm text-destructive animate-fade-in">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="apiToken" className="text-sm font-medium">
              API Token
            </Label>
            <div className="relative">
            <Input
              id="apiToken"
                type={showPassword ? "text" : "password"}
              placeholder="Your Jira API token"
              {...register("apiToken")}
              disabled={isLoading}
                onFocus={() => setFocusedField("apiToken")}
                onBlur={() => setFocusedField(null)}
                className={`pr-10 transition-all duration-200 ${
                  focusedField === "apiToken" ? "ring-2 ring-primary/50 shadow-glow" : ""
                } ${errors.apiToken ? "border-destructive" : ""}`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                tabIndex={-1}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            {errors.apiToken && (
              <p className="text-sm text-destructive animate-fade-in">{errors.apiToken.message}</p>
            )}
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              Generate an API token from{" "}
              <a
                href="https://id.atlassian.com/manage-profile/security/api-tokens"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-primary transition-colors inline-flex items-center gap-1"
              >
                <Link2 className="h-3 w-3" />
                Atlassian Account Settings
              </a>
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-border/50">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange?.(false)}
              disabled={isLoading}
              className="hover-lift"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isLoading}
              className="hover-lift shadow-glow hover:shadow-glow-accent transition-all"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Connect
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

