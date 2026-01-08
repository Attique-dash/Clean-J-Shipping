// Service Type ID map
export const SERVICE_TYPE_MAP: Record<string, string> = {
  "59cadcd4-7508-450b-85aa-9ec908d168fe": "AIR STANDARD",
  "25a1d8e5-a478-4cc3-b1fd-a37d0d787302": "AIR EXPRESS",
  "8df142ca-0573-4ce9-b11d-7a3e5f8ba196": "AIR PREMIUM",
  "": "UNSPECIFIED",
};

export function getServiceTypeName(id?: string | null): string {
  if (!id) return "UNSPECIFIED";
  return SERVICE_TYPE_MAP[id] || "UNSPECIFIED";
}

// External manifest/package status labels
export const EXTERNAL_STATUS_LABELS: Record<number, string> = {
  0: "AT WAREHOUSE",
  1: "DELIVERED TO AIRPORT",
  2: "IN TRANSIT TO LOCAL PORT",
  3: "AT LOCAL PORT",
  4: "AT LOCAL SORTING",
};

// Map external numeric statuses into our internal PackageStatus enum
// Internal enum: "Unknown" | "At Warehouse" | "In Transit" | "At Local Port" | "Delivered" | "Deleted"
export function mapExternalToInternalStatus(n: number | string): "Unknown" | "At Warehouse" | "In Transit" | "At Local Port" | "Delivered" | "Deleted" {
  const v = typeof n === "number" ? n : Number.isFinite(Number(n)) ? Number(n) : NaN;
  switch (v) {
    case 0:
      return "At Warehouse";
    case 1:
      // Delivered to Airport -> treat as In Transit
      return "In Transit";
    case 2:
      // In Transit to Local Port -> In Transit
      return "In Transit";
    case 3:
      return "At Local Port";
    case 4:
      // At Local Sorting -> treat as At Local Port (closest supported)
      return "At Local Port";
    default:
      return "Unknown";
  }
}

export function getExternalStatusLabel(n: number | string): string {
  const v = typeof n === "number" ? n : Number.isFinite(Number(n)) ? Number(n) : NaN;
  return EXTERNAL_STATUS_LABELS[v] || "AT WAREHOUSE";
}
