import { useEffect, useRef, useState } from "react";
import { authApi, mediaApi } from "./api";
import "./styles.css";

function AuthPopup({ mode, onSuccess, onSwitchMode, onClose }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  async function submit(e) {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      if (mode === "register") {
        await authApi.register(email, password);
      } else {
        await authApi.login(email, password);
      }
      const me = await authApi.me();
      onSuccess(me.user);
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="popupCard">
      <div className="popupHeader">
        <h2 style={{ margin: 0 }}>
          {mode === "register" ? "Create account" : "Login"}
        </h2>
        <button className="closeBtn" onClick={onClose} aria-label="Close">
          ×
        </button>
      </div>

      <form onSubmit={submit} className="form">
        <label>
          Email
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
        </label>

        <label>
          Password
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={mode === "register" ? "new-password" : "current-password"}
          />
        </label>

        {err && <div className="error">{err}</div>}

        <button className="btn" disabled={loading}>
          {loading ? "..." : mode === "register" ? "Register" : "Login"}
        </button>
      </form>

      <div className="muted">
        {mode === "register" ? "Already have an account?" : "Need an account?"}{" "}
        <button className="link" type="button" onClick={onSwitchMode}>
          {mode === "register" ? "Login" : "Register"}
        </button>
      </div>
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [mode, setMode] = useState("login");
  const [loadingMe, setLoadingMe] = useState(true);

  const [authOpen, setAuthOpen] = useState(false);
  const authAreaRef = useRef(null);

  const [tab, setTab] = useState("media");
  const [media, setMedia] = useState([]);
  const [favourites, setFavourites] = useState([]);

  const favIdSet = new Set(favourites.map((x) => x.id));

  useEffect(() => {
    (async () => {
      try {
        const m = await mediaApi.list();
        setMedia(m.media || []);
      } catch (e) {
        console.error(e);
      }
    })();
  }, []);

  useEffect(() => {
    if (!user) {
      setFavourites([]);
      return;
    }
    (async () => {
      try {
        const f = await mediaApi.favourites();
        setFavourites(f.favourites || []);
      } catch (e) {
        console.error(e);
      }
    })();
  }, [user]);


  useEffect(() => {
    (async () => {
      try {
        const me = await authApi.me();
        setUser(me.user);
      } catch {
        setUser(null);
      } finally {
        setLoadingMe(false);
      }
    })();
  }, []);

  useEffect(() => {
    function onDocMouseDown(e) {
      if (!authOpen) return;
      if (authAreaRef.current && !authAreaRef.current.contains(e.target)) {
        setAuthOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, [authOpen]);

  async function logout() {
    await authApi.logout();
    setUser(null);
    setMode("login");
    setAuthOpen(false);
  }

  function handleAuthSuccess(u) {
    setUser(u);
    setAuthOpen(false);
  }

  async function toggleFavourite(mediaId) {
    if (!user) return; // optionally open login popup here
    const isFav = favIdSet.has(mediaId);

    // Optimistic update
    if (isFav) {
      setFavourites((prev) => prev.filter((x) => x.id !== mediaId));
      await mediaApi.unfavourite(mediaId);
    } else {
      const item = media.find((x) => x.id === mediaId);
      if (item) setFavourites((prev) => [item, ...prev]);
      await mediaApi.favourite(mediaId);
    }
  }


  if (loadingMe) return <div className="page">Loading...</div>;

  return (
    <div className="page">
      <header className="header">
        <h1 className="headerTitle">Flixnet</h1>

        <div className="authArea" ref={authAreaRef}>
          {!user ? (
            <>
              <button
                className="pill pillPrimary"
                onClick={() => setAuthOpen((v) => !v)}
              >
                Login
              </button>

              {authOpen && (
                <AuthPopup
                  mode={mode}
                  onClose={() => setAuthOpen(false)}
                  onSuccess={handleAuthSuccess}
                  onSwitchMode={() =>
                    setMode((m) => (m === "login" ? "register" : "login"))
                  }
                />
              )}
            </>
          ) : (
            <>
              <span className="email">{user.email}</span>
              <button className="pill" onClick={logout}>
                Logout
              </button>
            </>
          )}
        </div>
      </header>
        <div className="content">
          <div className="tabs">
            <button
              className={`tabBtn ${tab === "media" ? "tabBtnActive" : ""}`}
              onClick={() => setTab("media")}
            >
              Media
            </button>

            <button
              className={`tabBtn ${tab === "favourites" ? "tabBtnActive" : ""}`}
              onClick={() => setTab("favourites")}
              disabled={!user}
              title={!user ? "Login to view favourites" : ""}
            >
              Favourites {user ? `(${favourites.length})` : ""}
            </button>
          </div>

          <div className="grid">
            {(tab === "media" ? media : favourites).map((item) => (
              <div className="mediaCard" key={item.id}>
                <img
                  className="mediaThumb"
                  src={`http://localhost:4000${item.file_path}`}
                  alt={item.title}
                  loading="lazy"
                />
                <div className="mediaRow">
                  <div className="mediaTitle" title={item.title}>
                    {item.title}
                  </div>

                  {user && (
                    <button className="favBtn" onClick={() => toggleFavourite(item.id)}>
                      {favIdSet.has(item.id) ? "⭐" : "☆"}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {tab === "favourites" && user && favourites.length === 0 && (
            <p className="muted" style={{ marginTop: 14 }}>
              No favourites yet — go to Media and click ☆ to favourite something.
            </p>
          )}
        </div>
    </div>
  );
}
