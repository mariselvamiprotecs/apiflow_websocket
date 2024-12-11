// const Y = require("yjs");
// const syncProtocol = require("y-protocols/dist/sync.cjs");
// const awarenessProtocol = require("y-protocols/dist/awareness.cjs");
// const axios = require("axios");
// const encoding = require("lib0/dist/encoding.cjs");
// const decoding = require("lib0/dist/decoding.cjs");
// const map = require("lib0/dist/map.cjs");

// // const Redis = require("ioredis");
// // const redis = new Redis({
// //   host: "139.99.114.132", // Redis server hostname
// //   port: 6379, // Redis server port
// // });

// const debounce = require("lodash.debounce");
// const { json } = require("body-parser");

// const callbackHandler = require("./callback.js").callbackHandler;
// const isCallbackSet = require("./callback.js").isCallbackSet;
// // const { connect, sendToQueue, receiveFromQueue } = require("./rabbitmq");

// // const amqp = require('amqplib');

// // async function publishUpdateToQueue(docName, update) {
// //   const conn = await amqp.connect('amqp://apiflow:apiflow@139.99.114.132:15672'); // RabbitMQ server URL
// //   const channel = await conn.createChannel();
// //   const exchange = 'yjs_updates'; // Define your exchange name
// //   const routingKey = docName; // Routing key can be the doc name or another identifier

// //   await channel.assertExchange(exchange, 'direct', { durable: true });
// //   channel.publish(exchange, routingKey, Buffer.from(update));

// //   console.log('Update published to queue:', docName);

// //   await channel.close();
// //   await conn.close();
// // }

// // const saveToRedis = async (docName, ydoc) => {
// //   const state = Y.encodeStateAsUpdate(ydoc);
// //   await redis.set(`doc:${docName}`, state);
// // };

// // Load document state from Redis
// // const loadFromRedis = async (docName) => {
// //   const state = await redis.get(`doc:${docName}`);
// //   if (state) {
// //     return new Uint8Array(Buffer.from(state, "binary"));
// //   }
// //   return null;
// // };

// const CALLBACK_DEBOUNCE_WAIT =
//   parseInt(process.env.CALLBACK_DEBOUNCE_WAIT) || 2000;
// const CALLBACK_DEBOUNCE_MAXWAIT =
//   parseInt(process.env.CALLBACK_DEBOUNCE_MAXWAIT) || 10000;

// const wsReadyStateConnecting = 0;
// const wsReadyStateOpen = 1;
// const wsReadyStateClosing = 2; // eslint-disable-line
// const wsReadyStateClosed = 3; // eslint-disable-line

// // disable gc when using snapshots!
// const gcEnabled = process.env.GC !== "false" && process.env.GC !== "0";
// const persistenceDir = process.env.YPERSISTENCE;
// /**
//  * @type {{bindState: function(string,WSSharedDoc):void, writeState:function(string,WSSharedDoc):Promise<any>, provider: any}|null}
//  */
// let persistence = null;
// if (typeof persistenceDir === "string") {
//   console.info('Persisting documents to "' + persistenceDir + '"');
//   // @ts-ignore
//   const LeveldbPersistence = require("y-leveldb").LeveldbPersistence;
//   const ldb = new LeveldbPersistence(persistenceDir);
//   persistence = {
//     provider: ldb,
//     bindState: async (docName, ydoc) => {
//       const persistedYdoc = await ldb.getYDoc(docName);
//       console.log(persistedYdoc, "persistedYdoc");
//       const newUpdates = Y.encodeStateAsUpdate(ydoc);
//       ldb.storeUpdate(docName, newUpdates);
//       Y.applyUpdate(ydoc, Y.encodeStateAsUpdate(persistedYdoc));

//       ydoc.on("update", (update) => {
//         ldb.storeUpdate(docName, update);
//         // saveToRedis(docName, ydoc);
//       });
//     },
//     writeState: async (docName, ydoc) => {
//       return true;
//       // await saveToRedis(docName, ydoc);
//     },
//   };
// }

// /**
//  * @param {{bindState: function(string,WSSharedDoc):void,
//  * writeState:function(string,WSSharedDoc):Promise<any>,provider:any}|null} persistence_
//  */
// exports.setPersistence = (persistence_) => {
//   persistence = persistence_;
// };

// /**
//  * @return {null|{bindState: function(string,WSSharedDoc):void,
//  * writeState:function(string,WSSharedDoc):Promise<any>}|null} used persistence layer
//  */
// exports.getPersistence = () => persistence;

// /**
//  * @type {Map<string,WSSharedDoc>}
//  */
// const docs = new Map();
// // exporting docs so that others can use it
// exports.docs = docs;

// const messageSync = 0;
// const messageAwareness = 1;
// // const messageAuth = 2

// /**
//  * @param {Uint8Array} update
//  * @param {any} origin
//  * @param {WSSharedDoc} doc
//  */
// // const updateHandler = (update, origin, doc) => {
// //   const encoder = encoding.createEncoder();
// //   encoding.writeVarUint(encoder, messageSync);
// //   syncProtocol.writeUpdate(encoder, update);
// //   const message = encoding.toUint8Array(encoder);
// //   doc.conns.forEach((_, conn) => send(doc, conn, message));
// // };

// const updateHandler = async (update, origin, doc) => {
//   const encoder = encoding.createEncoder();
//   encoding.writeVarUint(encoder, messageSync);
//   syncProtocol.writeUpdate(encoder, update);
//   const message = encoding.toUint8Array(encoder);

//   // Save the update to Redis
//   // await saveToRedis(doc.name, doc);

//   doc.conns.forEach((_, conn) => send(doc, conn, message));
// };

