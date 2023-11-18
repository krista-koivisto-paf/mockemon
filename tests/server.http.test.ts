import http from "node:http";
import { expect, it } from "bun:test";
import { configureMockServer } from "../src/server";

interface RequestMock {
  path: string;
  method: string;
  body: Record<string, unknown>;
}

const config = configureMockServer<RequestMock>({
  realApiUrl: "/api",
  mockApiUrl: "/mock",
});

const server = config.server({
  getValue: (payload) => payload.body,
});

http
  .createServer((req, res) => {
    if (req.url?.startsWith(server.realApiUrl)) {
      const result = server.resolveRealApiRequest({
        url: req.url,
        getKey: (path) => `${req.method} ${path}`,
      });
      res.end(JSON.stringify(result));
    }
    if (req.url?.startsWith(server.mockApiUrl)) {
      const result = server.resolveMockApiRequest({
        url: req.url,
        getKey: (payload) => `${payload.method} ${payload.path}`,
      });
      res.end(JSON.stringify(result));
    }
  })
  .listen(4001);

const client = config.client({
  address: "http://localhost:4001",
  async request({ url, method }) {
    const response = await fetch(url, {
      method,
    });
    return response.json();
  },
});

it("can configure a server with http", async () => {
  const mock1: RequestMock = {
    path: "/some/url",
    method: "GET",
    body: {
      foo: "foo",
    },
  };

  await client.set(mock1);

  await client.set({
    path: "/some/other/url",
    method: "POST",
    body: {
      bar: "bar",
    },
  });

  expect(await client.getAll()).toStrictEqual({
    "GET /some/url": {
      foo: "foo",
    },
    "POST /some/other/url": {
      bar: "bar",
    },
  });

  const mockedGet = await fetch("http://localhost:4001/api/some/url", {
    method: "GET",
  });

  expect(await mockedGet.json()).toStrictEqual({
    foo: "foo",
  });

  const mockedPost = await fetch("http://localhost:4001/api/some/other/url", {
    method: "POST",
  });

  expect(await mockedPost.json()).toStrictEqual({
    bar: "bar",
  });
});
