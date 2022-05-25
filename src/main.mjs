import { WebSocketServer } from 'ws';
import config from '../config.json' assert {type: 'json'};

const wss = new WebSocketServer({ port: config.port });

wss.on('connection', (ws, req) => {
    // De connectie moet zichzelf nog identificeren.
    ws.identified = false;
    ws.id = "";

    ws.on('message', data => {
        let timestamp = new Date().getTime();

        let jsonData;

        try {
            jsonData = JSON.parse(data.toString());
        } catch {
            ws.send(stringify({type: "response", success: false, message: "Message couldn't be parsed", code: 400, timestamp: timestamp}));
            return;
        }

        if(!jsonData.hasOwnProperty('type')) {
            ws.send(stringify({type: "response", success: false, message: `Missing property "type"`, code: 400, timestamp: timestamp}));
            return;
        }

        switch (jsonData.type) {
            case "identify":
                if(ws.identified) {
                    ws.send(stringify({type: "response", success: false, message: `Already identified as "${ws.id}"`, code: 409, timestamp: timestamp}));
                    return;
                }

                if(!jsonData.hasOwnProperty('id')) {
                    ws.send(stringify({type: "response", success: false, message: `Missing property "id"`, code: 400, timestamp: timestamp}));
                    return;
                }

                ws.id = jsonData.id;
                ws.identified = true

                ws.send(stringify({type: "response", success: true, message: `Successfully identified as "${ws.id}"`, code: 201, timestamp: timestamp}));
                break;
        
            case "message":
                if(!ws.identified) {
                    ws.send(stringify({type: "response", success: false, message: `Not identified`, code: 401, timestamp: timestamp}));
                    return;
                }

                if(!jsonData.hasOwnProperty('recipient')) {
                    ws.send(stringify({type: "response", success: false, message: `Missing property "recipient"`, code: 400, timestamp: timestamp}));
                    return;
                }

                if(!jsonData.hasOwnProperty('data')) {
                    ws.send(stringify({type: "response", success: false, message: `Missing property "data"`, code: 400, timestamp: timestamp}));
                    return
                }

                let success = false;

                wss.clients.forEach(client => {
                    if(client.id == jsonData.recipient) {
                        client.send(stringify({type: "message", data: jsonData.data, sender: ws.id, timestamp: timestamp}));
                        success = true;
                        return;
                    }
                });

                if(!success) {
                    ws.send(stringify({type: "response", success: false, message: "Recipient not found", code: 404, timestamp: timestamp}));
                } else {
                    ws.send(stringify({type: "response", success: true, message: "Succesfully send message", code: 200, timestamp: timestamp}));
                }
                break;
                
            // case "broadcast":

            //     break;

            default:
                ws.send(stringify({type: "response", success: false, message: "Type not found", code: 404, timestamp: timestamp}));
                break;
        }
    });

    ws.on('close', (code, reason) => {
        console.log(`Disconnection -> [${ws.id}] ${code}, ${reason.toString()}`);

    });
});

function stringify(json) {
    return JSON.stringify(json);
}