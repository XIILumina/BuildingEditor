import { useState } from "react";

export default function Register() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    password_confirmation: "",
  });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const res = await fetch("/register", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify(form),
    });

    const data = await res.json();
    alert(data.message);
  };

  return (
    <form onSubmit={handleSubmit}>
      <h2>Register</h2>
      <input
        type="text"
        name="name"
        placeholder="Full Name"
        required
        value={form.name}
        onChange={handleChange}
      />
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
      <input
        type="password"
        name="password_confirmation"
        placeholder="Confirm Password"
        required
        value={form.password_confirmation}
        onChange={handleChange}
      />
      <button type="submit">Register</button>
    </form>
  );
}
