import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "./dialog";

export function Modal(props: {
  isOpen: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <Dialog open={props.isOpen} onOpenChange={(open) => !open && props.onClose()}>
      <DialogContent className="max-h-[84vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>{props.title}</DialogTitle>
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
          <div className="flex flex-col gap-4">{props.children}</div>
        </div>
        {props.footer ? <DialogFooter>{props.footer}</DialogFooter> : null}
      </DialogContent>
    </Dialog>
  );
}
