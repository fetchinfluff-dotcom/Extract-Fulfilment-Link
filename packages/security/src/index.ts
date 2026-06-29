import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import type { AppEnv } from "@listingforge/config";

export type UrlValidationResult = {
  url: URL;
  platform: "aliexpress" | "cjdropshipping" | "qksource" | "manual";
  warnings: string[];
};

export type UrlValidationOptions = {
  allowedDomains: string[];
  skipDns?: boolean;
  allowHttpLocalhost?: boolean;
};

const blockedIPv4Cidrs = [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["172.16.0.0", 12],
  ["192.168.0.0", 16],
  ["100.64.0.0", 10],
  ["198.18.0.0", 15],
  ["224.0.0.0", 4]
] as const;

function ipv4ToInt(ip: string): number {
  return ip.split(".").reduce((value, part) => (value << 8) + Number.parseInt(part, 10), 0) >>> 0;
}

function inCidr(ip: string, base: string, bits: number): boolean {
  const mask = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0;
  return (ipv4ToInt(ip) & mask) === (ipv4ToInt(base) & mask);
}

export function isPrivateAddress(address: string): boolean {
  const family = isIP(address);
  if (family === 4) return blockedIPv4Cidrs.some(([base, bits]) => inCidr(address, base, bits));
  if (family === 6) {
    const normalized = address.toLowerCase();
    return normalized === "::1" || normalized.startsWith("fc") || normalized.startsWith("fd") || normalized.startsWith("fe80:");
  }
  return false;
}

function isAllowedHost(hostname: string, allowedDomains: string[]): boolean {
  const host = hostname.toLowerCase();
  return allowedDomains.some((domain) => host === domain || host.endsWith(`.${domain}`));
}

export function detectPlatform(hostname: string): UrlValidationResult["platform"] {
  const host = hostname.toLowerCase();
  if (host.includes("aliexpress")) return "aliexpress";
  if (host.includes("cjdropshipping")) return "cjdropshipping";
  if (host.includes("qksource")) return "qksource";
  return "manual";
}

export async function validateSourceUrl(rawUrl: string, options: UrlValidationOptions): Promise<UrlValidationResult> {
  const url = new URL(rawUrl);
  if (url.username || url.password) throw new Error("URL credentials are not allowed.");
  if (url.protocol !== "https:" && !(options.allowHttpLocalhost && url.hostname === "localhost")) {
    throw new Error("Only HTTPS source URLs are allowed.");
  }
  if (url.port) throw new Error("Custom URL ports are not allowed.");
  if (!isAllowedHost(url.hostname, options.allowedDomains)) throw new Error("This source domain is not supported.");

  const literalIp = isIP(url.hostname);
  if (literalIp && isPrivateAddress(url.hostname)) throw new Error("Private network addresses are not allowed.");

  if (!options.skipDns && !url.hostname.endsWith(".listingforge.local")) {
    const records = await lookup(url.hostname, { all: true });
    if (records.some((record) => isPrivateAddress(record.address))) {
      throw new Error("Source URL resolves to a private network address.");
    }
  }

  url.hash = "";
  return { url, platform: detectPlatform(url.hostname), warnings: [] };
}

export function optionsFromEnv(env: Pick<AppEnv, "ALLOWED_SOURCE_DOMAINS" | "NODE_ENV">): UrlValidationOptions {
  return {
    allowedDomains: env.ALLOWED_SOURCE_DOMAINS,
    skipDns: env.NODE_ENV !== "production",
    allowHttpLocalhost: env.NODE_ENV !== "production"
  };
}

export function scanRestrictedProductText(text: string): string[] {
  const lower = text.toLowerCase();
  const blocked = ["lock pick", "firearm", "spy camera", "controlled substance", "counterfeit"];
  return blocked.filter((term) => lower.includes(term)).map((term) => `Restricted product signal: ${term}`);
}
