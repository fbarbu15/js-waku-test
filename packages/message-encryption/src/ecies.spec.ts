import { expect } from "chai";
import fc from "fast-check";

import { getPublicKey } from "./crypto/index.js";
import { createDecoder, createEncoder } from "./ecies.js";

describe("Ecies Encryption", function () {
  it("Round trip binary encryption [ecies, no signature]", async function () {
    await fc.assert(
      fc.asyncProperty(
        fc.string(),
        fc.string(),
        fc.uint8Array({ minLength: 1 }),
        fc.uint8Array({ min: 1, minLength: 32, maxLength: 32 }),
        async (pubSubTopic, contentTopic, payload, privateKey) => {
          const publicKey = getPublicKey(privateKey);

          const encoder = createEncoder({
            contentTopic,
            publicKey,
          });
          const bytes = await encoder.toWire({ payload });

          const decoder = createDecoder(contentTopic, privateKey);
          const protoResult = await decoder.fromWireToProtoObj(bytes!);
          if (!protoResult) throw "Failed to proto decode";
          const result = await decoder.fromProtoObj(pubSubTopic, protoResult);
          if (!result) throw "Failed to decode";

          expect(result.contentTopic).to.equal(contentTopic);
          expect(result.pubSubTopic).to.equal(pubSubTopic);
          expect(result.version).to.equal(1);
          expect(result?.payload).to.deep.equal(payload);
          expect(result.signature).to.be.undefined;
          expect(result.signaturePublicKey).to.be.undefined;
        }
      )
    );
  });

  it("R trip binary encryption [ecies, signature]", async function () {
    this.timeout(4000);

    await fc.assert(
      fc.asyncProperty(
        fc.string(),
        fc.string(),
        fc.uint8Array({ minLength: 1 }),
        fc.uint8Array({ min: 1, minLength: 32, maxLength: 32 }),
        fc.uint8Array({ min: 1, minLength: 32, maxLength: 32 }),
        async (
          pubSubTopic,
          contentTopic,
          payload,
          alicePrivateKey,
          bobPrivateKey
        ) => {
          const alicePublicKey = getPublicKey(alicePrivateKey);
          const bobPublicKey = getPublicKey(bobPrivateKey);

          const encoder = createEncoder({
            contentTopic,
            publicKey: bobPublicKey,
            sigPrivKey: alicePrivateKey,
          });
          const bytes = await encoder.toWire({ payload });

          const decoder = createDecoder(contentTopic, bobPrivateKey);
          const protoResult = await decoder.fromWireToProtoObj(bytes!);
          if (!protoResult) throw "Failed to proto decode";
          const result = await decoder.fromProtoObj(pubSubTopic, protoResult);
          if (!result) throw "Failed to decode";

          expect(result.contentTopic).to.equal(contentTopic);
          expect(result.pubSubTopic).to.equal(pubSubTopic);
          expect(result.version).to.equal(1);
          expect(result?.payload).to.deep.equal(payload);
          expect(result.signature).to.not.be.undefined;
          expect(result.signaturePublicKey).to.deep.eq(alicePublicKey);
        }
      )
    );
  });
});