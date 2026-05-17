import { io, Socket } from 'socket.io-client';

const REALTIME_URL = 'http://192.168.1.100:3000';

let socket: Socket | null = null;

export const connectSocket = (): Socket => {
  if (socket?.connected) return socket;

  const token = localStorage.getItem('syncflow_token');

  socket = io(REALTIME_URL, {
    transports: ['websocket'],
    auth: { token },
  });

  socket.on('connect', () => console.log('소켓 연결 성공:', socket?.id));
  socket.on('disconnect', () => console.log('소켓 연결 해제'));

  return socket;
};

export const disconnectSocket = () => {
  socket?.disconnect();
  socket = null;
};

export const getSocketId = (): string | undefined => socket?.id;
export const getSocket = (): Socket | null => socket;