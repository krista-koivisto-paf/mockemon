interface Configuration {
  realApiUrl: string;
  mockApiUrl: string;
}

interface RequestArgs {
  url: string;
  method: string;
}

interface ClientConfiguration {
  /**
   * The address of the server.
   */
  address: string;

  /**
   * This should be a function that makes a request to the server.
   *
   * In the browser, this could be a function that uses the `fetch` API.
   *
   * @example
   * ```ts
   * const client = config.client({
   *  async request({ url, method }) {
   *   const response = await fetch(url, {
   *     method,
   *   });
   *   return response.json();
   *  }
   * })
   * ```
   */
  request: (args: RequestArgs) => Promise<unknown>;
}

export function configureMockServer<TPayload>(config: Configuration) {
  const setUrl = config.mockApiUrl + "/set";
  const getAllUrl = config.mockApiUrl + "/get-all";

  return {
    /**
     * Server setup for storing mocks.
     */
    server() {
      const store = new Map<string, unknown>();

      function decode(url: string) {
        return JSON.parse(decodeURIComponent(url));
      }

      interface GetMockedValueArgs {
        /**
         * The full url path of the request.
         */
        url: `${typeof config.realApiUrl}${string}`;

        /**
         * This should resolve to a key that uniquely identifies the request.
         * @param path The path of the request, without the `realApiUrl` prefix.
         */
        getKey: (path: string) => string;
      }

      interface ResolveMockRequestArgs {
        /**
         * The full url path of the request.
         */
        url: `${typeof config.mockApiUrl}${string}`;

        /**
         * This should resolve to a key that uniquely identifies the request.
         * @param payload The payload that was sent from the client.
         */
        getKey: (payload: TPayload) => string;
        getValue: (payload: TPayload) => unknown;
      }

      return {
        realApiUrl: config.realApiUrl,
        mockApiUrl: config.mockApiUrl,

        /**
         * Returns the mocked value for a request.
         */
        resolveRealApiRequest(args: GetMockedValueArgs) {
          const url = args.url.slice(config.realApiUrl.length);
          const key = args.getKey(url);
          return store.get(key);
        },

        /**
         * Resolves a request to the mocking API.
         */
        resolveMockApiRequest(args: ResolveMockRequestArgs) {
          if (args.url.startsWith(getAllUrl)) {
            return Object.fromEntries(store);
          }

          if (args.url.startsWith(setUrl)) {
            const decoded = decode(args.url.slice(setUrl.length));
            const key = args.getKey(decoded);
            const value = args.getValue(decoded);
            store.set(key, value);
            return;
          }
        },
      };
    },

    /**
     * Client for interacting with the mock server.
     */
    client(clientConfig: ClientConfiguration) {
      function encode(request: TPayload) {
        return encodeURIComponent(JSON.stringify(request));
      }

      return {
        /**
         * Send a new mock to the server.
         */
        set(payload: TPayload) {
          return clientConfig.request({
            url: clientConfig.address + setUrl + encode(payload),
            method: "POST",
          });
        },

        /**
         * Returns all mocks.
         */
        getAll() {
          return clientConfig.request({
            url: clientConfig.address + getAllUrl,
            method: "GET",
          });
        },
      };
    },
  };
}
