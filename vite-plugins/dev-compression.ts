// Dev-only: gzip what the dev server sends.
//
// Vite's dev server sends every module uncompressed. On localhost that costs
// nothing; on the hwc-home preview, reached over the tailnet from outside the
// house, every first load pushed 10.6 MB (Phaser alone is 5.5 MB) up the home
// connection, and a page took long enough that it read as broken. Gzip brings
// the scripts down about sixfold (Phaser 5.5 MB -> 0.9 MB). Images are already
// compressed and pass through untouched.
//
// It is a pre-middleware, so it wraps Vite's own (transform, deps, static):
// they write as usual and the body is compressed once, at `end`. `writeHead`
// is deferred into `setHeader` calls because Node freezes the headers the
// moment `writeHead` runs, and the encoding is only known at the end.
// `apply: "serve"`: a build never sees it; Pages compresses the real thing.
import zlib from "node:zlib";
import type { ServerResponse } from "node:http";
import type { Plugin } from "vite";

const COMPRESSIBLE = /^(?:text\/|application\/(?:javascript|json|xml|manifest\+json)|image\/svg\+xml)/;
/** Below this, the gzip header and the CPU cost more than they save. */
const MIN_BYTES = 1024;

type Chunk = string | Uint8Array;

function toBuffer(chunk: Chunk, encoding?: unknown): Buffer {
  if (typeof chunk === "string") return Buffer.from(chunk, typeof encoding === "string" ? (encoding as BufferEncoding) : "utf8");
  return Buffer.from(chunk);
}

export function devCompression(): Plugin {
  /** Compressed bodies by URL + ETag: Phaser is the same 5.5 MB every load. */
  const cache = new Map<string, Buffer>();

  return {
    name: "ibk-dev-compression",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use((req, res: ServerResponse, next) => {
        if (req.method !== "GET" || !/\bgzip\b/.test(String(req.headers["accept-encoding"] ?? ""))) return next();

        const chunks: Buffer[] = [];
        const originalWriteHead = res.writeHead;
        const originalWrite = res.write;
        const originalEnd = res.end;
        // Node's own `end` sends the headers by calling `this.writeHead`, so
        // the real methods must be back on the response before it runs; left
        // wrapped, the body goes out with no status line at all.
        const end = (body: Buffer, cb: () => void): void => {
          res.writeHead = originalWriteHead;
          res.write = originalWrite;
          res.end = originalEnd;
          res.end(body, cb);
        };

        res.writeHead = ((status: number, ...rest: unknown[]) => {
          res.statusCode = status;
          const headers = rest.find((x) => typeof x === "object" && x !== null);
          if (Array.isArray(headers)) {
            for (let i = 0; i + 1 < headers.length; i += 2) res.setHeader(String(headers[i]), headers[i + 1] as string);
          } else if (headers) {
            for (const [k, v] of Object.entries(headers)) if (v !== undefined) res.setHeader(k, v as string);
          }
          return res;
        }) as ServerResponse["writeHead"];

        res.write = ((chunk: Chunk, encoding?: unknown, cb?: unknown) => {
          if (chunk) chunks.push(toBuffer(chunk, encoding));
          const done = typeof encoding === "function" ? encoding : cb;
          if (typeof done === "function") queueMicrotask(() => (done as () => void)());
          return true;
        }) as ServerResponse["write"];

        res.end = ((chunk?: unknown, encoding?: unknown, cb?: unknown) => {
          let done = cb;
          if (typeof chunk === "function") { done = chunk; chunk = undefined; }
          if (typeof encoding === "function") { done = encoding; encoding = undefined; }
          if (chunk) chunks.push(toBuffer(chunk as Chunk, encoding));
          const body = Buffer.concat(chunks);
          const finish = (): void => { if (typeof done === "function") (done as () => void)(); };

          const type = String(res.getHeader("content-type") ?? "");
          const compress =
            res.statusCode === 200 &&
            body.length >= MIN_BYTES &&
            COMPRESSIBLE.test(type) &&
            !res.getHeader("content-encoding");
          if (!compress) {
            end(body, finish);
            return res;
          }

          const send = (gz: Buffer): void => {
            res.setHeader("Content-Encoding", "gzip");
            res.setHeader("Content-Length", gz.length);
            res.setHeader("Vary", "Accept-Encoding");
            end(gz, finish);
          };
          const etag = res.getHeader("etag");
          const key = etag ? `${req.url ?? ""}|${String(etag)}` : null;
          const hit = key ? cache.get(key) : undefined;
          if (hit) {
            send(hit);
            return res;
          }
          zlib.gzip(body, { level: 6 }, (err, gz) => {
            if (err) {
              end(body, finish);
              return;
            }
            if (key && body.length > 100_000) cache.set(key, gz);
            send(gz);
          });
          return res;
        }) as ServerResponse["end"];

        next();
      });
    },
  };
}