// class WSSharedDoc extends Y.Doc {
//   /**
//    * @param {string} name
//    */
//   constructor(name) {
//     super({ gc: gcEnabled });
//     this.name = name;
//     /**
//      * Maps from conn to set of controlled user ids. Delete all user ids from awareness when this conn is closed
//      * @type {Map<Object, Set<number>>}
//      */
//     this.conns = new Map();
//     /**
//      * @type {awarenessProtocol.Awareness}
//      */
//     this.awareness = new awarenessProtocol.Awareness(this);
//     this.awareness.setLocalState(null);
//     /**
//      * @param {{ added: Array<number>, updated: Array<number>, removed: Array<number> }} changes
//      * @param {Object | null} conn Origin is the connection that made the change
//      */
//     const awarenessChangeHandler = ({ added, updated, removed }, conn) => {
//       const changedClients = added.concat(updated, removed);
//       if (conn !== null) {
//         const connControlledIDs = /** @type {Set<number>} */ (
//           this.conns.get(conn)
//         );
//         if (connControlledIDs !== undefined) {
//           added.forEach((clientID) => {
//             connControlledIDs.add(clientID);
//           });
//           removed.forEach((clientID) => {
//             connControlledIDs.delete(clientID);
//           });
//         }
//       }
//       // broadcast awareness update
//       const encoder = encoding.createEncoder();
//       encoding.writeVarUint(encoder, messageAwareness);
//       encoding.writeVarUint8Array(
//         encoder,
//         awarenessProtocol.encodeAwarenessUpdate(this.awareness, changedClients)
//       );
//       const buff = encoding.toUint8Array(encoder);
//       this.conns.forEach((_, c) => {
//         send(this, c, buff);
//       });
//     };
//     this.awareness.on("update", awarenessChangeHandler);
//     this.on("update", updateHandler);
//     if (isCallbackSet) {
//       this.on(
//         "update",
//         debounce(callbackHandler, CALLBACK_DEBOUNCE_WAIT, {
//           maxWait: CALLBACK_DEBOUNCE_MAXWAIT,
//         })
//       );
//     }
//   }
// }

// /**
//  * Gets a Y.Doc by name, whether in memory or on disk
//  *
//  * @param {string} docname - the name of the Y.Doc to find or create
//  * @param {boolean} gc - whether to allow gc on the doc (applies only when created)
//  * @return {WSSharedDoc}
//  */
// const getYDoc = (docname, gc = true) =>
//   map.setIfUndefined(docs, docname, () => {
//     const doc = new WSSharedDoc(docname);
//     doc.gc = gc;
//     if (persistence !== null) {
//       persistence.bindState(docname, doc);
//     }
//     docs.set(docname, doc);
//     return doc;
//   });

// exports.getYDoc = getYDoc;

// /**
//  * @param {any} conn
//  * @param {WSSharedDoc} doc
//  * @param {Uint8Array} message
//  */
// const messageListener = async (conn, doc, message) => {
//   try {
//     const encoder = encoding.createEncoder();
//     const decoder = decoding.createDecoder(message);

//     const messageType = decoding.readVarUint(decoder);
//     switch (messageType) {
//       case messageSync:
//         encoding.writeVarUint(encoder, messageSync);
//         syncProtocol.readSyncMessage(decoder, encoder, doc, conn);

//         // If the `encoder` only contains the type of reply message and no
//         // message, there is no need to send the message. When `encoder` only
//         // contains the type of reply, its length is 1.

//         // console.log(ydoc.getArray("nodes").toArray(), "ydoc");
//         // console.log(doc.getArray("run").toArray(), "doc");
//         // console.log(doc.getMap("run").toJSON(), "doc");

//         if (encoding.length(encoder) > 1) {
//           send(doc, conn, encoding.toUint8Array(encoder));
//         }
//         break;
//       case messageAwareness: {
//         awarenessProtocol.applyAwarenessUpdate(
//           doc.awareness,
//           decoding.readVarUint8Array(decoder),
//           conn
//         );
//         break;
//       }
//       default:
//         // Handle normal message
//         const message = decoding.readVarString(decoder);
//         console.log("Received normal message:", message);

//         // You can respond back to the client if needed
//         const responseMessage = "Received your message: " + message;
//         const Cencoder = encoding.createEncoder();
//         encoding.writeVarString(Cencoder, responseMessage);
//         const response = encoding.toUint8Array(encoder);
//         send(doc, conn, response);
//         break;
//     }
//     const runMap = doc.getMap("run");
//     const runData = doc.getMap("run").toJSON()?.run;
//     if (
//       runData &&
//       runData?.action === "RUN" &&
//       runData?.status === "START" &&
//       runData?.status !== "RUNNING" &&
//       runData?.status !== "COMPLETED"
//     ) {
//       if (runMap) {
//         const updateData = runMap.get("run");
//         if (updateData) {
//           updateData.status = "RUNNING";
//           // updateData.next_node = null;
//           updateData.next_node = [];

//           // updateData.run_result.push({});
//           runMap.set("run", updateData);
//         }
//       }
//       // await runHandler(doc);
//     }
//   } catch (err) {
//     console.error(err);
//     doc.emit("error", [err]);
//   }
// };

// /**
//  * @param {WSSharedDoc} doc
//  * @param {any} conn
//  */
// const closeConn = (doc, conn) => {
//   if (doc.conns.has(conn)) {
//     /**
//      * @type {Set<number>}
//      */
//     // @ts-ignore
//     console.log("closeConnection");
//     const controlledIds = doc.conns.get(conn);
//     doc.conns.delete(conn);
//     awarenessProtocol.removeAwarenessStates(
//       doc.awareness,
//       Array.from(controlledIds),
//       null
//     );
//     console.log("doc.conns.size", doc.conns.size);
//     // if (doc.conns.size === 0 && persistence !== null) {
//     if (doc.conns.size === 0) {
//       // if persisted, we store state and destroy ydocument
//       // persistence.writeState(doc.name, doc).then(() => {
//       //   doc.destroy();
//       // });
//       let data = saveHandler(doc, docs);
//       //  docs.delete(doc.name);
//       //    doc.destroy();
//       // persistence.writeState(doc.name, doc).then(() => {

