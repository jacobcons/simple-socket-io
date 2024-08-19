import express from 'express';
import { createServer } from 'node:http';
import { Server } from 'socket.io';
import morgan from 'morgan';

const app = express();
const server = createServer(app);
const io = new Server(server);

app.use(morgan('tiny'));
app.use(express.static('public'));

io.on('connection', (socket) => {
  console.log('a user connected');
  socket.on('chat message', (msg) => {
    console.log('message: ' + msg);
  });
});

server.listen(3000, () => {
  console.log('server running at http://localhost:3000');
});
