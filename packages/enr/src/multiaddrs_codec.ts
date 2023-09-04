import { multiaddr } from "@multiformats/multiaddr";
import type { Multiaddr } from "@multiformats/multiaddr";

import { MULTIADDR_LENGTH_SIZE } from "./constants.js";

export function decodeMultiaddrs(bytes: Uint8Array): Multiaddr[] {
  const multiaddrs = [];

  let index = 0;

  while (index < bytes.length) {
    const sizeDataView = new DataView(
      bytes.buffer,
      index,
      MULTIADDR_LENGTH_SIZE
    );
    const size = sizeDataView.getUint16(0);
    index += MULTIADDR_LENGTH_SIZE;

    const multiaddrBytes = bytes.slice(index, index + size);
    index += size;

    let ma = multiaddr(multiaddrBytes);

    // if the multiaddr contains `p2p`, it means that it supports `p2p-circuit`
    // this is avoided from the ENR to save space
    // we should add it
    if (ma.toString().includes("/p2p/")) {
      ma = multiaddr(ma.toString() + "/p2p-circuit/");
    }

    multiaddrs.push(ma);
  }
  return multiaddrs;
}

export function encodeMultiaddrs(multiaddrs: Multiaddr[]): Uint8Array {
  const totalLength = multiaddrs.reduce(
    (acc, ma) => acc + MULTIADDR_LENGTH_SIZE + ma.bytes.length,
    0
  );
  const bytes = new Uint8Array(totalLength);
  const dataView = new DataView(bytes.buffer);

  let index = 0;
  multiaddrs.forEach((multiaddr) => {
    if (multiaddr.getPeerId())
      throw new Error("`multiaddr` field MUST not contain peer id");

    // Prepend the size of the next entry
    dataView.setUint16(index, multiaddr.bytes.length);
    index += MULTIADDR_LENGTH_SIZE;

    bytes.set(multiaddr.bytes, index);
    index += multiaddr.bytes.length;
  });

  return bytes;
}
