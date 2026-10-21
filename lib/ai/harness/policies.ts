export type ToolPolicy = { name: string; requiresConfirmation: boolean; allowed: boolean };
export function assertToolAllowed(policy: ToolPolicy) {
  if (!policy.allowed) throw new Error(`Tool '${policy.name}' is not permitted.`);
  if (policy.requiresConfirmation) throw new Error(`Tool '${policy.name}' requires explicit user confirmation.`);
}
