import { WebSocketServer } from 'ws';
import https from 'https';
import fs from 'fs';
import config from '../config.json' assert {type: 'json'};

const server = https.createServer({
    key: fs.readFileSync(config.ssl.key, 'utf8'),
    cert: fs.readFileSync(config.ssl.cert, 'utf8')
});

server.listen(config.port);

const wss = new WebSocketServer({ server: server });

let wsCount = 0;

wss.on('connection', (ws, req) => {
    wsCount++;
    ws.uid = wsCount;

    ws.identified = false;
    ws.id = '';

    console.log(`[${ws.uid}] Connected.`);

    ws.on('message', data => {
        console.log(`[${ws.uid}] Received: '${data.toString()}'`);

        let jsonData;

        try {
            jsonData = JSON.parse(data.toString());
        } catch {
            send(ws, {type: "error", reason: "Message couldn't be parsed", code: 101});
            return;
        }

        if(!hasProperty(ws, jsonData, 'type')) return;

        switch (jsonData.type) {
            case "identify":
                if(ws.identified) {
                    send(ws, {type: "error", reason: `Already identified as "${ws.id}"`, code: 105});
                    return;
                }

                if(!hasProperty(ws, jsonData, 'id')) return; 

                ws.id = jsonData.id;
                ws.identified = true

                send(ws, {type: "identify", id: ws.id});
                break;
        
            case "message":
                if(!ws.identified) {
                    send(ws, {type: "error", reason: `Not identified`, code: 104});
                    return;
                }

                if(!hasProperty(ws, jsonData, 'recipient') || !hasProperty(ws, jsonData, 'data')) return;

                let success = false;

                wss.clients.forEach(client => {
                    if(client.id == jsonData.recipient) {
                        send(client , {type: "message", data: jsonData.data, sender: ws.id});
                        success = true;
                        return;
                    }
                });

                if(!success) send(ws, {type: "error", reason: "Recipient not found", code: 106});
                break;

            default:
                send(ws, {type: "error", reason: "Type not found", code: 203});
                break;
        }
    });

    ws.on('close', (code, reason) => {
        console.log(`[${ws.uid}] Disconnected.`);
    });
});

function hasProperty(ws, json, property) {
    if(!json.hasOwnProperty(property)) {
        console.log(`[${ws.uid}] missing property '${property}'`);
        send(ws, {type: "error", reason: `Missing property '${property}'`, code: 102});
        return false;
    }

    return true;
}

function send(ws, message) {
    let data = JSON.stringify(message);

    console.log(`[${ws.uid}] Send: '${data}'`);
    ws.send(data);
}