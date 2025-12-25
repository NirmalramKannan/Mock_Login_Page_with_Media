const API_BASE = "http://localhost:4000";


export async function apiFetch(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });

  const text = await res.text();
  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { message: text };
  }

  if (!res.ok) {
    throw new Error(data?.message || "Request failed");
  }
  return data;
}


//authentication api
export const authApi = {
  register: (email, password) =>
    apiFetch("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  login: (email, password) =>
    apiFetch("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  me: () => apiFetch("/api/auth/me"),
  logout: () => apiFetch("/api/auth/logout", { method: "POST" }),
};

//media api
export const mediaApi = {
  list: () => apiFetch("/api/media"),
  favourites: () => apiFetch("/api/favourites"),
  favourite: (mediaId) => apiFetch(`/api/favourites/${mediaId}`, { method: "POST" }),
  unfavourite: (mediaId) => apiFetch(`/api/favourites/${mediaId}`, { method: "DELETE" }),
};

