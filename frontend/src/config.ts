// Dynamically determine the API URL based on the current window location
// This assumes the backend is running on port 5000 on the same host
export const API_BASE_URL = `http://${window.location.hostname}:5000`;
