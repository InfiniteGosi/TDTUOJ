import { useState } from "react";
import {
  Dialog,
  DialogRoot,
  DialogBackdrop,
  DialogPositioner,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogFooter,
  DialogCloseTrigger,
  Button,
  Text,
} from "@chakra-ui/react";

const ConfirmDialog = ({ isOpen, title, message, onConfirm, onCancel }) => {
  return (
    <DialogRoot open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <DialogBackdrop />
      <DialogPositioner>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogCloseTrigger onClick={onCancel} />
          </DialogHeader>

          <DialogBody>
            <Text>{message}</Text>
          </DialogBody>

          <DialogFooter display="flex" justifyContent="flex-end" gap={3}>
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button colorScheme="red" onClick={onConfirm}>
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </DialogPositioner>
    </DialogRoot>
  );
};

export const useConfirmDialog = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState({
    title: "",
    message: "",
    onConfirm: () => {},
  });

  /** Show the dialog */
  const showConfirm = (title, message, onConfirm) => {
    setOptions({ title, message, onConfirm });
    setIsOpen(true);
  };

  /** Cancel handler */
  const handleCancel = () => setIsOpen(false);

  /** Confirm handler */
  const handleConfirm = () => {
    options.onConfirm();
    setIsOpen(false);
  };

  return {
    ConfirmDialog: () => (
      <ConfirmDialog
        isOpen={isOpen}
        title={options.title}
        message={options.message}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    ),
    showConfirm,
  };
};

export default ConfirmDialog;
