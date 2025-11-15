import api from "./axiosConfig.js";

// =======================
// AUTENTICACIÓN
// =======================

// --- Login Empleado / Admin ---
export const loginEmployee = async (workId, password) => {
  try {
    const res = await api.post("/auth/login", { workId, password });
    if (res.success && res.data?.token) {
      localStorage.setItem("token", res.data.token);
    }
    return res;
  } catch (err) {
    throw err;
  }
};

// --- Login Cliente (usa sesión, no token) ---
export const loginClient = async (email, password) => {
  try {
    return await api.post("/client-auth/login", { email, password });
  } catch (err) {
    throw err;
  }
};

// --- Verificar Token (JWT) ---
export const verifyToken = async () => {
  try {
    return await api.post("/auth/verify");
  } catch {
    return { success: false };
  }
};

// --- Logout (JWT o sesión) ---
export const logout = async () => {
  try {
    await api.post("/auth/logout");
    localStorage.removeItem("token");
  } catch {
    console.warn("Logout falló o no era necesario.");
  }
};

// --- Refresh Token ---
export const refreshToken = async () => {
  try {
    const res = await api.post("/auth/refresh");
    if (res.success && res.data?.token) {
      localStorage.setItem("token", res.data.token);
    }
    return res;
  } catch (err) {
    throw err;
  }
};

// =======================
// ADMINISTRADORES
// =======================

export const getAllUsers = async () => {
  return await api.get("/admin/user/list");
};

export const createUser = async (userData) => {
  return await api.post("/admin/user", userData);
};

export const updateUser = async (userId, updates) => {
  return await api.put(`/admin/user/${userId}`, updates);
};

export const deleteUser = async (userId) => {
  return await api.delete(`/admin/user/${userId}`);
};

// =======================
// EMPLEADOS
// =======================

export const getEmployeeProfile = async () => {
  return await api.get("/employee/profile");
};

export const updateEmployeeData = async (data) => {
  return await api.put("/employee/profile", data);
};

// =======================
// CLIENTES
// =======================

export const getClientProfile = async () => {
  return await api.get("/client/profile");
};

export const updateClientProfile = async (data) => {
  return await api.put("/client/profile", data);
};

// =======================
// ÓRDENES
// =======================

export const getOrders = async () => {
  return await api.get("/orders");
};

export const createOrder = async (data) => {
  return await api.post("/orders", data);
};

export const updateOrderStatus = async (orderId, status) => {
  return await api.patch(`/orders/${orderId}`, { status });
};

// =======================
// TICKETS
// =======================

export const getTickets = async () => {
  return await api.get("/tickets");
};

export const createTicket = async (ticketData) => {
  return await api.post("/tickets", ticketData);
};

export const closeTicket = async (ticketId) => {
  return await api.patch(`/tickets/${ticketId}/close`);
};