//       // });
//     }
//   }
//   conn.close();
// };

// /**
//  * @param {WSSharedDoc} doc
//  * @param {any} conn
//  * @param {Uint8Array} m
//  */
// const send = (doc, conn, m) => {
//   if (
//     conn.readyState !== wsReadyStateConnecting &&
//     conn.readyState !== wsReadyStateOpen
//   ) {
//     closeConn(doc, conn);
//   }
//   try {
//     conn.send(
//       m,
//       /** @param {any} err */ (err) => {
//         err != null && closeConn(doc, conn);
//       }
//     );
//   } catch (e) {
//     closeConn(doc, conn);
//   }
// };

// const pingTimeout = 30000;

// /**
//  * @param {any} conn
//  * @param {any} req
//  * @param {any} opts
//  */
// exports.setupWSConnection = (
//   conn,
//   req,
//   { docName = req.url.slice(1).split("?")[0], gc = true } = {}
// ) => {
//   console.log("test connection");
//   conn.binaryType = "arraybuffer";
//   // get doc, initialize if it does not exist yet
//   const doc = getYDoc(docName, gc);
//   doc.conns.set(conn, new Set());
//   // listen and reply to events
//   conn.on(
//     "message",
//     /** @param {ArrayBuffer} message */ (message) =>
//       messageListener(conn, doc, new Uint8Array(message))
//   );

//   // Check if connection is still alive
//   let pongReceived = true;
//   const pingInterval = setInterval(() => {
//     if (!pongReceived) {
//       if (doc.conns.has(conn)) {
//         closeConn(doc, conn);
//       }
//       clearInterval(pingInterval);
//     } else if (doc.conns.has(conn)) {
//       pongReceived = false;
//       try {
//         conn.ping();
//       } catch (e) {
//         closeConn(doc, conn);
//         clearInterval(pingInterval);
//       }
//     }
//   }, pingTimeout);
//   conn.on("close", () => {
//     closeConn(doc, conn);
//     clearInterval(pingInterval);
//   });
//   conn.on("pong", () => {
//     pongReceived = true;
//   });
//   // put the following in a variables in a block so the interval handlers don't keep in in
//   // scope
//   {
//     // send sync step 1
//     const encoder = encoding.createEncoder();
//     encoding.writeVarUint(encoder, messageSync);
//     syncProtocol.writeSyncStep1(encoder, doc);
//     send(doc, conn, encoding.toUint8Array(encoder));
//     const awarenessStates = doc.awareness.getStates();
//     if (awarenessStates.size > 0) {
//       const encoder = encoding.createEncoder();
//       encoding.writeVarUint(encoder, messageAwareness);
//       encoding.writeVarUint8Array(
//         encoder,
//         awarenessProtocol.encodeAwarenessUpdate(
//           doc.awareness,
//           Array.from(awarenessStates.keys())
//         )
//       );
//       send(doc, conn, encoding.toUint8Array(encoder));
//     }
//   }
// };

// async function saveHandler(doc, docs) {
//   try {
//     const nodeMap = doc.getMap("nodes");
//     const edgesMap = doc.getMap("edges");
//     const keysArrayNew = doc.getArray("globalkeys").toArray();

//     const [tenant_id, flow_Id, version_id] = doc.name.split("_");
//     const user_id = "xz";

//     // const data = loadFromRedis(doc.name);

//     console.log("Flow ID:", flow_Id); // Output: flowId
//     console.log("Version ID:", version_id); // Output: versionId

//     const apiUrl = `https://api.apiflow.pro/Api/Api_design_flow_service/create_Designflow_neo4j?FlowId=${flow_Id}&Version=${version_id}&UserId=${user_id}`;

//     const apiKeysUrl = `https://api.apiflow.pro/Api/Api_design_flow_service/create_designflow_globalkey`;

//     // Prepare data from Yjs maps
//     const { nodeArray, deleteNodeId } = prepareNodes(nodeMap);
//     const { edgesArray, deleteEdgeId } = prepareEdges(edgesMap);

//     // const keys = prepareKeys(globalKeysMap, globalKeys);

//     // console.log(nodeArray, "nodeArray");
//     // console.log(edgesArray, "edgesArray");
//     // console.log(keysArrayNew, "keysArrayNew");
//     // Construct request bodies
//     const requestBody = {
//       nodes: nodeArray,
//       edges: edgesArray,
//       viewport: { x: 0, y: 0, zoom: 0 },
//       deleted_node_ids: deleteNodeId,
//       deleted_edge_ids: deleteEdgeId,
//     };

//     const requestKeys = {
//       flow_id: flow_Id,
//       version_id: version_id,
//       globalKeys: JSON.stringify(keysArrayNew),
//       tenant_id: tenant_id,
//     };
//     // const deleteRequestBody = { node_id: deleteNodeId, edge_id: deleteEdgeId };

//     // Make POST requests to delete and save endpoints
//     const responseKey = await axios.post(apiKeysUrl, requestKeys);
//     if (
//       nodeArray.length != 0 ||
//       deleteNodeId.length != 0 ||
//       edgesArray.length != 0 ||
//       deleteEdgeId.length != 0
//     ) {
//       const responseBody = await axios.post(apiUrl, requestBody);
//     }

//     console.log(requestBody);
//     // console.log(responseDelete)

