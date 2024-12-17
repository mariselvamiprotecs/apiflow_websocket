
const crypto = require("crypto");

// Configuration
const validSecretKey = "Xq47xpqfMCuW2aEsaF8LlC$si6#ErjDs"; // The correct/valid secretKey
const encryptKey = "gz34gxjLZMhnZqN4hkpT2bSK4sXe5LEY"; // AES key for encryption/decryption

// SecretKey for testing
let secretKey = "Xq47xpqfMCuW2aEsaF8LlC$si6#ErjDs"; // Test with a valid key first

// Function to validate the secretKey
function validateSecretKey(inputKey) {
  if (!inputKey) {
    console.error(" SecretKey is empty");
    return false;
  } else if (inputKey === validSecretKey) {
    console.log(" SecretKey is valid");
    return true;
  } else {
    console.error(" SecretKey is invalid");
    return false;
  }
}

// Function to encrypt data using AES-256-CBC
function encryptData(data) {
  try {
    const iv = crypto.randomBytes(16); // Generate a random 16-byte IV
    const cipher = crypto.createCipheriv(
      "aes-256-cbc",
      Buffer.from(encryptKey, "ascii"),
      iv
    );

    let encrypted = cipher.update(data, "utf8", "hex");
    encrypted += cipher.final("hex");

    const encryptedData = iv.toString("hex") + encrypted; // Combine IV and encrypted data
    console.log("🔐 Encrypted Data:", encryptedData);
    return encryptedData;
  } catch (err) {
    console.error(" Encryption Error:", err.message);
    return null;
  }
}

// Function to decrypt data using AES-256-CBC
function decryptData(encryptedData) {
  try {
    const iv = Buffer.from(encryptedData.substring(0, 32), "hex"); // Extract IV
    const encrypted = encryptedData.substring(32); // Extract encrypted data

    const decipher = crypto.createDecipheriv(
      "aes-256-cbc",
      Buffer.from(encryptKey, "ascii"),
      iv
    );

    let decrypted = decipher.update(encrypted, "hex", "utf8");
    decrypted += decipher.final("utf8");

    console.log(" Decrypted Data:", decrypted);
    return decrypted;
  } catch (err) {
    console.error(" Decryption Error:", err.message);
    return null;
  }
}

// Function to verify data integrity using HMAC
function verifyDataIntegrity(data) {
  try {
    const hmac = crypto.createHmac("sha256", secretKey);
    hmac.update(data);
    const hash = hmac.digest("hex");
    console.log("🔍 HMAC Hash:", hash);
    return hash;
  } catch (err) {
    console.error(" HMAC Error:", err.message);
    return null;
  }
}

// Function to decode JWT token
function decodeJWT(token) {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) throw new Error("Invalid JWT token");

    const payload = parts[1]; // Payload part
    const decodedPayload = Buffer.from(payload, "base64url").toString("utf8");
    const claims = JSON.parse(decodedPayload);

    console.log(" Decoded JWT Claims:", claims);
    return claims;
  } catch (err) {
    console.error(" JWT Decode Error:", err.message);
    return null;
  }
}

// Example JWT Token
const token =
  "eyJhbGciOiJBMjU2S1ciLCJlbmMiOiJBMTI4Q0JDLUhTMjU2IiwidHlwIjoiSldUIiwiY3R5IjoiSldUIn0.m0Wy83v-526qJ4anVfahZ914txXLiY8ZT-orfNC08JdFJSBKj-lCbA.PpS5t0-ti5UYbnNaPmkTcg.TXxukhJwvezfcPD2B9dTl4FxBgr_UhGB9qbsBjIK-89o-REPcfBwNr8WRpyyE4DAsei4fFG3ZzuEmFChW6Lh8JuRRm_btAs7LVVjllWwkVxr3Pqn3fZc4_FIeN9i36c-1ZJUvR4tSyifb46P--g8nPdAtWNzTGxd--KidrTB-EfH_w1MgFXNDoaNrNy8e3Gcty_rGCxtfUcVclDAz_j6I2jZ0V0O8Fv9lf3YIKnMo4g2_55wGq71fYnYCFFmcEVKwYl1o66fTdfXK3mzKbHrPQ-kci3J_fdN1ZExaDSYqJffvyWFumCnZFGsvfkdKOwmleFmnoZjjBlkD0p4EhVuwViydxC1gQcIhbMQZJ0nFZUjG-rtGoQmPZ-Ds9yycDZT5eg_hzZAF2jLCbvAIh5SC58N6NNeFFeDivWhuO63VqkIIM1XXstaXIWt4v0xiwUzDRu-p-yekhcXAImOtNieTAOLlVwt8QdgoVZqtUEfDBzxUpq9ZSAeMeDDHXP7A17PhLJTKExvmGqaW1TOJJqICoJLSNF6FvuhdNlg-2uujNFgJSA_jgejlvKAKnCFOUQasczia3c2upXoRTRyCPYbo26OFsm50ZVbAyfoL2pfTCO-PMbMHG2v97eG7R8WMQr9eyXgZ3tsNoauOMLkY1iURuu1BaKHzUxXyThmWuhvwaO3TDZ_WGc2UkI8ZsGeRmYg_RU-PStVwqpOGr45Q8027Jb47Jxpmq8E0QMOXOGKT6_0gNN7u6G6INGQQuq5z5b1sji_vTx0g6FlCIVHw2oH0x4Zcbn-_gyZzere_ZjXZL8.Vxg3yMdyUgn1oPtkWozJ0A";

// Main Logic Execution
console.log("\n🔑 ** SecretKey Validation **");
if (validateSecretKey(secretKey)) {
  console.log("\n✅ Proceeding with operations...");

  // Encrypt the token

  const encryptedToken = encryptData(token);

  // Decrypt the token
  if (encryptedToken) {
    const decryptedToken = decryptData(encryptedToken);

    // Verify the data integrity
    if (decryptedToken) {
      verifyDataIntegrity(decryptedToken);
    }

    // Decode JWT claims
    decodeJWT(token);
  }
} else {
  console.log("🚫 Operations aborted due to invalid secretKey.");
}

// Test: Empty secretKey
// console.log("\n🛑 ** Test with Empty SecretKey **");
// secretKey = "";
// validateSecretKey(secretKey);

// // Test: Invalid secretKey
// console.log("\n🛑 ** Test with Invalid SecretKey **");
// secretKey = "InvalidSecretKey123";
// validateSecretKey(secretKey);

// Test: Valid secretKey
console.log("\n ** Test with Valid SecretKey **");
secretKey = validSecretKey;
validateSecretKey(secretKey);




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
