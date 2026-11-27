interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  all<T = Record<string, unknown>>(): Promise<{ results?: T[] }>;
  run(): Promise<{ meta: { last_row_id?: number } }>;
}
interface D1Database { prepare(query: string): D1PreparedStatement; }
interface Fetcher { fetch(request: Request): Promise<Response>; }
type ExportedHandler<Env> = {
  fetch(request: Request, env: Env, ctx?: unknown): Response | Promise<Response>;
};
