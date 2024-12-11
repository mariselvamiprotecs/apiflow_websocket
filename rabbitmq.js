const amqp = require("amqplib");
let channel;
const encoding = require("lib0/dist/encoding.cjs");
const decoding = require("lib0/dist/decoding.cjs");
const messageSync = 0;
const syncProtocol = require("y-protocols/dist/sync.cjs");
const awarenessProtocol = require("y-protocols/dist/awareness.cjs");
const messageAwareness = 1;

// Initialize RabbitMQ connection and channel
const initRabbitMQ = async () => {
  try {
    const connection = await amqp.connect(
      "amqp://apiflow:apiflow@139.99.114.132:5672"
    );
    channel = await connection.createChannel();
  } catch (error) {
    console.error("Failed to connect to RabbitMQ", error);
    throw error; // Re-throw to handle it higher up if needed
  }
};

// Publish a message to RabbitMQ
// const publishUpdateToQueue = async (docName, update) => {
//   try {
//     const [exchange, queue] = docName.split('_', 2);

//     if (!channel) {
//       await initRabbitMQ();
//     }

//     await channel.assertExchange(exchange, 'direct', { durable: true });
//     await channel.assertQueue(queue, { durable: true });
//     await channel.bindQueue(queue, exchange, '');

//     const encoder = encoding.createEncoder();
//     encoding.writeVarUint(encoder, messageSync);
//     syncProtocol.writeSyncStep1(encoder, update);
//     const message = encoding.toUint8Array(encoder);

//     channel.publish(exchange, '', message);
//     console.log(`Message published to ${exchange}/${queue}`);
//   } catch (error) {
//     console.error('Failed to publish message to RabbitMQ', error);
//   }
// };

const publishUpdateToQueue = async (docName, message) => {
  try {
    console.log("Publishing to queue with docName:", docName);
    const [exchange, queue] = docName.split("_", 2);
    console.log("Exchange:", exchange, "Queue:", queue);

    // if (!doc || !doc.clients) {
    //   console.error(
    //     "Document is not correctly initialized: missing required properties."
    //   );
    //   return;
    // }

    if (!channel) {
      await initRabbitMQ();
    }

    await channel.assertExchange(exchange, "direct", { durable: true });
    await channel.assertQueue(queue, { durable: true });
    await channel.bindQueue(queue, exchange, "");

    const bufferMessage = Buffer.from(message);
    channel.publish(exchange, "", bufferMessage);
    console.log(`Message published to ${exchange}/${queue}`);
  } catch (error) {
    console.error("Failed to publish message to RabbitMQ", error);
  }
};

module.exports = {
  publishUpdateToQueue,
  initRabbitMQ
};
