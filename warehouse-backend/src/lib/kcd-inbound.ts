import { isRealApiToken } from './kcd-token';

function isPresent(value: unknown): boolean {
  if (value === undefined || value === null) return false;
  if (typeof value === 'string' && value.trim() === '') return false;
  return true;
}

/** True when body looks like Tasoko/Askenish inbound package webhook */
export function looksLikeKcdPackageInbound(body: unknown): boolean {
  const packages = extractPackagesFromUnknown(body);
  if (packages.length === 0) return false;
  return packages.some((p) => {
    const tracking = p.TrackingNumber ?? p.trackingNumber;
    const user =
      p.UserCode ?? p.userCode ?? p.customerMailbox ?? p.customerCode;
    return isPresent(tracking) && isPresent(user);
  });
}

export function extractPackagesFromUnknown(parsed: unknown): Record<string, unknown>[] {
  if (parsed === null || parsed === undefined) return [];

  let data = parsed;
  if (typeof data === 'string') {
    try {
      data = JSON.parse(data);
    } catch {
      return [];
    }
  }

  if (Array.isArray(data)) {
    return data.filter((x) => x && typeof x === 'object') as Record<string, unknown>[];
  }

  if (typeof data !== 'object' || data === null) return [];

  const obj = data as Record<string, unknown>;

  if (obj.content !== undefined) {
    return extractPackagesFromUnknown(obj.content);
  }

  if (
    obj.TrackingNumber !== undefined ||
    obj.trackingNumber !== undefined ||
    obj.UserCode !== undefined ||
    obj.userCode !== undefined
  ) {
    return [obj];
  }

  return [];
}

/** Parse apiToken from Askenish GET content query: ?content={"apiToken":"..."} */
export function extractApiTokenFromContentQuery(
  content: unknown
): string | null {
  if (typeof content !== 'string' || !content.trim()) return null;
  try {
    const parsed = JSON.parse(content) as Record<string, unknown>;
    const t = parsed.apiToken ?? parsed.APIToken ?? parsed.token;
    return isRealApiToken(t) ? String(t).trim() : null;
  } catch {
    return null;
  }
}
