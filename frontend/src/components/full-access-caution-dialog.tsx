import { AlertTriangle, Folder, Globe2, Terminal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface FullAccessCautionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

const capabilities = [
  {
    title: "Files and folders",
    description: "Read, create, modify, upload, or delete files on this computer.",
    icon: Folder,
    tone: "text-sky-500 bg-sky-500/10",
  },
  {
    title: "Terminal commands",
    description: "Run commands, install software, and change system settings.",
    icon: Terminal,
    tone: "text-foreground bg-foreground/10",
  },
  {
    title: "Internet and connected apps",
    description: "Access websites, send data, and use enabled plugins.",
    icon: Globe2,
    tone: "text-cyan-500 bg-cyan-500/10",
  },
];

export function FullAccessCautionDialog({
  open,
  onOpenChange,
  onConfirm,
}: FullAccessCautionDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl border-[var(--mn-line)] bg-[var(--mn-surface)] text-foreground">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-xl">
            <span className="grid size-9 place-items-center rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-300">
              <AlertTriangle className="size-5" />
            </span>
            Turn on Full Access?
          </DialogTitle>
          <DialogDescription className="text-sm leading-6">
            Full Access lets mncode run commands, use the internet, and create or edit files without
            asking for each action.
          </DialogDescription>
        </DialogHeader>
        <div className="rounded-2xl border border-rose-500/15 bg-rose-500/[0.045] p-3">
          {capabilities.map(({ title, description, icon: Icon, tone }, index) => (
            <div
              key={title}
              className={
                "flex items-center gap-3 px-2 py-3 " +
                (index < capabilities.length - 1 ? "border-b border-rose-500/10" : "")
              }
            >
              <span className={`grid size-9 shrink-0 place-items-center rounded-xl ${tone}`}>
                <Icon className="size-4" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold">{title}</p>
                <p className="mt-0.5 text-xs leading-5 text-muted-foreground">{description}</p>
              </div>
            </div>
          ))}
        </div>
        <p className="text-xs leading-5 text-muted-foreground">
          This can expose sensitive data or allow destructive changes. You can switch back to Ask
          before changes at any time.
        </p>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            className="bg-rose-500/10 text-rose-700 hover:bg-rose-500/20 dark:text-rose-200"
          >
            <AlertTriangle className="size-3.5" />
            Confirm Full Access
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
