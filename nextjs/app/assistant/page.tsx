import { AppShell } from "../../components/app-shell";
import { CopyPromptButton } from "../../components/copy-prompt-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Lightbulb, Sparkles } from "lucide-react";

const prompts = [
  "Show me the next machine learning events from Alma.",
  "Find the study-service document for an enrollment certificate.",
  "Search the unified portal for ethics or philosophy materials.",
  "Summarize what I should check in ILIAS this week."
];

export default function AssistantPage() {
  return (
    <AppShell title="Assistant">
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Lightbulb className="size-4 text-primary" />Best use</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Let the web app handle browsing and routine wayfinding. Use the ChatGPT app for summarization, cross-checking, and &ldquo;what matters next?&rdquo; questions.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Sparkles className="size-4 text-primary" />Suggested prompts</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {prompts.map((prompt) => (
              <CopyPromptButton key={prompt} prompt={prompt} />
            ))}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
