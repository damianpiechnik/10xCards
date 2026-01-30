import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface FormErrorBannerProps {
  title?: string;
  message: string;
}

const FormErrorBanner = ({ title = "Błąd", message }: FormErrorBannerProps) => (
  <Alert variant="destructive" role="alert" aria-live="assertive">
    <AlertTitle>{title}</AlertTitle>
    <AlertDescription>{message}</AlertDescription>
  </Alert>
);

export default FormErrorBanner;
