import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ApiErrorProps {
  message?: string;
  onRetry?: () => void;
}

export function ApiError({ message, onRetry }: ApiErrorProps) {
  return (
    <div className="flex min-h-48 flex-col items-center justify-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-8 text-center">
      <AlertCircle className="h-8 w-8 text-destructive" />
      <div>
        <p className="font-semibold">Unable to load this section</p>
        <p className="mt-1 max-w-lg text-sm text-muted-foreground">
          {message || "The API server is unavailable. Check the backend deployment and try again."}
        </p>
      </div>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry} className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Try again
        </Button>
      )}
    </div>
  );
}
