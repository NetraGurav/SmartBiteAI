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

// ===============================
// SMART BACKEND URL HANDLING
// ===============================

let API_BASE =
  process.env.REACT_APP_API_URL || // If .env exists → use it
  (window.location.hostname === "localhost"
    ? "http://localhost:5000/api" // Local dev
    : "https://smartbiteai-sdb9.onrender.com/api"); // Deployed

console.log("🔥 Using API:", API_BASE);

// Axios instance
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

// ------------ SMART RETRY LOGIC ------------
const shouldRetry = (error) => {
  const status = error.response?.status;

  return (
    !error.response || // no response (Render waking up)
    status === 404 || // endpoint temporarily not available
    status === 502 || // backend restarting
    status === 503 // service unavailable
  );
};

// Handle API errors + retry
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const config = error.config;

    // initialize retry counter
    if (!config._retryCount) config._retryCount = 0;

    // IF backend is waking up → retry up to 3 times
    if (shouldRetry(error) && config._retryCount < 3) {
      config._retryCount++;

      console.warn(
        `Retrying request (${config._retryCount}/3)... backend may be waking up`
      );

      await new Promise((r) => setTimeout(r, 1000)); // wait 1 second
      return api(config); // retry request
    }

    // Normal error handling after retries fail
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
