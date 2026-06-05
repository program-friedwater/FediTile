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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{props.title}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">{props.children}</div>
        {props.footer ? <DialogFooter>{props.footer}</DialogFooter> : null}
      </DialogContent>
    </Dialog>
  );
}
