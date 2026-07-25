import { GraphQLClient } from "graphql-request";

let token: string | null = null;

export function setAuthToken(t: string | null) {
  token = t;
}

export function getClient() {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return new GraphQLClient(`${origin}/api/graphql`, {
    headers: () => {
      const h: Record<string, string> = {};
      if (token) {
        h["Authorization"] = `Bearer ${token}`;
        h["cf-access-jwt-assertion"] = token;
      }
      return h;
    },
  });
}
