import { deflate } from "pako";

import { ArrayDataWriter } from "./array-writer";

export class ZlibDataWriter extends ArrayDataWriter {
  getBytes(): ArrayBuffer {
    const bytes = super.getBytesView();
    return Uint8Array.from(
      deflate(bytes, {
        windowBits: 15,
      }),
    ).buffer;
  }

  getBytesView(): Uint8Array {
    // Cannot make a nice efficient view here, since we deflate on-demand.
    return new Uint8Array(this.getBytes());
  }
}
