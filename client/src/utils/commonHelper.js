const fallbackServerUrl = "http://localhost:5001";
const rawServerUrl =
  process.env.NEXT_PUBLIC_SERVER_URL ||
  process.env.SERVER_URL ||
  fallbackServerUrl;

export const SERVER_URL = rawServerUrl.replace(/\/+$/, "");
