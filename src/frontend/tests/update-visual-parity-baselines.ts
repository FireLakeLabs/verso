import { updateVisualParityBaselines } from "./visual-parity-support";

async function main(): Promise<void> {
  await updateVisualParityBaselines();
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
