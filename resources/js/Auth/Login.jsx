import { useState } from "react";

export default function Login() {
  const [form, setForm] = useState({ email: "", password: "" });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const res = await fetch("/login", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify(form),
    });

    const data = await res.json();
    alert(data.message);
  };

  return (
    <form onSubmit={handleSubmit}>
      <h2>Login</h2>
      <input
        type="email"
        name="email"
        placeholder="Email"
        required
        value={form.email}
        onChange={handleChange}
      />
      <input
        type="password"
        name="password"
        placeholder="Password"
        required
        minLength={6}
        value={form.password}
        onChange={handleChange}
      />
      <button type="submit">Login</button>
    </form>
  );
}
