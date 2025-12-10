"use client";

import { useState } from "react";
import { ModelConfig } from "@/lib/schemas";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Loader2, AlertCircle, Sparkles } from "lucide-react";

interface GenerationControlsProps {
  onGenerate: (config: ModelConfig) => Promise<void>;
  disabled?: boolean;
}

export function GenerationControls({ onGenerate, disabled }: GenerationControlsProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    setIsGenerating(true);
    setError(null);

    try {
      await onGenerate({});
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate test cases");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Card className="glass hover-lift shadow-layered border-border/50 animate-fade-in">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-glow animate-pulse-slow">
            <Sparkles className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <CardTitle className="text-2xl font-bold">Generate Test Cases</CardTitle>
            <CardDescription className="mt-1">
              Generate comprehensive AI-powered test cases for your user story. The AI will automatically determine the appropriate number of test cases and cover all possible scenarios.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {error && (
          <Alert variant="destructive" className="animate-fade-in border-destructive/50">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 glass rounded-lg border border-border/50">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center">
                <Sparkles className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold">AI Provider</p>
                <p className="text-xs text-muted-foreground">
                  {process.env.NEXT_PUBLIC_LLM_PROVIDER || "Claude"}
                </p>
              </div>
            </div>
            <Badge variant="secondary" className="shadow-sm">
              Active
            </Badge>
          </div>

          <Button
            onClick={handleGenerate}
            disabled={isGenerating || disabled}
            className="w-full h-14 text-lg font-semibold shadow-glow hover:shadow-glow-accent transition-all hover-lift"
            size="lg"
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Generating Test Cases...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-5 w-5" />
                Generate Test Cases
              </>
            )}
          </Button>
        </div>

        {isGenerating && (
          <div className="text-center space-y-2 animate-fade-in">
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <p>This may take 10-30 seconds depending on the LLM provider...</p>
            </div>
            <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
              <div className="h-full bg-gradient-to-r from-primary to-accent animate-pulse-slow" style={{ width: "60%" }} />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