//     // Remove doc from docs collection and destroy it
//     docs.delete(doc.name);
//     doc.destroy();
//   } catch (error) {
//     // console.error("Error in saveHandler:", error);
//     throw error; // Rethrow the error to propagate it further
//   }
// }

// // Helper function to prepare nodes data
// function prepareNodes(nodeMap) {
//   const nodeArray = [];
//   const deleteNodeId = [];
//   const nodeJson = nodeMap?.toJSON();

//   Object.keys(nodeJson).forEach((key) => {
//     if (nodeJson[key].action === "DELETE_NODES") {
//       deleteNodeId.push(nodeJson[key]?.nodes?.id);
//     } else {
//       // if (nodeJson[key].nodes?.type === "operationNode") {
//       nodeArray.push({
//         ...nodeJson[key].nodes,
//         // data: JSON.stringify(nodeJson[key]?.nodes?.data),
//         data: nodeJson[key]?.nodes?.data,
//         response: nodeJson[key]?.response || null,
//         is_active: true,
//       });
//       // } else {
//       //   nodeArray.push({ ...nodeJson[key].nodes, status: "Active" });
//       // }
//     }
//   });

//   return { nodeArray, deleteNodeId };
// }

// // Helper function to prepare edges data
// function prepareEdges(edgesMap) {
//   const edgesArray = [];
//   const deleteEdgeId = [];
//   const edgesJson = edgesMap?.toJSON();

//   Object.keys(edgesJson).forEach((key) => {
//     if (edgesJson[key].action === "DELETE_EDGES") {
//       deleteEdgeId.push(edgesJson[key]?.edges?.id);
//     } else {
//       edgesArray.push({
//         ...edgesJson[key].edges,
//         type: "buttonEdge",
//         is_active: true,
//       });
//     }
//   });

//   return { edgesArray, deleteEdgeId };
// }

// // function prepareKeys(globalKeysMap, globalKeys) {
// //   if (globalKeysMap) {
// //     const globalKeysJson = globalKeysMap.toJSON() || {};

// //     // Convert map data to arrays
// //     const newKeys = Object.values(globalKeysJson);
// //     let updatedKeys = globalKeys ? [...globalKeys] : [];
// //     // Process new nodes
// //     newKeys.forEach((key) => {
// //       if (key?.action === "DELETE_KEYS") {
// //         const keyIdsToDelete = key.id;
// //         // Remove nodes with these IDs from updatedNodes
// //         updatedKeys = updatedKeys.filter(
// //           (existingKey) => !keyIdsToDelete.includes(existingKey.id)
// //         );
// //       } else {
// //         const keyToUpdate = key;
// //         const index = updatedKeys.findIndex(
// //           (existingKey) => existingKey.id === keyToUpdate.id
// //         );

// //         if (index !== -1) {
// //           // Update existing node
// //           updatedKeys[index] = keyToUpdate.keys;
// //         } else {
// //           // Add new node
// //           updatedKeys.push(keyToUpdate.keys);
// //         }
// //       }
// //     });
// //     return updatedKeys;
// //   }
// // }

// const fetchDesignFlow = async (flow_Id, version_id) => {
//   const apiUrl = `https://api.apiflow.pro/Api/Api_design_flow_service/getall_globalkey_by_flowandversionid?flow_id=${flow_Id}version_id=${version_id}`;

//   try {
//     const response = await fetch(apiUrl);
//     if (!response.ok) {
//       throw new Error("Network response was not ok");
//     }
//     const data = await response.json();
//     console.log("Success:", data);
//     let res = data?.globalKeys;
//     let retunData;
//     if (res) {
//       retunData = JSON.parse(res);
//     }
//     return retunData;
//   } catch (error) {
//     console.error("Error:", error);
//     throw error; // Re-throw the error if you want to handle it further up the call stack
//   }
// };
////////////////////////////////////////////////////////////////////////////////////////////////

// 64

const Y = require("yjs");
const syncProtocol = require("y-protocols/dist/sync.cjs");
const awarenessProtocol = require("y-protocols/dist/awareness.cjs");
const axios = require("axios");
const encoding = require("lib0/dist/encoding.cjs");
const decoding = require("lib0/dist/decoding.cjs");
const map = require("lib0/dist/map.cjs");
const Redis = require("ioredis");
const redis = new Redis({
  host: "139.99.114.132", // Redis server hostname
  port: 6379, // Redis server port
});
const amqp = require("amqplib");

const debounce = require("lodash.debounce");
const { json } = require("body-parser");

const callbackHandler = require("./callback.js").callbackHandler;
const isCallbackSet = require("./callback.js").isCallbackSet;

const pipeline = redis.pipeline();

const saveToRedis = async (docName, ydoc) => {
  try {
    const state = Y.encodeStateAsUpdate(ydoc);
    await pipeline.set(`doc:${docName}`, Buffer.from(state).toString("binary"));
    console.log(`State for ${docName} saved to Redis.`);
    await pipeline.exec(); // Execute the pipeline commands
  } catch (error) {
    console.error(`Error saving ${docName} to Redis:`, error);
  }
};

const loadFromRedis = async (docName) => {
  try {
    const state = await redis.get(`doc:${docName}`);

    if (state) {
      const buffer = Buffer.from(state, "binary");
      console.log("Loaded state from Redis:", buffer);
      return new Uint8Array(buffer);
    }
    console.log(`No state found in Redis for ${docName}.`);
    return null;
  } catch (error) {
    console.error(`Error loading ${docName} from Redis:`, error);
    return null;
  }
};

