import { useState } from "react";
import SessionTab from "../components/SessionTab";
import StudentsTab from "../components/StudentsTab";
import LogsTab from "../components/LogsTab";
import { useNavigate } from "react-router-dom";

export default function AdminDashboard({ setIsAdmin }) {
  const [activeTab, setActiveTab] = useState("sessions");
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("admin");
    setIsAdmin(false);
    navigate("/admin-login");
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <nav className="bg-gray-800 text-white flex flex-col md:flex-row md:justify-between items-start md:items-center px-6 py-4 shadow border-b border-gray-700">
        <div className="w-full md:w-auto flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Admin Dashboard</h1>
          <div className="md:hidden">
            <button onClick={handleLogout} className="bg-red-600 px-3 py-1 rounded ml-4 text-sm">
              Logout
            </button>
          </div>
        </div>

        <div className="mt-3 md:mt-0 w-full md:w-auto flex gap-3 items-center">
          <button
            onClick={() => setActiveTab("sessions")}
            className={`px-4 py-2 rounded-full text-sm font-medium transition ${activeTab === 'sessions' ? 'bg-blue-600 text-white shadow' : 'bg-gray-700 text-gray-200 hover:bg-gray-600'}`}
          >
            QR Sessions
          </button>

          <button
            onClick={() => setActiveTab("students")}
            className={`px-4 py-2 rounded-full text-sm font-medium transition ${activeTab === 'students' ? 'bg-blue-600 text-white shadow' : 'bg-gray-700 text-gray-200 hover:bg-gray-600'}`}
          >
            Students
          </button>

          <button
            onClick={() => setActiveTab("logs")}
            className={`px-4 py-2 rounded-full text-sm font-medium transition ${activeTab === 'logs' ? 'bg-blue-600 text-white shadow' : 'bg-gray-700 text-gray-200 hover:bg-gray-600'}`}
          >
            Logs
          </button>

          <div className="hidden md:block">
            <button onClick={handleLogout} className="bg-red-600 px-3 py-1 rounded text-sm ml-4">
              Logout
            </button>
          </div>
        </div>
      </nav>

      <main className="p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-700">
            {activeTab === "sessions" && <SessionTab />}
            {activeTab === "students" && <StudentsTab />}
            {activeTab === "logs" && <LogsTab />}
          </div>
        </div>
      </main>
    </div>
  );
}
