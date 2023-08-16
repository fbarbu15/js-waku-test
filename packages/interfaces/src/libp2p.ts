import type { GossipSub } from "@chainsafe/libp2p-gossipsub";
import type { Libp2p as BaseLibp2p } from "@libp2p/interface";
import type { Libp2pInit } from "libp2p";
import type { identifyService } from "libp2p/identify";
import type { PingService } from "libp2p/ping";

export type Libp2pServices = {
  ping: PingService;
  pubsub?: GossipSub;
  identify: ReturnType<ReturnType<typeof identifyService>>;
};

// TODO: Get libp2p to export this.
export type Libp2pComponents = Parameters<
  Exclude<Libp2pInit["metrics"], undefined>
>[0];

// thought components are not defined on the Libp2p interface they are present on Libp2pNode class
export type Libp2p = BaseLibp2p<Libp2pServices> & {
  components: Libp2pComponents;
};
