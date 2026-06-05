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
      <DialogContent className="max-h-[min(84vh,720px)] grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden">
        <DialogHeader>
          <DialogTitle>{props.title}</DialogTitle>
        </DialogHeader>
        <div className="flex min-h-0 flex-col gap-4 overflow-y-auto px-6 py-4">{props.children}</div>
        {props.footer ? <DialogFooter>{props.footer}</DialogFooter> : null}
      </DialogContent>
    </Dialog>
  );
}
