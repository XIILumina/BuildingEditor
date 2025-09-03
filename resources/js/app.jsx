import './bootstrap';
import React from "react";
import ReactDOM from "react-dom/client";

function App() {
  return (
    <div className="p-6 text-center text-xl text-blue-600">
      🚀 Hello from React inside Laravel!
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("app")).render(<App />);