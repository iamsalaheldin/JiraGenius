"use client";

import { useState } from "react";
import { ModelConfig } from "@/lib/schemas";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5" />
          Generate Test Cases
        </CardTitle>
        <CardDescription>
          Generate comprehensive AI-powered test cases for your user story. The AI will automatically determine the appropriate number of test cases and cover all possible scenarios.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Button
          onClick={handleGenerate}
          disabled={isGenerating || disabled}
          className="w-full"
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

        {isGenerating && (
          <p className="text-sm text-center text-muted-foreground">
            This may take 10-30 seconds depending on the LLM provider...
          </p>
        )}
      </CardContent>
    </Card>
  );
}

