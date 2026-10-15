// Package folders that ship with the shell, relative to the app root.
// The reference cartridge is also the first catalog listing (catalog/shelf.json).
// The broken cartridge stays a negative fixture and is never listed.

export interface ExamplePackage {
  dir: string;
  label: string;
}

export const REFERENCE_CARTRIDGE: ExamplePackage = {
  dir: 'examples/reference-cartridge',
  label: 'Reference cartridge',
};

export const BROKEN_CARTRIDGE: ExamplePackage = {
  dir: 'examples/broken-cartridge',
  label: 'Broken cartridge',
};

export const EXAMPLE_PACKAGES: readonly ExamplePackage[] = [REFERENCE_CARTRIDGE, BROKEN_CARTRIDGE];
