import { DefaultPubSubTopic, waitForRemotePeer } from "@waku/core";
import type { IFilterSubscription, LightNode } from "@waku/interfaces";
import { Protocols } from "@waku/interfaces";
import { utf8ToBytes } from "@waku/utils/bytes";
import { expect } from "chai";

import {
  delay,
  NimGoNode,
  TEST_STRING,
  TEST_TIMESTAMPS
} from "../../src/index.js";

import {
  MessageCollector,
  messageText,
  setupNodes,
  tearDownNodes,
  TestContentTopic,
  TestDecoder,
  TestEncoder
} from "./filter_test_utils.js";

describe("Waku Filter V2: FilterPush", function () {
  // Set the timeout for all tests in this suite. Can be overwritten at test level
  this.timeout(10000);
  let waku: LightNode;
  let nwaku: NimGoNode;
  let subscription: IFilterSubscription;
  let messageCollector: MessageCollector;

  this.afterEach(async function () {
    tearDownNodes(nwaku, waku);
  });

  this.beforeEach(async function () {
    this.timeout(15000);
    const setup = await setupNodes(this);
    nwaku = setup.nwaku;
    waku = setup.waku;
    subscription = setup.subscription;
    messageCollector = setup.messageCollector;
  });

  TEST_STRING.forEach((testItem) => {
    it(`Check received message containing ${testItem.description}`, async function () {
      await subscription.subscribe([TestDecoder], messageCollector.callback);
      await waku.lightPush.send(TestEncoder, {
        payload: utf8ToBytes(testItem.value)
      });

      expect(await messageCollector.waitForMessages(1)).to.eq(true);
      messageCollector.verifyReceivedMessage({
        index: 0,
        expectedMessageText: testItem.value
      });
    });
  });

  TEST_TIMESTAMPS.forEach((testItem) => {
    it(`Check received message with timestamp: ${testItem} `, async function () {
      await subscription.subscribe([TestDecoder], messageCollector.callback);
      await delay(400);

      await nwaku.rpcCall("post_waku_v2_relay_v1_message", [
        DefaultPubSubTopic,
        {
          contentTopic: TestContentTopic,
          payload: Buffer.from(utf8ToBytes(messageText)).toString("base64"),
          timestamp: testItem
        }
      ]);

      expect(await messageCollector.waitForMessages(1)).to.eq(true);
      messageCollector.verifyReceivedMessage({
        index: 0,
        checkTimestamp: false
      });

      // Check if the timestamp matches
      const timestamp = messageCollector.getMessage(0).timestamp;
      if (testItem == undefined) {
        expect(timestamp).to.eq(undefined);
      }
      if (timestamp !== undefined) {
        expect(testItem?.toString()).to.contain(timestamp.getTime().toString());
      }
    });
  });

  it("Check received message with invalid timestamp is not received", async function () {
    await subscription.subscribe([TestDecoder], messageCollector.callback);
    await delay(400);

    await nwaku.rpcCall("post_waku_v2_relay_v1_message", [
      DefaultPubSubTopic,
      {
        contentTopic: TestContentTopic,
        payload: Buffer.from(utf8ToBytes(messageText)).toString("base64"),
        timestamp: "2023-09-06T12:05:38.609Z"
      }
    ]);

    // Verify that no message was received
    expect(await messageCollector.waitForMessages(1)).to.eq(false);
  });

  it("Check received message on other pubsub topic is not received", async function () {
    await subscription.subscribe([TestDecoder], messageCollector.callback);
    await delay(400);

    await nwaku.rpcCall("post_waku_v2_relay_v1_message", [
      "DefaultPubSubTopic",
      {
        contentTopic: TestContentTopic,
        payload: Buffer.from(utf8ToBytes(messageText)).toString("base64"),
        timestamp: BigInt(Date.now()) * BigInt(1000000)
      }
    ]);

    expect(await messageCollector.waitForMessages(1)).to.eq(false);
  });

  it("Check received message with no pubsub topic is not received", async function () {
    await subscription.subscribe([TestDecoder], messageCollector.callback);
    await delay(400);

    await nwaku.rpcCall("post_waku_v2_relay_v1_message", [
      {
        contentTopic: TestContentTopic,
        payload: Buffer.from(utf8ToBytes(messageText)).toString("base64"),
        timestamp: BigInt(Date.now()) * BigInt(1000000)
      }
    ]);

    expect(await messageCollector.waitForMessages(1)).to.eq(false);
  });

  it("Check received message with no content topic is not received", async function () {
    await subscription.subscribe([TestDecoder], messageCollector.callback);
    await delay(400);

    await nwaku.rpcCall("post_waku_v2_relay_v1_message", [
      DefaultPubSubTopic,
      {
        payload: Buffer.from(utf8ToBytes(messageText)).toString("base64"),
        timestamp: BigInt(Date.now()) * BigInt(1000000)
      }
    ]);

    expect(await messageCollector.waitForMessages(1)).to.eq(false);
  });

  it("Check received message with no payload is not received", async function () {
    await subscription.subscribe([TestDecoder], messageCollector.callback);
    await delay(400);

    await nwaku.rpcCall("post_waku_v2_relay_v1_message", [
      DefaultPubSubTopic,
      {
        contentTopic: TestContentTopic,
        timestamp: BigInt(Date.now()) * BigInt(1000000)
      }
    ]);

    // For go-waku the message is received (it is possible to send a message with no payload)
    if (nwaku.type() == "go-waku") {
      expect(await messageCollector.waitForMessages(1)).to.eq(true);
    } else {
      expect(await messageCollector.waitForMessages(1)).to.eq(false);
    }
  });

  it("Check received message with non string payload is not received", async function () {
    await subscription.subscribe([TestDecoder], messageCollector.callback);
    await delay(400);

    await nwaku.rpcCall("post_waku_v2_relay_v1_message", [
      DefaultPubSubTopic,
      {
        contentTopic: TestContentTopic,
        payload: 12345,
        timestamp: BigInt(Date.now()) * BigInt(1000000)
      }
    ]);

    expect(await messageCollector.waitForMessages(1)).to.eq(false);
  });

  it("Check received message with extra parameter is not received", async function () {
    await subscription.subscribe([TestDecoder], messageCollector.callback);
    await delay(400);

    await nwaku.rpcCall("post_waku_v2_relay_v1_message", [
      DefaultPubSubTopic,
      "extraField",
      {
        contentTopic: TestContentTopic,
        payload: Buffer.from(utf8ToBytes(messageText)).toString("base64"),
        timestamp: BigInt(Date.now()) * BigInt(1000000)
      }
    ]);

    expect(await messageCollector.waitForMessages(1)).to.eq(false);
  });

  it("Check received message with extra option is received", async function () {
    await subscription.subscribe([TestDecoder], messageCollector.callback);
    await delay(400);

    await nwaku.rpcCall("post_waku_v2_relay_v1_message", [
      DefaultPubSubTopic,
      {
        contentTopic: TestContentTopic,
        payload: Buffer.from(utf8ToBytes(messageText)).toString("base64"),
        timestamp: BigInt(Date.now()) * BigInt(1000000),
        extraOption: "extraOption"
      }
    ]);

    expect(await messageCollector.waitForMessages(1)).to.eq(true);
    messageCollector.verifyReceivedMessage({ index: 0 });
  });

  // Will be skipped until https://github.com/waku-org/js-waku/issues/1464 si done
  it.skip("Check received message received after jswaku node is restarted", async function () {
    // Subscribe and send message
    await subscription.subscribe([TestDecoder], messageCollector.callback);
    await waku.lightPush.send(TestEncoder, { payload: utf8ToBytes("M1") });
    expect(await messageCollector.waitForMessages(1)).to.eq(true);

    // Restart js-waku node
    await waku.stop();
    expect(waku.isStarted()).to.eq(false);
    await waku.start();
    expect(waku.isStarted()).to.eq(true);

    // Redo the connection and create a new subscription
    await waku.dial(await nwaku.getMultiaddrWithId());
    await waitForRemotePeer(waku, [Protocols.Filter, Protocols.LightPush]);
    subscription = await waku.filter.createSubscription();
    await subscription.subscribe([TestDecoder], messageCollector.callback);

    await waku.lightPush.send(TestEncoder, { payload: utf8ToBytes("M2") });

    // Confirm both messages were received.
    expect(await messageCollector.waitForMessages(2)).to.eq(true);
    messageCollector.verifyReceivedMessage({
      index: 0,
      expectedMessageText: "M1"
    });
    messageCollector.verifyReceivedMessage({
      index: 1,
      expectedMessageText: "M2"
    });
  });

  // Will be skipped until https://github.com/waku-org/js-waku/issues/1464 si done
  it.skip("Check received message received after nwaku node is restarted", async function () {
    await subscription.subscribe([TestDecoder], messageCollector.callback);
    await waku.lightPush.send(TestEncoder, { payload: utf8ToBytes("M1") });
    expect(await messageCollector.waitForMessages(1)).to.eq(true);

    // Restart nwaku node
    await nwaku.stop();
    await nwaku.start();
    await waitForRemotePeer(waku, [Protocols.Filter, Protocols.LightPush]);

    await waku.lightPush.send(TestEncoder, { payload: utf8ToBytes("M2") });

    // Confirm both messages were received.
    expect(await messageCollector.waitForMessages(2)).to.eq(true);
    messageCollector.verifyReceivedMessage({
      index: 0,
      expectedMessageText: "M1"
    });
    messageCollector.verifyReceivedMessage({
      index: 1,
      expectedMessageText: "M2"
    });
  });
});
