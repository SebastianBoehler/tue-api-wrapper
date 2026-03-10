import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";

export function ErrorPanel({
  title,
  message
}: {
  title: string;
  message: string;
}) {
  return (
    <Card className="border-destructive/30 bg-destructive/5">
      <CardContent className="flex items-start gap-3">
        <AlertCircle className="size-5 text-destructive shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-destructive">{title}</p>
          <p className="text-sm text-muted-foreground mt-0.5">{message}</p>
        </div>
      </CardContent>
    </Card>
  );
}
