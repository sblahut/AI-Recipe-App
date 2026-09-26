import { type Href, router } from "expo-router";

/** Open receipt/invoice photo import (storage is chosen per item on the review screen). */
export function startAddFromImage(): void {
  router.push("/receipt-import" as Href);
}
