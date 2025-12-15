import axios from 'axios';

// Create an Axios instance
const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// REQUEST INTERCEPTOR (Before Request is Sent)
api.interceptors.request.use(
  (config) => {
    // Only add token in browser environment
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('accessToken');
      
      // If token exists, add it to the header.
      // Otherwise, do nothing and let the request go as "Anonymous".
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// RESPONSE INTERCEPTOR (After Response is Received)
api.interceptors.response.use(
  (response) => response, // If successful, continue as is

  async (error) => {
    const originalRequest = error.config;

    // If error is 401 (Unauthorized) AND we haven't retried before
    // It means this endpoint REQUIRES a token but ours is invalid.
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // Token refresh request
        const { data } = await axios.post('/api/auth/refresh');

        // Save the new token
        localStorage.setItem('accessToken', data.accessToken);
        
        // Retry the original request with the new token
        originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
        return api(originalRequest);

      } catch (refreshError) {
        // If refresh fails, clean up
        localStorage.removeItem('accessToken');
        // Redirect user to login page
        // window.location.href = '/login'; 
        return Promise.reject(refreshError);
      }
    }
    
    return Promise.reject(error);
  }
);

export default api;