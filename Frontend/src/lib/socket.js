import { io } from "socket.io-client";
const BASE = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";

/*
We do not auto-connect here. Connect after login or when Chat mounts (so cookie present).
*/
export const socket = io(BASE, {
  autoConnect: false,
  withCredentials: true,
});
