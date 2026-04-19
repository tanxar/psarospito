"use client";

import { useParams } from "next/navigation";

import { ListingEditorPage } from "@/app/listings/new/page";

export default function EditListingPage() {
  const params = useParams();
  const id = typeof params?.id === "string" ? params.id : "";
  return <ListingEditorPage listingId={id} />;
}
