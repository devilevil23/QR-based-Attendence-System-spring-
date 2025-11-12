import React, { useState, useEffect } from "react";

export default function LogsTab() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Use the admin attendance aggregation endpoint implemented on the backend
  const API_URL = "http://localhost:8080/api/admin/attendance";

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        setLoading(true);
        const res = await fetch(API_URL, { headers: { "X-User-Id": "admin" } });
        if (!res.ok) throw new Error(`Failed to fetch logs: ${res.status}`);
        const data = await res.json();
        setLogs(data);
      } catch (err) {
        setError(err.message || "Unknown error");
      } finally {
        setLoading(false);
      }
    };

    fetchLogs();
  }, []);

  if (loading)
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="animate-pulse bg-gray-800 p-4 rounded-lg">
          <p className="text-gray-400">Loading logs...</p>
        </div>
      </div>
    );

  if (error)
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="bg-red-900/20 border border-red-700 text-red-300 rounded-xl p-4">
          <strong className="block text-white mb-1">Error</strong>
          <p>{error}</p>
        </div>
      </div>
    );

  return (
    <div className="p-6 max-w-4xl mx-auto text-white">
      <h2 className="text-2xl font-semibold mb-4">Attendance Logs</h2>
      {logs.length === 0 ? (
        <div className="text-gray-300 p-4 border rounded-xl bg-gray-800">No logs available.</div>
      ) : (
        <ul className="space-y-3">
          {logs.map((log, i) => (
            <li
              key={i}
              className="bg-gray-800 p-3 rounded-lg shadow-sm border border-gray-700 flex flex-col md:flex-row md:justify-between md:items-center"
            >
              <div className="mb-2 md:mb-0">
                <div className="text-sm text-gray-300">Session</div>
                <div className="font-medium text-white">{log.sessionName || log.session || log.sessionToken}</div>
              </div>
              <div className="mb-2 md:mb-0">
                <div className="text-sm text-gray-300">User</div>
                <div className="font-mono text-sm text-white">{log.userId || log.user || "-"}</div>
              </div>
              <div>
                <div className="text-sm text-gray-300">Checked In</div>
                <div className="text-sm text-gray-400">
                  {log.checkInTime ? new Date(log.checkInTime).toLocaleString() : "-"}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
