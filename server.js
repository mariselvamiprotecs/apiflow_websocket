const crypto = require("crypto");
const WebSocket = require("ws");
const http = require("http");
const express = require("express");
const app = express();

// Configuration
const validSecretKey = "Xq47xpqfMCuW2aEsaF8LlC$si6#ErjDs"; // Correct secret key
const encryptKey = "gz34gxjLZMhnZqN4hkpT2bSK4sXe5LEY"; // AES encryption key

// WebSocket Server
const wss = new WebSocket.Server({ noServer: true });

// Function to validate the secretKey
function validateSecretKey(inputKey) {
  if (!inputKey) {
    console.error("SecretKey is empty");
    return false;
  } else if (inputKey === validSecretKey) {
    console.log("SecretKey is valid");
    return true;
  } else {
    console.error("SecretKey is invalid");
    return false;
  }
}


// Function to handle WebSocket connection after secretKey validation
function handleConnection(ws, request) {
  // Retrieve the secretKey from the headers
  const secretKey = request.headers["sec-websocket-protocol"];

  if (validateSecretKey(secretKey)) {
    console.log("Connection established with valid secretKey.");
    ws.send("Connection successful!");
  } else {
    console.error("Connection rejected due to invalid secretKey.");
    ws.close(4000, "Invalid SecretKey");
  }
}

// HTTP server to handle WebSocket upgrade
const server = http.createServer((request, response) => {
  response.writeHead(200, { "Content-Type": "text/plain" });
  response.end("okay");
});

wss.on("connection", handleConnection);

// WebSocket upgrade logic to handle headers and validation
server.on("upgrade", (request, socket, head) => {
  const secretKey = request.headers["sec-websocket-protocol"];
  if (validateSecretKey(secretKey)) {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit("connection", ws, request);
    });
  } else {
    socket.destroy(); // Disconnect if secretKey doesn't match
  }
});

// Start server
const port = process.env.PORT || 8080;
server.listen(port, () => {
  console.log(`Server running on port ${port}`);
});




// /**
//  * @type {any}
//  */
// const WebSocket = require("ws");
// // const https = require("https");
// const http = require("http");
// const wss = new WebSocket.Server({ noServer: true });
// const setupWSConnection = require("./utils.js").setupWSConnection;

// // const host = process.env.HOST || "localhost";
// const port = process.env.PORT || 8080;

// const express = require("express");
// const app = express();

// // const host = "0.0.0.0";
// // const host = "yjs-node.onrender.com"
// // const port = 9595;

// const server = http.createServer((request, response) => {
//   response.writeHead(200, { "Content-Type": "text/plain" });
//   response.end("okay");
// });

// // const server = https.createServer((request, response) => {
// //   response.writeHead(200, { "Content-Type": "text/plain" });
// //   response.end("okay");
// // });

// wss.on("connection", setupWSConnection);
// // wss.on("connection", () => {
// //   console.log("connection Started")
// //   setupWSConnection();
// // });

// wss.on("message", (message) => {
//   console.log("Received message:", message);
// });

// server.on("upgrade", (request, socket, head) => {
//   // You may check auth of request here..
//   // See https://github.com/websockets/ws#client-authentication
//   /**
//    * @param {any} ws
//    */
//   const handleAuth = (ws) => {
//     wss.emit("connection", ws, request);
//   };
//   wss.handleUpgrade(request, socket, head, handleAuth);
// });

// // const handleAuth = (ws, request) => {
// //   const token = request.headers['sec-websocket-protocol']; // Custom header for token
// //   try {
// //     const user = jwt.verify(token, secretKey);
// //     ws.user = user; // Attach user info to WebSocket
// //     wss.emit('connection', ws, request);
// //   } catch (err) {
// //     console.error('Authentication error:', err);
// //     ws.close(); // Close connection on authentication failure
// //   }
// // };

// server.listen(port, () => {
//   console.log(`running at 'host' on port ${port}`);
// });

// // const { GoogleAuth } = require("google-auth-library");
// // const fetch = require("node-fetch");
// // const fs = require("fs");

// // // Load your service account key file


// // async function getApiProxies() {
// //   const auth = new GoogleAuth({
// //     keyFile: keyFilePath,
// //     scopes: ["https://www.googleapis.com/auth/cloud-platform"],
// //   });

// //   const client = await auth.getClient();
// //   const projectId = await auth.getProjectId();

// //   const url = `https://apigee.googleapis.com/v1/organizations/${projectId}/apis`;

// //   try {
// //     const res = await client.request({ url });
// //     const proxies = res.data.proxies;

// //     for (const proxy of proxies) {
// //       console.log(`Fetching details for proxy: ${proxy.name}`);
// //       await getApiProxyDetails(client, projectId, proxy.name);
// //     }
// //   } catch (error) {
// //     console.error("Error:", error);
// //   }
// // }

// // async function getApiProxyDetails(client, projectId, proxyName) {
// //   const url = `https://apigee.googleapis.com/v1/organizations/${projectId}/apis/${proxyName}`;

// //   try {
// //     const res = await client.request({ url });
// //     const proxyDetails = res.data;
// //     console.log(`Details of ${proxyName}:`, proxyDetails);

// //     // Fetch and display revision details
// //     for (const revision of proxyDetails.revision) {
// //       await getApiProxyRevisionDetails(client, projectId, proxyName, revision);
// //     }
// //   } catch (error) {
// //     console.error(`Error fetching details for ${proxyName}:`, error);
// //   }
// // }

// // async function getApiProxyRevisionDetails(
// //   client,
// //   projectId,
// //   proxyName,
// //   revisionId
// // ) {
// //   const url = `https://apigee.googleapis.com/v1/organizations/${projectId}/apis/${proxyName}/revisions/${revisionId}`;

// //   try {
// //     const res = await client.request({ url });
// //     const revisionDetails = res.data;
// //     console.log(`Revision ${revisionId} of ${proxyName}:`, revisionDetails);

// //     // Check if basepaths and proxies exist in revision details
// //     const basepaths = revisionDetails.basepaths || [];
// //     const proxies = revisionDetails.proxies || [];

// //     console.log(`Basepaths for ${proxyName}:`, basepaths);

// //     proxies.forEach((proxy) => {
// //       if (proxy.flows) {
// //         proxy.flows.forEach((flow) => {
// //           const methods = flow.condition
// //             ? flow.condition.match(/(GET|POST|PUT|DELETE|PATCH)/g)
// //             : [];
// //           console.log(`Flow name: ${flow.name}, Methods: ${methods}`);
// //         });
// //       } else {
// //         console.log(
// //           `No flows found for proxy: ${proxyName}, revision: ${revisionId}`
// //         );
// //       }
// //     });
// //   } catch (error) {
// //     console.error(
// //       `Error fetching revision ${revisionId} for ${proxyName}:`,
// //       error
// //     );
// //   }
// // }

// // getApiProxies();
