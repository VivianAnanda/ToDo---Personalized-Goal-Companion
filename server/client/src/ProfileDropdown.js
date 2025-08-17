import React, { useState } from "react";
import { FaUserCircle } from "react-icons/fa";

function ProfileDropdown({ onLogout }) {
  const [open, setOpen] = useState(false);

  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      <button
        onClick={() => setOpen(!open)}
        style={{ background: "none", border: "none", cursor: "pointer", fontSize: "24px" }}
      >
        <span>👤</span>
      </button>
      {open && (
        <div
          style={{
            position: "absolute",
            right: 0,
            top: "100%",
            backgroundColor: "white",
            border: "1px solid #ccc",
            borderRadius: "5px",
            boxShadow: "0 4px 8px rgba(0, 0, 0, 0.1)",
            padding: "10px",
            zIndex: 10,
          }}
        >
          <button
            onClick={onLogout}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: "14px",
              padding: "5px 10px",
            }}
          >
            🔓 Logout
          </button>
        </div>
      )}
    </div>
  );
}

export default ProfileDropdown;
