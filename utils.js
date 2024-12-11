const Y = require("yjs");
const syncProtocol = require("y-protocols/dist/sync.cjs");
const awarenessProtocol = require("y-protocols/dist/awareness.cjs");
const axios = require("axios");
const encoding = require("lib0/dist/encoding.cjs");
const decoding = require("lib0/dist/decoding.cjs");
const map = require("lib0/dist/map.cjs");
const debounce = require("lodash.debounce");
const { json } = require("body-parser");

const callbackHandler = require("./callback.js").callbackHandler;
const isCallbackSet = require("./callback.js").isCallbackSet;

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
      });
    },
    writeState: async (docName, ydoc) => {
      return true;
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
  doc.conns.forEach((_, conn) => send(doc, conn, message));
};

class WSSharedDoc extends Y.Doc {
  /**
   * @param {string} name
   */
  constructor(name) {
    super({ gc: gcEnabled });
    this.name = name;
    /**
     * Maps from conn to set of controlled user ids. Delete all user ids from awareness when this conn is closed
     * @type {Map<Object, Set<number>>}
     */
    this.conns = new Map();
    /**
     * @type {awarenessProtocol.Awareness}
     */
    this.awareness = new awarenessProtocol.Awareness(this);
    this.awareness.setLocalState(null);
    /**
     * @param {{ added: Array<number>, updated: Array<number>, removed: Array<number> }} changes
     * @param {Object | null} conn Origin is the connection that made the change
     */
    const awarenessChangeHandler = ({ added, updated, removed }, conn) => {
      const changedClients = added.concat(updated, removed);
      if (conn !== null) {
        const connControlledIDs = /** @type {Set<number>} */ (
          this.conns.get(conn)
        );
        if (connControlledIDs !== undefined) {
          added.forEach((clientID) => {
            connControlledIDs.add(clientID);
          });
          removed.forEach((clientID) => {
            connControlledIDs.delete(clientID);
          });
        }
      }
      // broadcast awareness update
      const encoder = encoding.createEncoder();
      encoding.writeVarUint(encoder, messageAwareness);
      encoding.writeVarUint8Array(
        encoder,
        awarenessProtocol.encodeAwarenessUpdate(this.awareness, changedClients)
      );
      const buff = encoding.toUint8Array(encoder);
      this.conns.forEach((_, c) => {
        send(this, c, buff);
      });
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

/**
 * Gets a Y.Doc by name, whether in memory or on disk
 *
 * @param {string} docname - the name of the Y.Doc to find or create
 * @param {boolean} gc - whether to allow gc on the doc (applies only when created)
 * @return {WSSharedDoc}
 */
const getYDoc = (docname, gc = true) =>
  map.setIfUndefined(docs, docname, () => {
    const doc = new WSSharedDoc(docname);
    doc.gc = gc;
    if (persistence !== null) {
      persistence.bindState(docname, doc);
    }
    docs.set(docname, doc);
    return doc;
  });

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
        // contains the type of reply, its length is 1.

        // console.log(ydoc.getArray("nodes").toArray(), "ydoc");
        // console.log(doc.getArray("run").toArray(), "doc");
        // console.log(doc.getMap("run").toJSON(), "doc");

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
const closeConn = (doc, conn) => {
  if (doc.conns.has(conn)) {
    /**
     * @type {Set<number>}
     */
    // @ts-ignore
    console.log("closeConnection");
    const controlledIds = doc.conns.get(conn);
    doc.conns.delete(conn);
    awarenessProtocol.removeAwarenessStates(
      doc.awareness,
      Array.from(controlledIds),
      null
    );
    console.log("doc.conns.size", doc.conns.size);
    // if (doc.conns.size === 0 && persistence !== null) {
    if (doc.conns.size === 0) {
      // if persisted, we store state and destroy ydocument
      // persistence.writeState(doc.name, doc).then(() => {
      //   doc.destroy();
      // });
      // let data = saveHandler(doc, docs);
      docs.delete(doc.name);
      doc.destroy();
      // persistence.writeState(doc.name, doc).then(() => {

      // });
    }
  }
  conn.close();
};

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
exports.setupWSConnection = (
  conn,
  req,
  { docName = req.url.slice(1).split("?")[0], gc = true } = {}
) => {
  console.log("test connection");
  conn.binaryType = "arraybuffer";
  // get doc, initialize if it does not exist yet
  const doc = getYDoc(docName, gc);
  doc.conns.set(conn, new Set());
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
    const user_id = "xz";

    console.log("Flow ID:", flow_Id); // Output: flowId
    console.log("Version ID:", version_id); // Output: versionId

    const apiUrl = `https://api.apiflow.pro/Api/Api_design_flow_service/internal_create_Designflow_neo4j?FlowId=${flow_Id}&Version=${version_id}&UserId=${user_id}?&tenantId=${tenant_id}`;

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
    if (
      nodeArray.length != 0 ||
      deleteNodeId.length != 0 ||
      edgesArray.length != 0 ||
      deleteEdgeId.length != 0
    ) {
      const responseBody = await axios.post(apiUrl, requestBody);
    }

    console.log(requestBody);
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