const saveConnectionsToRedis = async (docName, connections) => {
  try {
    const connectionsArray = Array.from(connections);

    if (connectionsArray.length === 0) {
      // Remove the key if there are no connections
      await pipeline.del(`conns:${docName}`);
      await pipeline.exec(); // Execute the pipeline commands
      console.log(`No connections for ${docName}. Redis key deleted.`);
    } else {
      // Save connections to Redis
      await pipeline.sadd(`conns:${docName}`, ...connectionsArray);
      await pipeline.exec(); // Execute the pipeline commands
      console.log(`Connections for ${docName} saved to Redis.`);
    }
  } catch (error) {
    console.error(`Error saving connections for ${docName} to Redis:`, error);
  }
};

const loadConnectionsFromRedis = async (docName) => {
  try {
    const connections = await redis.smembers(`conns:${docName}`);
    if (connections) {
      console.log("Loaded connections from Redis:", connections);
      return connections;
    }
    console.log(`No connections found in Redis for ${docName}.`);
    return [];
  } catch (error) {
    console.error(
      `Error loading connections for ${docName} from Redis:`,
      error
    );
    return [];
  }
};

const deleteConnectionsFromRedis = async (docName) => {
  try {
    await pipeline.del(`conns:${docName}`);
    await pipeline.exec(); // Execute the pipeline commands
    console.log(`Connections for ${docName} deleted from Redis.`);
  } catch (error) {
    console.error(
      `Error deleting connections for ${docName} from Redis:`,
      error
    );
  }
};

const deleteFromRedis = async (docName) => {
  await pipeline.del(`doc:${docName}`);
  await pipeline.exec(); // Execute the pipeline commands
  await pipeline.exec(); // Execute the pipeline commands
};

const CALLBACK_DEBOUNCE_WAIT =
  parseInt(process.env.CALLBACK_DEBOUNCE_WAIT) || 2000;
const CALLBACK_DEBOUNCE_MAXWAIT =
  parseInt(process.env.CALLBACK_DEBOUNCE_MAXWAIT) || 10000;

const wsReadyStateConnecting = 0;
const wsReadyStateOpen = 1;
const wsReadyStateClosing = 2; // eslint-disable-line
const wsReadyStateClosed = 3; // eslint-disable-line

// disable gc when using snapshots!
const gcEnabled = process.env.GC !== "false" && process.env.GC !== "0";
const persistenceDir = process.env.YPERSISTENCE;
/**
 * @type {{bindState: function(string,WSSharedDoc):void, writeState:function(string,WSSharedDoc):Promise<any>, provider: any}|null}
 */
let persistence = null;
if (typeof persistenceDir === "string") {
  console.info('Persisting documents to "' + persistenceDir + '"');
  // @ts-ignore
  const LeveldbPersistence = require("y-leveldb").LeveldbPersistence;
  const ldb = new LeveldbPersistence(persistenceDir);
  persistence = {
    provider: ldb,
    bindState: async (docName, ydoc) => {
      const persistedYdoc = await ldb.getYDoc(docName);
      console.log(persistedYdoc, "persistedYdoc");
      const newUpdates = Y.encodeStateAsUpdate(ydoc);
      ldb.storeUpdate(docName, newUpdates);
      Y.applyUpdate(ydoc, Y.encodeStateAsUpdate(persistedYdoc));

      ydoc.on("update", (update) => {
        ldb.storeUpdate(docName, update);
        // saveToRedis(docName, ydoc);
      });
    },
    writeState: async (docName, ydoc) => {
      return true;
      // await saveToRedis(docName, ydoc);
    },
  };
}

/**
 * @param {{bindState: function(string,WSSharedDoc):void,
 * writeState:function(string,WSSharedDoc):Promise<any>,provider:any}|null} persistence_
 */
exports.setPersistence = (persistence_) => {
  persistence = persistence_;
};

/**
 * @return {null|{bindState: function(string,WSSharedDoc):void,
 * writeState:function(string,WSSharedDoc):Promise<any>}|null} used persistence layer
 */
exports.getPersistence = () => persistence;

/**
 * @type {Map<string,WSSharedDoc>}
 */
const docs = new Map();
// exporting docs so that others can use it
exports.docs = docs;

const messageSync = 0;
const messageAwareness = 1;
// const messageAuth = 2

/**
 * @param {Uint8Array} update
 * @param {any} origin
 * @param {WSSharedDoc} doc
 */

const updateHandler = async (update, origin, doc) => {
  const encoder = encoding.createEncoder();
  encoding.writeVarUint(encoder, messageSync);
  syncProtocol.writeUpdate(encoder, update);
  const message = encoding.toUint8Array(encoder);

  // Save the update to Redis
  doc.conns.forEach((_, conn) => send(doc, conn, message));

  await saveToRedis(doc.name, doc);
};

class WSSharedDoc extends Y.Doc {
  constructor(name) {
    super({ gc: gcEnabled });
    this.name = name;
    this.conns = new Map();

    this.awareness = new awarenessProtocol.Awareness(this);
    this.awareness.setLocalState(null);

    const awarenessChangeHandler = ({ added, updated, removed }, conn) => {
      const changedClients = added.concat(updated, removed);
      if (conn !== null) {
        const connControlledIDs = this.conns.get(conn);
        if (connControlledIDs !== undefined) {
          added.forEach((clientID) => connControlledIDs.add(clientID));
          removed.forEach((clientID) => connControlledIDs.delete(clientID));
        }
      }
      const encoder = encoding.createEncoder();
      encoding.writeVarUint(encoder, messageAwareness);
      encoding.writeVarUint8Array(
        encoder,
        awarenessProtocol.encodeAwarenessUpdate(this.awareness, changedClients)
      );
      const buff = encoding.toUint8Array(encoder);
      this.conns.forEach((_, c) => send(this, c, buff));
    };

    this.awareness.on("update", awarenessChangeHandler);
    this.on("update", updateHandler);
    if (isCallbackSet) {
      this.on(
        "update",
        debounce(callbackHandler, CALLBACK_DEBOUNCE_WAIT, {
          maxWait: CALLBACK_DEBOUNCE_MAXWAIT,
        })
      );
    }
  }
}

