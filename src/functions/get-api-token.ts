import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";

export const getApiToken = createServerFn({ method: "GET" }).handler(
  async () => {
    const _headers = getRequestHeaders();
    // Perform logic to get your api token
    return "your_api_token_here";
  },
);
