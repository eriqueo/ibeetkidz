declare module "pngjs" {
  export interface DecodedPng {
    readonly width: number;
    readonly height: number;
    readonly data: Uint8Array;
  }

  export const PNG: {
    readonly sync: {
      read(bytes: Uint8Array): DecodedPng;
    };
  };
}