const getYDoc = async (docName, gc = true) => {
  let doc = docs.get(docName);
  if (!doc) {
    doc = new WSSharedDoc(docName);
    doc.gc = gc;

    const redisDocState = await loadFromRedis(docName);
    if (redisDocState) {
      Y.applyUpdate(doc, redisDocState);
    }

    const connections = await loadConnectionsFromRedis(docName);
    connections.forEach((conn) => {
      // Restore connections logic here, e.g., re-attach to WebSocket connections
      // Remember that WebSocket connections can't be restored, so this might just be for tracking purposes
    });

    docs.set(docName, doc);

    if (persistence !== null) {
      persistence.bindState(docName, doc);
    }
  }
  return doc;
};

const closeConn = async (doc, conn) => {
  if (doc.conns.has(conn)) {
    const controlledIds = doc.conns.get(conn);
    doc.conns.delete(conn);
    await saveConnectionsToRedis(doc.name, Array.from(doc.conns.keys()));
    awarenessProtocol.removeAwarenessStates(
      doc.awareness,
      Array.from(controlledIds),
      null
    );
    if (doc.conns.size === 0) {
      await saveToRedis(doc.name, doc);
      // saveHandler(doc, docs);
      docs.delete(doc.name);
      await deleteConnectionsFromRedis(doc.name);
      await deleteFromRedis(doc.name);
    }
  }
  conn.close();
};

/**
 * Gets a Y.Doc by name, whether in memory or on disk
 *
 * @param {string} docname - the name of the Y.Doc to find or create
 * @param {boolean} gc - whether to allow gc on the doc (applies only when created)
 * @return {WSSharedDoc}
 */
// const getYDoc = (docname, gc = true) =>
//   map.setIfUndefined(docs, docname, () => {
//     const doc = new WSSharedDoc(docname);
//     doc.gc = gc;
//     if (persistence !== null) {
//       persistence.bindState(docname, doc);
//     }
//     docs.set(docname, doc);
//     return doc;
//   });

exports.getYDoc = getYDoc;

/**
 * @param {any} conn
 * @param {WSSharedDoc} doc
 * @param {Uint8Array} message
 */
const messageListener = async (conn, doc, message) => {
  try {
    const encoder = encoding.createEncoder();
    const decoder = decoding.createDecoder(message);

    const messageType = decoding.readVarUint(decoder);
    switch (messageType) {
      case messageSync:
        encoding.writeVarUint(encoder, messageSync);
        syncProtocol.readSyncMessage(decoder, encoder, doc, conn);

        // If the `encoder` only contains the type of reply message and no
        // message, there is no need to send the message. When `encoder` only
        // contains the type of reply, its length is 1

        if (encoding.length(encoder) > 1) {
          send(doc, conn, encoding.toUint8Array(encoder));
        }
        break;
      case messageAwareness: {
        awarenessProtocol.applyAwarenessUpdate(
          doc.awareness,
          decoding.readVarUint8Array(decoder),
          conn
        );
        break;
      }
      default:
        // Handle normal message
        const message = decoding.readVarString(decoder);
        console.log("Received normal message:", message);

        // You can respond back to the client if needed
        const responseMessage = "Received your message: " + message;
        const Cencoder = encoding.createEncoder();
        encoding.writeVarString(Cencoder, responseMessage);
        const response = encoding.toUint8Array(encoder);
        send(doc, conn, response);
        break;
    }
    const runMap = doc.getMap("run");
    const runData = doc.getMap("run").toJSON()?.run;
    if (
      runData &&
      runData?.action === "RUN" &&
      runData?.status === "START" &&
      runData?.status !== "RUNNING" &&
      runData?.status !== "COMPLETED"
    ) {
      if (runMap) {
        const updateData = runMap.get("run");
        if (updateData) {
          updateData.status = "RUNNING";
          // updateData.next_node = null;
          updateData.next_node = [];

          // updateData.run_result.push({});
          runMap.set("run", updateData);
        }
      }
      // await runHandler(doc);
    }
  } catch (err) {
    console.error(err);
    doc.emit("error", [err]);
  }
};

/**
 * @param {WSSharedDoc} doc
 * @param {any} conn
 */
// const closeConn = (doc, conn) => {
//   if (doc.conns.has(conn)) {
//     /**
//      * @type {Set<number>}
//      */
//     // @ts-ignore
//     console.log("closeConnection");
//     const controlledIds = doc.conns.get(conn);
//     doc.conns.delete(conn);
//     awarenessProtocol.removeAwarenessStates(
//       doc.awareness,
//       Array.from(controlledIds),
//       null
//     );
//     console.log("doc.conns.size", doc.conns.size);
//     // if (doc.conns.size === 0 && persistence !== null) {
//     if (doc.conns.size === 0) {
//       // if persisted, we store state and destroy ydocument
//       // persistence.writeState(doc.name, doc).then(() => {
//       //   doc.destroy();
//       // });
//       let data = saveHandler(doc, docs);
//       deleteFromRedis(doc.name);
//       //  docs.delete(doc.name);
//       //    doc.destroy();
//       // persistence.writeState(doc.name, doc).then(() => {

//       // });
//     }
//   }
//   conn.close();
// };

/**
 * @param {WSSharedDoc} doc
 * @param {any} conn
 * @param {Uint8Array} m
 */
const send = (doc, conn, m) => {
  if (
    conn.readyState !== wsReadyStateConnecting &&
    conn.readyState !== wsReadyStateOpen
  ) {
    closeConn(doc, conn);
  }
  try {
    conn.send(
      m,
      /** @param {any} err */ (err) => {
        err != null && closeConn(doc, conn);
      }
    );
  } catch (e) {
    closeConn(doc, conn);
  }
};

