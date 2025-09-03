import './bootstrap';
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import Navbar from './Auth/Navbar';
import Editor from "./Editor/Editor";
import Dashboard from "./Dashboard";

function Home() {
  return (
    <div>
      <h2>Welcome to CAD Project</h2>
      <Link to="/dashboard"><button>Go to Dashboard</button></Link>
      <Link to="/editor/1"><button>Open Editor (Project 1)</button></Link>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/editor/:projectId" element={<Editor />} />
      </Routes>
    </BrowserRouter>
  );
}

ReactDOM.createRoot(document.getElementById("app")).render(<App />);