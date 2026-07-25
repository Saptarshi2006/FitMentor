import { GraphQLClient } from "graphql-request";

export function getClient() {
  return new GraphQLClient("/graphql");
}
