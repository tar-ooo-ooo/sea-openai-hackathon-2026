import ClientOnly from "../../../components/ClientOnly";
import ApplicationPage from "../../../features/application/ApplicationPage";

export default function Page() {
  return (
    <ClientOnly>
      <ApplicationPage />
    </ClientOnly>
  );
}