const pingTimeout = 30000;

/**
 * @param {any} conn
 * @param {any} req
 * @param {any} opts
 */
exports.setupWSConnection = async (
  conn,
  req,
  { docName = req.url.slice(1).split("?")[0], gc = true } = {}
) => {
  console.log("test connection");
  conn.binaryType = "arraybuffer";
  // get doc, initialize if it does not exist yet
  let doc = await getYDoc(docName, gc);
  const redisState = await loadFromRedis(docName);

  if (redisState) {
    Y.applyUpdate(doc, redisState);
    console.log(`Document state for ${docName} loaded from Redis.`);
  } else {
    console.log(`No existing state for ${docName}. Using new document.`);
  }

  doc.conns.set(conn, new Set());
  try {
    await saveToRedis(docName, doc);
    await saveConnectionsToRedis(docName, Array.from(doc.conns.keys())); // Ensure you convert the iterator to an array
  } catch (error) {
    console.error(
      `Error saving document or connections for ${docName} to Redis:`,
      error
    );
  }
  // setupRabbitMQSubscriber(doc.name, doc, conn);
  // listen and reply to events
  conn.on(
    "message",
    /** @param {ArrayBuffer} message */ (message) =>
      messageListener(conn, doc, new Uint8Array(message))
  );

  // Check if connection is still alive
  let pongReceived = true;
  const pingInterval = setInterval(() => {
    if (!pongReceived) {
      if (doc.conns.has(conn)) {
        closeConn(doc, conn);
      }
      clearInterval(pingInterval);
    } else if (doc.conns.has(conn)) {
      pongReceived = false;
      try {
        conn.ping();
      } catch (e) {
        closeConn(doc, conn);
        clearInterval(pingInterval);
      }
    }
  }, pingTimeout);
  conn.on("close", () => {
    closeConn(doc, conn);
    clearInterval(pingInterval);
  });
  conn.on("pong", () => {
    pongReceived = true;
  });
  // put the following in a variables in a block so the interval handlers don't keep in in
  // scope
  {
    // send sync step 1
    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, messageSync);
    syncProtocol.writeSyncStep1(encoder, doc);
    send(doc, conn, encoding.toUint8Array(encoder));
    const awarenessStates = doc.awareness.getStates();
    if (awarenessStates.size > 0) {
      const encoder = encoding.createEncoder();
      encoding.writeVarUint(encoder, messageAwareness);
      encoding.writeVarUint8Array(
        encoder,
        awarenessProtocol.encodeAwarenessUpdate(
          doc.awareness,
          Array.from(awarenessStates.keys())
        )
      );
      send(doc, conn, encoding.toUint8Array(encoder));
    }
  }
};

async function saveHandler(doc, docs) {
  try {
    const nodeMap = doc.getMap("nodes");
    const edgesMap = doc.getMap("edges");
    const keysArrayNew = doc.getArray("globalkeys").toArray();

    const [tenant_id, flow_Id, version_id] = doc.name.split("_");
    const user_id = "Autosave";

    // const data = loadFromRedis(doc.name);

    console.log("Flow ID:", flow_Id); // Output: flowId
    console.log("Version ID:", version_id); // Output: versionId

    const apiUrl = `https://api.apiflow.pro/Api/Api_design_flow_service/internal_create_Designflow_neo4j?FlowId=${flow_Id}&Version=${version_id}&UserId=${user_id}&tenantId=${tenant_id}`;

    const apiKeysUrl = `https://api.apiflow.pro/Api/Api_design_flow_service/internal_create_designflow_globalkey`;

    // Prepare data from Yjs maps
    const { nodeArray, deleteNodeId } = prepareNodes(nodeMap);
    const { edgesArray, deleteEdgeId } = prepareEdges(edgesMap);

    // const keys = prepareKeys(globalKeysMap, globalKeys);

    // console.log(nodeArray, "nodeArray");
    // console.log(edgesArray, "edgesArray");
    // console.log(keysArrayNew, "keysArrayNew");
    // Construct request bodies
    const requestBody = {
      nodes: nodeArray,
      edges: edgesArray,
      viewport: { x: 0, y: 0, zoom: 0 },
      deleted_node_ids: deleteNodeId,
      deleted_edge_ids: deleteEdgeId,
    };

    const requestKeys = {
      flow_id: flow_Id,
      version_id: version_id,
      globalKeys: JSON.stringify(keysArrayNew),
      tenant_id: tenant_id,
    };
    // const deleteRequestBody = { node_id: deleteNodeId, edge_id: deleteEdgeId };

    // Make POST requests to delete and save endpoints
    const responseKey = await axios.post(apiKeysUrl, requestKeys);
    // console.log(responseKey, "globalKeys");
    if (
      nodeArray.length != 0 ||
      deleteNodeId.length != 0 ||
      edgesArray.length != 0 ||
      deleteEdgeId.length != 0
    ) {
      const responseBody = await axios.post(apiUrl, requestBody);
    }

    // console.log(requestBody);
    // console.log(responseDelete)

    // Remove doc from docs collection and destroy it
    docs.delete(doc.name);
    doc.destroy();
  } catch (error) {
    // console.error("Error in saveHandler:", error);
    throw error; // Rethrow the error to propagate it further
  }
}

