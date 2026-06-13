import { useState } from "react";
import {
  useListJobs,
  useDeleteJob,
  useCreateJob,
  useImportJobFromUrl,
  getListJobsQueryKey,
} from "@workspace/api-client-react";
import type { JobImportResult } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Trash2, Plus, Briefcase, Link2, ArrowLeft, Loader2, Sparkles, CheckCircle2, AlertCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

// ── Jobs list page ─────────────────────────────────────────────────────────

export default function JobsPage() {
  const { data: jobs, isLoading } = useListJobs();
  const deleteJob = useDeleteJob();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [createOpen, setCreateOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  const handleDelete = (id: number) => {
    deleteJob.mutate({ jobId: id }, {
      onSuccess: () => {
        toast({ title: "Job deleted successfully." });
        queryClient.invalidateQueries({ queryKey: getListJobsQueryKey() });
      },
      onError: (err: unknown) => {
        const msg = err instanceof Error ? err.message : "Unknown error";
        toast({ title: "Failed to delete job.", description: msg, variant: "destructive" });
      },
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Jobs</h1>
          <p className="text-muted-foreground mt-1">Define requirements and required skills for candidate matching.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="gap-2" onClick={() => setImportOpen(true)}>
            <Link2 className="h-4 w-4" /> Import from URL
          </Button>
          <Button className="gap-2" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" /> Create Job
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="flex flex-col">
              <CardHeader>
                <Skeleton className="h-6 w-3/4 mb-2" />
                <Skeleton className="h-4 w-1/2" />
              </CardHeader>
              <CardContent className="flex-1 flex flex-col">
                <Skeleton className="h-20 w-full mb-4" />
                <div className="flex gap-2">
                  <Skeleton className="h-6 w-16" />
                  <Skeleton className="h-6 w-16" />
                  <Skeleton className="h-6 w-16" />
                </div>
              </CardContent>
            </Card>
          ))
        ) : jobs?.length === 0 ? (
          <div className="col-span-full p-12 text-center text-muted-foreground flex flex-col items-center bg-card border border-border border-dashed rounded-lg">
            <Briefcase className="h-12 w-12 mb-4 opacity-20" />
            <p className="text-lg">No jobs defined yet.</p>
            <p className="text-sm mt-1">Create a job manually or import from a job board URL.</p>
          </div>
        ) : (
          jobs?.map((job) => (
            <Card key={job.id} className="flex flex-col group relative overflow-hidden">
              <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity focus-within:opacity-100 z-10">
                <Button
                  variant="destructive"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => handleDelete(job.id)}
                  disabled={deleteJob.isPending}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <CardHeader className="pb-3">
                <CardTitle className="text-xl pr-8 line-clamp-1">{job.title}</CardTitle>
                <CardDescription className="text-primary font-medium">{job.company || "Company not specified"}</CardDescription>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col pt-0">
                <p className="text-sm text-muted-foreground line-clamp-3 mb-4 flex-1">
                  {job.description}
                </p>
                <div>
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Required Skills</div>
                  <div className="flex flex-wrap gap-1.5">
                    {job.required_skills?.map((skill, idx) => (
                      <Badge key={idx} variant="outline" className="text-xs font-mono bg-background">
                        {skill}
                      </Badge>
                    ))}
                    {(!job.required_skills || job.required_skills.length === 0) && (
                      <span className="text-xs text-muted-foreground italic">No required skills</span>
                    )}
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-border flex justify-between items-center text-xs text-muted-foreground">
                  <span>ID: {job.id}</span>
                  <span>{new Date(job.created_at).toLocaleDateString()}</span>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <CreateJobDialog open={createOpen} onOpenChange={setCreateOpen} />
      <ImportJobDialog open={importOpen} onOpenChange={setImportOpen} />
    </div>
  );
}

// ── Shared save helper ─────────────────────────────────────────────────────

function useSaveJob(onSuccess: () => void) {
  const createJob = useCreateJob();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const save = (data: { title: string; company: string; description: string; skills: string[] }) => {
    createJob.mutate(
      { data: { title: data.title, company: data.company || undefined, description: data.description, required_skills: data.skills } },
      {
        onSuccess: () => {
          toast({ title: "Job created successfully." });
          queryClient.invalidateQueries({ queryKey: getListJobsQueryKey() });
          onSuccess();
        },
        onError: (err: unknown) => {
          const msg = err instanceof Error ? err.message : "Unknown error";
          toast({ title: "Failed to create job.", description: msg, variant: "destructive" });
        },
      }
    );
  };

  return { save, isPending: createJob.isPending };
}

// ── Manual create dialog ───────────────────────────────────────────────────

function CreateJobDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [title, setTitle] = useState("");
  const [company, setCompany] = useState("");
  const [description, setDescription] = useState("");
  const [skillsInput, setSkillsInput] = useState("");

  const reset = () => { setTitle(""); setCompany(""); setDescription(""); setSkillsInput(""); };
  const { save, isPending } = useSaveJob(() => { onOpenChange(false); reset(); });

  const handleCreate = () => {
    if (!title || !description) return;
    save({ title, company, description, skills: skillsInput.split(",").map(s => s.trim()).filter(Boolean) });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create Job Profile</DialogTitle>
          <DialogDescription>Define a job role and required skills for the matching engine.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="title">Job Title <span className="text-destructive">*</span></Label>
            <Input id="title" placeholder="e.g. Senior Frontend Engineer" value={title} onChange={e => setTitle(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="company">Company</Label>
            <Input id="company" placeholder="e.g. Acme Corp" value={company} onChange={e => setCompany(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="description">Job Description <span className="text-destructive">*</span></Label>
            <Textarea id="description" placeholder="Brief description of the role and responsibilities..." value={description} onChange={e => setDescription(e.target.value)} className="min-h-[100px] resize-none" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="skills">Required Skills (comma-separated)</Label>
            <Input id="skills" placeholder="e.g. React, TypeScript, GraphQL" value={skillsInput} onChange={e => setSkillsInput(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleCreate} disabled={!title || !description || isPending}>
            {isPending ? "Creating..." : "Create Job"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Import-from-URL dialog ────────────────────────────────────────────────

type ImportStep = "url" | "preview";

const PLACEHOLDER_URLS = [
  "https://www.indeed.com/viewjob?jk=...",
  "https://www.linkedin.com/jobs/view/...",
  "https://www.glassdoor.com/job-listing/...",
  "https://jobs.lever.co/company/...",
  "https://boards.greenhouse.io/company/jobs/...",
];

function ImportJobDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [step, setStep] = useState<ImportStep>("url");
  const [url, setUrl] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [preview, setPreview] = useState<JobImportResult | null>(null);

  // Editable fields for the preview step
  const [title, setTitle] = useState("");
  const [company, setCompany] = useState("");
  const [description, setDescription] = useState("");
  const [skillsInput, setSkillsInput] = useState("");

  const importMutation = useImportJobFromUrl();
  const { save, isPending: isSaving } = useSaveJob(() => {
    onOpenChange(false);
    reset();
  });

  const reset = () => {
    setStep("url");
    setUrl("");
    setErrorMsg("");
    setPreview(null);
    setTitle(""); setCompany(""); setDescription(""); setSkillsInput("");
  };

  const handleFetch = () => {
    if (!url.trim()) return;
    setErrorMsg("");
    importMutation.mutate({ data: { url: url.trim() } }, {
      onSuccess: (data) => {
        setPreview(data);
        setTitle(data.title || "");
        setCompany(data.company || "");
        setDescription(data.description || "");
        setSkillsInput((data.required_skills || []).join(", "));
        setStep("preview");
      },
      onError: (err: unknown) => {
        const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
        setErrorMsg(detail || (err instanceof Error ? err.message : "Could not extract job data from this URL."));
      },
    });
  };

  const handleSave = () => {
    if (!title || !description) return;
    save({ title, company, description, skills: skillsInput.split(",").map(s => s.trim()).filter(Boolean) });
  };

  const placeholderUrl = PLACEHOLDER_URLS[Math.floor(Math.random() * PLACEHOLDER_URLS.length)];

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent className="sm:max-w-[580px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5 text-primary" />
            Import Job from URL
          </DialogTitle>
          <DialogDescription>
            {step === "url"
              ? "Paste a URL from Indeed, LinkedIn, Glassdoor, Lever, Greenhouse, or any job board."
              : "Review and edit the extracted data before saving."}
          </DialogDescription>
        </DialogHeader>

        {/* Step indicator */}
        <div className="flex items-center gap-2 py-1">
          <div className={`flex items-center gap-1.5 text-xs font-medium ${step === "url" ? "text-primary" : "text-muted-foreground"}`}>
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${step === "url" ? "bg-primary text-white" : "bg-emerald-500 text-white"}`}>
              {step === "preview" ? <CheckCircle2 className="h-3.5 w-3.5" /> : "1"}
            </span>
            Paste URL
          </div>
          <div className="flex-1 h-px bg-border" />
          <div className={`flex items-center gap-1.5 text-xs font-medium ${step === "preview" ? "text-primary" : "text-muted-foreground/50"}`}>
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${step === "preview" ? "bg-primary text-white" : "bg-muted text-muted-foreground"}`}>2</span>
            Review & Save
          </div>
        </div>

        {/* ── Step 1: URL input ── */}
        {step === "url" && (
          <div className="space-y-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="import-url">Job Posting URL</Label>
              <Input
                id="import-url"
                placeholder={placeholderUrl}
                value={url}
                onChange={e => { setUrl(e.target.value); setErrorMsg(""); }}
                onKeyDown={e => e.key === "Enter" && handleFetch()}
                autoFocus
              />
            </div>

            {/* Error */}
            {errorMsg && (
              <div className="flex items-start gap-2 rounded-md bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Platform hints */}
            <div className="rounded-md bg-muted/40 border border-border p-3 space-y-1.5">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Supported platforms</p>
              <div className="flex flex-wrap gap-1.5">
                {["Indeed", "Glassdoor", "Lever", "Greenhouse", "Workable", "Ashby", "Generic"].map(p => (
                  <Badge key={p} variant="secondary" className="text-[11px]">{p}</Badge>
                ))}
              </div>
              <p className="text-xs text-muted-foreground pt-1">
                <span className="font-medium">LinkedIn</span> may require a public/guest-accessible URL. Job pages that need login cannot be scraped.
              </p>
            </div>
          </div>
        )}

        {/* ── Step 2: Preview & edit ── */}
        {step === "preview" && preview && (
          <div className="space-y-4 py-2">
            {/* Source badge */}
            <div className="flex items-center gap-2 rounded-md bg-primary/5 border border-primary/20 px-3 py-2">
              <Sparkles className="h-4 w-4 text-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-primary">Extracted from URL</p>
                <p className="text-[11px] text-muted-foreground truncate">{preview.source_url}</p>
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="p-title">Job Title <span className="text-destructive">*</span></Label>
              <Input id="p-title" value={title} onChange={e => setTitle(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="p-company">Company</Label>
              <Input id="p-company" value={company} onChange={e => setCompany(e.target.value)} placeholder="Not detected — enter manually" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="p-description">Job Description <span className="text-destructive">*</span></Label>
              <Textarea
                id="p-description"
                value={description}
                onChange={e => setDescription(e.target.value)}
                className="min-h-[140px] resize-y font-mono text-xs"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="p-skills">
                Required Skills
                <span className="ml-2 text-xs text-muted-foreground font-normal">(auto-extracted · edit freely)</span>
              </Label>
              <Input id="p-skills" value={skillsInput} onChange={e => setSkillsInput(e.target.value)} placeholder="skill1, skill2, skill3" />
              {skillsInput && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {skillsInput.split(",").map(s => s.trim()).filter(Boolean).map((s, i) => (
                    <Badge key={i} variant="outline" className="text-[11px] font-mono">{s}</Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Loading overlay for fetch */}
        {importMutation.isPending && (
          <div className="flex flex-col items-center gap-3 py-8 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm font-medium animate-pulse">Fetching and extracting job data…</p>
            <p className="text-xs">This may take a few seconds</p>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          {step === "url" && !importMutation.isPending && (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button onClick={handleFetch} disabled={!url.trim() || importMutation.isPending} className="gap-2">
                <Sparkles className="h-4 w-4" /> Extract Job Data
              </Button>
            </>
          )}
          {step === "preview" && (
            <>
              <Button variant="outline" onClick={() => setStep("url")} className="gap-1.5">
                <ArrowLeft className="h-4 w-4" /> Back
              </Button>
              <Button onClick={handleSave} disabled={!title || !description || isSaving} className="gap-2">
                {isSaving ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</> : <><Plus className="h-4 w-4" /> Save Job</>}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
