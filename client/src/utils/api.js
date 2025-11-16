import axios from "axios";
import toast from "react-hot-toast";

// Safe toast to avoid app crash
const safeToast = {
  error: (msg) => {
    try {
      toast.error(msg);
    } catch (err) {
      console.warn("Toast suppressed:", msg);
    }
  },
};

// Backend URL (local + Netlify)
const API_BASE = process.env.REACT_APP_API_URL;

const api = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
});

// Attach token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

// Handle API errors
api.interceptors.response.use(
  (res) => res,
  (error) => {
    const status = error.response?.status;

    if (!error.response) {
      safeToast.error("Cannot connect to server.");
      return Promise.reject(error);
    }

    if (status === 401) {
      localStorage.removeItem("token");
      safeToast.error("Session expired. Please login again.");
      window.location.href = "/login";
      return;
    }

    const msg =
      error.response?.data?.message || error.message || "Something went wrong";

    safeToast.error(msg);
    return Promise.reject(error);
  }
);

export default api;
