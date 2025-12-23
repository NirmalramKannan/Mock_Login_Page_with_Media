import { useEffect, useRef, useState } from "react";
import { authApi } from "./api";
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
    </div>
  );
}
