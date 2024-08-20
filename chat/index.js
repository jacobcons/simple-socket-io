import express from 'express';
import { createServer } from 'node:http';
import { Server } from 'socket.io';
import morgan from 'morgan';
import Database from 'better-sqlite3';

const app = express();
const server = createServer(app);
const io = new Server(server, {
  connectionStateRecovery: {},
});
const db = Database('chat.db');
db.pragma('journal_mode = WAL');

await db.exec(`
  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_offset TEXT UNIQUE,
    content TEXT
  )
`);

app.use(morgan('tiny'));
app.use(express.static('public'));

io.on('connection', (socket) => {
  console.log('a user connected');
  socket.on('chat-message', (msg, clientOffset, callback) => {
    let lastInsertRowid;
    try {
      lastInsertRowid = db
        .prepare('INSERT INTO messages(content, client_offset) VALUES (?, ?)')
        .run(msg, clientOffset).lastInsertRowid;
    } catch (e) {
      if (e.errono === 19) {
        callback();
      }
      return;
    }
    io.emit('chat-message', msg, lastInsertRowid);
    callback();
  });
  if (!socket.recovered) {
    const messages = db
      .prepare('SELECT id, content FROM messages WHERE id > ?')
      .all(socket.handshake.auth.serverOffset || 0);
    for (const { id, content } of messages) {
      socket.emit('chat-message', content, id);
    }
  }
});

server.listen(3000, () => {
  console.log('server running at http://localhost:3000');
});
