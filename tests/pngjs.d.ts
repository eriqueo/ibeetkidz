declare module "pngjs" {
  export interface DecodedPng {
    readonly width: number;
    readonly height: number;
    readonly data: Uint8Array;
    readonly colorType?: number;
    readonly depth?: number;
  }

  export const PNG: {
    readonly sync: {
      read(bytes: Uint8Array): DecodedPng;
      write(
        image: DecodedPng,
        options?: { readonly deflateLevel?: number },
      ): Uint8Array;
    };
  };
}
