import axios from "axios";
import toast from "react-hot-toast";

// Safe toast wrapper to avoid crashes before React mounts
const safeToast = {
  error: (msg) => {
    if (typeof window !== "undefined" && window.__APP_READY__) {
      toast.error(msg);
    } else {
      console.warn("Toast suppressed (app not mounted yet):", msg);
    }
  },
};

// Notify app is mounted (call this inside index.js)
window.__APP_READY__ = true;

// Backend URL from env (this supports local + Netlify)
const API_BASE = process.env.REACT_APP_API_URL;

const api = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor
api.interceptors.response.use(
  (res) => {
    console.log(
      `✅ API Success: ${res.config.method?.toUpperCase()} ${res.config.url}`
    );
    return res;
  },
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
