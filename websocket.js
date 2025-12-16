//'import webSockets from "node:webSockets";'

//Map Data Structure to Store Clients
const clients = new Map();
let nextId = 1;

function handler(request) {
  if (request.headers.get("upgrade") !== "websocket") {
    // Regular HTTP request
    return new Response("Hello from Deno HTTP server!", { status: 200 });
  }

  // Upgrade to WebSocket request
  const { socket, response } = Deno.upgradeWebSocket(request);
  //Increases the variable using to track
  //number of clients
  //then assigns a number to a client
  //closure MaGic!!
  const clientId = nextId++;

  //Entry into Map
  //set(key,value)
  clients.set(clientId, { ws: socket, role: "unknown" });
  console.log(`Client connected: ${clientId}`);

  // Set WebSocket events Callbacks
  socket.onopen = () => {
    console.log("WebSocket connection OPEN");
    socket.send(
      JSON.stringify({
        type: "welcome",
        clientId,
        message: "send {role: 'unreal'} or {role:'simulator'}",
      })
    );
  };

  //Received message from client
  socket.onmessage = (event) => {
    let data;

    try {
      data = JSON.parse(event.data);
    } catch {
      console.log("Invalid JSON", event.data);
      return;
    }

    //set Role for Client
    if (data.role === "unreal" || data.role === "simulator") {
      clients.get(clientId).role = data.role;
      console.log(`Client ${clientId} set role: ${data.role}`);
    }

    //ROUTING LOGIC
    //If data comes from simulator
    if (clients.get(clientId).role === "simulator") {
      for (const [id, client] of clients) {
        //send to all unreal clients
        if (client.role === "unreal") {
          client.ws.send(JSON.stringify(data));
          console.log("Forwarded simulator -> unreal:", data);
        }
      }
    }

    //if data comes from unreal
    if (clients.get(clientId).role === "unreal") {
      for (const [id, client] of clients) {
        // send to all simulators
        if (client.role === "simulator") {
          client.ws.send(JSON.stringify(data));
          console.log("Forwarded unreal -> simulator:", data);
        }
      }
    }
  };

  //Handle socket close
  socket.onclose = () => {
    //delete any clients that close connection
    clients.delete(clientId);
    console.log(`DISCONNECTED: ${clientId}`);
  };

  //Handle socket error
  socket.onerror = (err) => {
    console.error(`Client ${clientId} error:`, err);
    console.error("WebSocket error:", err);
  };

  return response;
}

Deno.serve({ port: 80, handler });
