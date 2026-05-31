import { verifyVisualParity } from "./visual-parity-support";

async function main(): Promise<void> {
  await verifyVisualParity();
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
