"use client";

import { useSyncExternalStore } from "react";
import type { ReactNode } from "react";

const _subscribe = () => () => {};

export default function ClientOnly({ children }: { children: ReactNode }) {
  const isClient = useSyncExternalStore(_subscribe, () => true, () => false);
  return isClient ? children : null;
}
