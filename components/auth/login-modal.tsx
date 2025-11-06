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
import { AlertCircle, Info } from "lucide-react";

interface LoginModalProps {
  open: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function LoginModal({ open, onOpenChange }: LoginModalProps) {
  const { login, isLoading, error, clearError } = useAuthStore();
  const [showSecurityWarning] = useState(true);

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
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Connect to Jira</DialogTitle>
          <DialogDescription>
            Enter your Jira credentials to authenticate and fetch user stories.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {showSecurityWarning && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription className="text-sm">
                <strong>Security Notice:</strong> Your credentials are stored in browser localStorage 
                for development convenience. For production use, implement secure session management.
              </AlertDescription>
            </Alert>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="baseUrl">Jira Base URL</Label>
            <Input
              id="baseUrl"
              type="url"
              placeholder="https://your-domain.atlassian.net"
              {...register("baseUrl")}
              disabled={isLoading}
            />
            {errors.baseUrl && (
              <p className="text-sm text-red-500">{errors.baseUrl.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="your-email@example.com"
              {...register("email")}
              disabled={isLoading}
            />
            {errors.email && (
              <p className="text-sm text-red-500">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="apiToken">API Token</Label>
            <Input
              id="apiToken"
              type="password"
              placeholder="Your Jira API token"
              {...register("apiToken")}
              disabled={isLoading}
            />
            {errors.apiToken && (
              <p className="text-sm text-red-500">{errors.apiToken.message}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Generate an API token from{" "}
              <a
                href="https://id.atlassian.com/manage-profile/security/api-tokens"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-primary"
              >
                Atlassian Account Settings
              </a>
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange?.(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Connecting..." : "Connect"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

