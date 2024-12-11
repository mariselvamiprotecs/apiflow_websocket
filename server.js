// backend.js
// const WebSocket = require('ws');
// const Y = require('yjs');
// require('y-websocket');

// Create a WebSocket server
// const wss = new WebSocket.Server({ port: 8080 });
// const WebSocket = require('ws');

// // Define the port on which the WebSocket server will listen
// const PORT = 8080;

// // Create a WebSocket server instance
// const wss = new WebSocket.Server({ port: PORT });

// // Map to store connected clients by room
// const roomClients = new Map();

// // Event listener for WebSocket connections
// wss.on('connection', function connection(ws, req) {
//   // Extract room from query parameters or use a default room
//   const urlParams = new URLSearchParams(req.url.slice(1));
//   const room = urlParams.get('room') || 'default';

//   // Add client to room
//   if (!roomClients.has(room)) {
//     roomClients.set(room, new Set());
//   }
//   roomClients.get(room).add(ws);

//   console.log(`Client connected to room ${room}`);

//   // Event listener for messages from clients
//   ws.on('message', function incoming(message) {
//     console.log(`Received message from client in room ${room}: ${message}`);

//     // Broadcast the message to all clients in the same room
//     roomClients.get(room).forEach(function each(client) {
//       // if (client !== ws && client.readyState === WebSocket.OPEN) {
//         client.send(message, { binary: false })
//       // }
//     });
//   });

//   // Event listener for WebSocket disconnections
//   ws.on('close', function close() {
//     // Remove client from room
//     if (roomClients.has(room)) {
//       roomClients.get(room).delete(ws);
//     }
//     console.log(`Client disconnected from room ${room}`);
//   });
// });

// // Log server start
// console.log(`WebSocket server is listening on port ${PORT}`);

// #!/usr/bin/env node

/**
 * @type {any}
 */
const WebSocket = require("ws");
// const https = require("https");
const http = require("http");
const wss = new WebSocket.Server({ noServer: true });
const setupWSConnection = require("./utils.js").setupWSConnection;

// const host = process.env.HOST || "localhost";
const port = process.env.PORT || 8080;

const express = require("express");
const app = express();

// const host = "0.0.0.0";
// const host = "yjs-node.onrender.com"
// const port = 9595;

const server = http.createServer((request, response) => {
  response.writeHead(200, { "Content-Type": "text/plain" });
  response.end("okay");
});

// const server = https.createServer((request, response) => {
//   response.writeHead(200, { "Content-Type": "text/plain" });
//   response.end("okay");
// });

wss.on("connection", setupWSConnection);
// wss.on("connection", () => {
//   console.log("connection Started")
//   setupWSConnection();
// });

wss.on("message", (message) => {
  console.log("Received message:", message);
});

server.on("upgrade", (request, socket, head) => {
  // You may check auth of request here..
  // See https://github.com/websockets/ws#client-authentication
  /**
   * @param {any} ws
   */
  const handleAuth = (ws) => {
    wss.emit("connection", ws, request);
  };
  wss.handleUpgrade(request, socket, head, handleAuth);
});

// const handleAuth = (ws, request) => {
//   const token = request.headers['sec-websocket-protocol']; // Custom header for token
//   try {
//     const user = jwt.verify(token, secretKey);
//     ws.user = user; // Attach user info to WebSocket
//     wss.emit('connection', ws, request);
//   } catch (err) {
//     console.error('Authentication error:', err);
//     ws.close(); // Close connection on authentication failure
//   }
// };

server.listen(port, () => {
  console.log(`running at 'host' on port ${port}`);
});

// const { GoogleAuth } = require("google-auth-library");
// const fetch = require("node-fetch");
// const fs = require("fs");

// // Load your service account key file
// const keyFilePath = "./google.json";

// async function getApiProxies() {
//   const auth = new GoogleAuth({
//     keyFile: keyFilePath,
//     scopes: ["https://www.googleapis.com/auth/cloud-platform"],
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
//     console.error("Error:", error);
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

// async function getApiProxyRevisionDetails(
//   client,
//   projectId,
//   proxyName,
//   revisionId
// ) {
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
//           const methods = flow.condition
//             ? flow.condition.match(/(GET|POST|PUT|DELETE|PATCH)/g)
//             : [];
//           console.log(`Flow name: ${flow.name}, Methods: ${methods}`);
//         });
//       } else {
//         console.log(
//           `No flows found for proxy: ${proxyName}, revision: ${revisionId}`
//         );
//       }
//     });
//   } catch (error) {
//     console.error(
//       `Error fetching revision ${revisionId} for ${proxyName}:`,
//       error
//     );
//   }
// }

// getApiProxies();