// Helper function to prepare nodes data
function prepareNodes(nodeMap) {
  const nodeArray = [];
  const deleteNodeId = [];
  const nodeJson = nodeMap?.toJSON();

  Object.keys(nodeJson).forEach((key) => {
    if (nodeJson[key].action === "DELETE_NODES") {
      deleteNodeId.push(nodeJson[key]?.nodes?.id);
    } else {
      // if (nodeJson[key].nodes?.type === "operationNode") {
      nodeArray.push({
        ...nodeJson[key].nodes,
        // data: JSON.stringify(nodeJson[key]?.nodes?.data),
        data: nodeJson[key]?.nodes?.data,
        response: nodeJson[key]?.response || null,
        is_active: true,
      });
      // } else {
      //   nodeArray.push({ ...nodeJson[key].nodes, status: "Active" });
      // }
    }
  });

  return { nodeArray, deleteNodeId };
}

// Helper function to prepare edges data
function prepareEdges(edgesMap) {
  const edgesArray = [];
  const deleteEdgeId = [];
  const edgesJson = edgesMap?.toJSON();

  Object.keys(edgesJson).forEach((key) => {
    if (edgesJson[key].action === "DELETE_EDGES") {
      deleteEdgeId.push(edgesJson[key]?.edges?.id);
    } else {
      edgesArray.push({
        ...edgesJson[key].edges,
        type: "buttonEdge",
        is_active: true,
      });
    }
  });

  return { edgesArray, deleteEdgeId };
}

// function prepareKeys(globalKeysMap, globalKeys) {
//   if (globalKeysMap) {
//     const globalKeysJson = globalKeysMap.toJSON() || {};

//     // Convert map data to arrays
//     const newKeys = Object.values(globalKeysJson);
//     let updatedKeys = globalKeys ? [...globalKeys] : [];
//     // Process new nodes
//     newKeys.forEach((key) => {
//       if (key?.action === "DELETE_KEYS") {
//         const keyIdsToDelete = key.id;
//         // Remove nodes with these IDs from updatedNodes
//         updatedKeys = updatedKeys.filter(
//           (existingKey) => !keyIdsToDelete.includes(existingKey.id)
//         );
//       } else {
//         const keyToUpdate = key;
//         const index = updatedKeys.findIndex(
//           (existingKey) => existingKey.id === keyToUpdate.id
//         );

//         if (index !== -1) {
//           // Update existing node
//           updatedKeys[index] = keyToUpdate.keys;
//         } else {
//           // Add new node
//           updatedKeys.push(keyToUpdate.keys);
//         }
//       }
//     });
//     return updatedKeys;
//   }
// }

const fetchDesignFlow = async (flow_Id, version_id) => {
  const apiUrl = `https://api.apiflow.pro/Api/Api_design_flow_service/getall_globalkey_by_flowandversionid?flow_id=${flow_Id}version_id=${version_id}`;

  try {
    const response = await fetch(apiUrl);
    if (!response.ok) {
      throw new Error("Network response was not ok");
    }
    const data = await response.json();
    console.log("Success:", data);
    let res = data?.globalKeys;
    let retunData;
    if (res) {
      retunData = JSON.parse(res);
    }
    return retunData;
  } catch (error) {
    console.error("Error:", error);
    throw error; // Re-throw the error if you want to handle it further up the call stack
  }
};

// const { GoogleAuth } = require('google-auth-library');
// const fetch = require('node-fetch');
// const fs = require('fs');

// // Load your service account key file
// const keyFilePath = './google.json';

// async function getApiProxies() {
//   const auth = new GoogleAuth({
//     keyFile: keyFilePath,
//     scopes: ['https://www.googleapis.com/auth/cloud-platform'],
//   });

//   const client = await auth.getClient();
//   const projectId = await auth.getProjectId();

//   const url = `https://apigee.googleapis.com/v1/organizations/${projectId}/apis`;

//   try {
//     const res = await client.request({ url });
//     const proxies = res.data.proxies;

//     for (const proxy of proxies) {
//       console.log(`Fetching details for proxy: ${proxy.name}`);
//       await getApiProxyDetails(client, projectId, proxy.name);
//     }
//   } catch (error) {
//     console.error('Error:', error);
//   }
// }

// async function getApiProxyDetails(client, projectId, proxyName) {
//   const url = `https://apigee.googleapis.com/v1/organizations/${projectId}/apis/${proxyName}`;

//   try {
//     const res = await client.request({ url });
//     const proxyDetails = res.data;
//     console.log(`Details of ${proxyName}:`, proxyDetails);

//     // Fetch and display revision details
//     for (const revision of proxyDetails.revision) {
//       await getApiProxyRevisionDetails(client, projectId, proxyName, revision);
//     }
//   } catch (error) {
//     console.error(`Error fetching details for ${proxyName}:`, error);
//   }
// }

// async function getApiProxyRevisionDetails(client, projectId, proxyName, revisionId) {
//   const url = `https://apigee.googleapis.com/v1/organizations/${projectId}/apis/${proxyName}/revisions/${revisionId}`;

//   try {
//     const res = await client.request({ url });
//     const revisionDetails = res.data;
//     console.log(`Revision ${revisionId} of ${proxyName}:`, revisionDetails);

//     // Check if basepaths and proxies exist in revision details
//     const basepaths = revisionDetails.basepaths || [];
//     const proxies = revisionDetails.proxies || [];

//     console.log(`Basepaths for ${proxyName}:`, basepaths);

//     proxies.forEach((proxy) => {
//       if (proxy.flows) {
//         proxy.flows.forEach((flow) => {
//           const methods = flow.condition ? flow.condition.match(/(GET|POST|PUT|DELETE|PATCH)/g) : [];
//           console.log(`Flow name: ${flow.name}, Methods: ${methods}`);
//         });
//       } else {
//         console.log(`No flows found for proxy: ${proxyName}, revision: ${revisionId}`);
//       }
//     });
//   } catch (error) {
//     console.error(`Error fetching revision ${revisionId} for ${proxyName}:`, error);
//   }
// }

// getApiProxies();
