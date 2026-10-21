export type ToolDefinition<TInput, TOutput> = { name: string; description: string; parse(input: unknown): TInput; execute(input: TInput, context: { userId: string; signal?: AbortSignal }): Promise<TOutput> };
export class ToolRegistry {
  private tools = new Map<string, ToolDefinition<never, unknown>>();
  register<I, O>(tool: ToolDefinition<I, O>) { if (this.tools.has(tool.name)) throw new Error(`Duplicate tool: ${tool.name}`); this.tools.set(tool.name, tool as ToolDefinition<never, unknown>); }
  get(name: string) { return this.tools.get(name); }
  list() { return [...this.tools.values()].map(({ name, description }) => ({ name, description })); }
}
