import { GraphQLClient } from "graphql-request";

let token: string | null = null;

export function setAuthToken(t: string | null) {
  token = t;
}

export function getClient() {
  return new GraphQLClient("/api/graphql", {
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
