import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface FormInfoBannerProps {
  title?: string;
  message: string;
}

const FormInfoBanner = ({ title = "Informacja", message }: FormInfoBannerProps) => (
  <Alert role="status" aria-live="polite">
    <AlertTitle>{title}</AlertTitle>
    <AlertDescription>{message}</AlertDescription>
  </Alert>
);

export default FormInfoBanner;
