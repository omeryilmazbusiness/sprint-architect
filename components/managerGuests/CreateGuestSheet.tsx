export { CreateGuestWizard as CreateGuestSheet } from "./createGuest/CreateGuestWizard";

export type CreateGuestSheetProps = {
  visible: boolean;
  onClose: () => void;
};
