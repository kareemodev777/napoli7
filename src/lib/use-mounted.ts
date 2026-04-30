"use client";

import { useSyncExternalStore } from "react";

const noopSubscribe = () => () => {};
const onClient = () => true;
const onServer = () => false;

// Returns true once the component has mounted on the client.
// Avoids the setState-in-effect anti-pattern.
export function useMounted(): boolean {
  return useSyncExternalStore(noopSubscribe, onClient, onServer);
}
