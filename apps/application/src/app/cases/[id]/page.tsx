import ClientOnly from "../../../components/ClientOnly";
import CasesPage from "../../../features/cases/CasesPage";

export default function Page() {
  return (
    <ClientOnly>
      <CasesPage />
    </ClientOnly>
  );
}
