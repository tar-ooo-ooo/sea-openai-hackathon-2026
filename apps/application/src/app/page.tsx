import ClientOnly from "../components/ClientOnly";
import HomePage from "../features/home/HomePage";

export default function Page() {
  return (
    <ClientOnly>
      <HomePage />
    </ClientOnly>
  );
}
