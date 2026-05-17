import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { authApi } from "../api/auth";

const LoginPage = () => {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res =
        mode === "login"
          ? await authApi.login(email, password)
          : await authApi.signup(email, password, name);

      localStorage.setItem("syncflow_token", res.accessToken);
      localStorage.setItem(
        "syncflow_user",
        JSON.stringify({ email: res.email, name: res.name }),
      );
      navigate("/boards");
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setError(e.response?.data?.message ?? "오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.logo}>SyncFlow</h1>
      <p style={styles.subtitle}>{mode === "login" ? "로그인" : "회원가입"}</p>

      <form onSubmit={handleSubmit} style={styles.form}>
        {mode === "signup" && (
          <input
            style={styles.input}
            placeholder="이름"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        )}
        <input
          style={styles.input}
          type="email"
          placeholder="이메일"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          style={styles.input}
          type="password"
          placeholder="비밀번호 (8자 이상)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && <p style={styles.error}>{error}</p>}
        <button style={styles.button} type="submit" disabled={loading}>
          {loading ? "처리 중..." : mode === "login" ? "로그인" : "회원가입"}
        </button>
      </form>

      <button
        style={styles.toggle}
        onClick={() => setMode(mode === "login" ? "signup" : "login")}
      >
        {mode === "login"
          ? "계정이 없으신가요? 회원가입"
          : "이미 계정이 있으신가요? 로그인"}
      </button>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "100vh",
    backgroundColor: "#fff",
    padding: 24,
  },
  logo: { fontSize: 40, fontWeight: "bold", color: "#4C6EF5", marginBottom: 8 },
  subtitle: { fontSize: 16, color: "#888", marginBottom: 32 },
  form: {
    display: "flex",
    flexDirection: "column",
    width: "100%",
    maxWidth: 400,
    gap: 14,
  },
  input: {
    border: "1px solid #ddd",
    padding: "14px 16px",
    borderRadius: 10,
    fontSize: 15,
    outline: "none",
  },
  button: {
    backgroundColor: "#4C6EF5",
    color: "#fff",
    border: "none",
    padding: "14px",
    borderRadius: 10,
    fontSize: 16,
    fontWeight: "bold",
    cursor: "pointer",
  },
  error: { color: "#e03131", fontSize: 14, margin: 0 },
  toggle: {
    marginTop: 20,
    background: "none",
    border: "none",
    color: "#4C6EF5",
    fontSize: 14,
    cursor: "pointer",
  },
};

export default LoginPage;
