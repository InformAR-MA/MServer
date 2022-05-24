import { WebSocketServer } from 'ws';
import config from '../config.json' assert {type: 'json'};

const wss = new WebSocketServer({ port: config.port });

wss.on('connection', (ws, req) => {
    console.log(`CONNECTION: ${req.socket.remoteAddress}`);

    // De connectie moet zichzelf nog identificeren.
    ws.identified = false;
    ws.id = "";

    ws.on('message', data => {
        let jsonData;

        try {
            jsonData = JSON.parse(data.toString());
        } catch {
            ws.send(JSON.stringify({type: "error", message: "Message couldn't be parsed", code: 1}));
            return;
        }

        // Als de connectie zich nog moet identificeren.
        if(!ws.identified) {
            if(jsonData.type != "identifier") {
                ws.send(JSON.stringify({type: "error", message: "Please identify yourself", code: 2}));
                return;
            }

            ws.id = jsonData.id;
            ws.identified = true;
            
            ws.send(JSON.stringify({type: "identifier", message: `Successfully identified as \"${ws.id}\"`}));
            console.log(`[${ws.id}] identified`);
            return;
        }

        console.log(`[${ws.id}] ${data}`);
    });

    ws.on('close', (code, reason) => {
        console.log(`Disconnection -> [${ws.id}] ${code}, ${reason.toString()}`);
    });
});