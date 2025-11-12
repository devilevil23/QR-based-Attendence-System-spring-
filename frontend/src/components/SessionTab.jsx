import React, { useState, useEffect } from "react";


// --- Configuration ---
const API_BASE_URL = "http://localhost:8080/api/admin";
const ADMIN_USER_ID = "admin_user_001";



// --- Utility Functions (Self-Contained) ---
/**
 * Executes a fetch request with exponential backoff and retries, 
 * but only retries GET requests to ensure idempotent (non-duplicate) writes.
 */
const fetchWithRetry = async (url, options = {}, retries = 3) => {
    const method = options.method || 'GET';
    
    // ✅ FIX: Only allow retries for safe (GET) methods. 
    // Limit max attempts to 1 for POST, PUT, DELETE to prevent duplicate write operations.
    const maxAttempts = method === 'GET' ? retries : 1; 

    for (let i = 0; i < maxAttempts; i++) {
        try {
            const response = await fetch(url, options);

            if (!response.ok) {
                const errorBody = await response.text();
                let errorMessage = `Server error (Status: ${response.status})`;
                try {
                    const jsonError = JSON.parse(errorBody);
                    errorMessage = jsonError.message || errorMessage;
                } catch {
                    errorMessage = errorBody.substring(0, 100) || errorMessage;
                }
                throw new Error(errorMessage);
            }
            const ct = response.headers.get("content-type") || "";
            // If SVG returned as text, return text otherwise parse json
            if (ct.includes("application/json")) return await response.json();
            return await response.text();
        } catch (error) {
            if (i === maxAttempts - 1) throw error; // Throw if no more attempts are allowed
            
            // Delay only if it's a GET request and we have retries left
            if (method === 'GET') {
                const delay = Math.pow(2, i) * 1000;
                await new Promise((res) => setTimeout(res, delay));
            }
        }
    }
};

/**
 * Toast/Message Component for User Feedback
 */
const ToastMessage = ({ message, type, onClose }) => {
    useEffect(() => {
        const timer = setTimeout(() => onClose(), 5000);
        return () => clearTimeout(timer);
    }, [onClose]);
    const bgColor =
        type === "success" ? "bg-green-500" : type === "error" ? "bg-red-500" : "bg-blue-500";
    return (
        <div
            className={`fixed top-4 right-4 ${bgColor} text-white p-4 rounded-xl shadow-xl z-50 transition-transform duration-300 ease-out`}
        >
            <p className="font-semibold">{message}</p>
            <button
                onClick={onClose}
                className="absolute top-1 right-2 text-white opacity-70 hover:opacity-100"
            >
                &times;
            </button>
        </div>
    );
};

// --- QR Code Component (robust) ---
// Strategy:
// 1) If window.qrcodegen exists, use it and render inline SVG from it.
// 2) Otherwise request an SVG from api.qrserver.com and inject it inline so we can serialize/download it.
const QRCodeSVG = ({ value, size = 256, margin = 2 }) => {
    const [svgString, setSvgString] = useState(null);
    const [error, setError] = useState(null);

    useEffect(() => {
        let mounted = true;
        const generate = async () => {
            if (!value) {
                setSvgString(null);
                return;
            }

            // If qrcodegen is available, use it
            if (typeof window !== "undefined" && window.qrcodegen && window.qrcodegen.QrCode) {
                try {
                    const qr = window.qrcodegen.QrCode.encodeText(value, window.qrcodegen.QrCode.Ecc.MEDIUM);
                    // qr.toSvgString exists in many qrcodegen builds; fallback to manual path if not
                    let svg = "";
                    if (typeof qr.toSvgString === "function") {
                        svg = qr.toSvgString(margin);
                        // Ensure the svg has an id we can query later
                        svg = svg.replace("<svg ", `<svg id="qr-svg-export" width="${size}" height="${size}" `);
                    } else {
                        // crude fallback: use toSvg (some versions) or build a minimal svg
                        const raw = qr.toString(); // may be a text matrix representation
                        svg = `<svg id="qr-svg-export" width="${size}" height="${size}" viewBox="0 0 ${qr.size} ${qr.size}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="white" /><g>`;
                        // try to read modules
                        if (qr.getModule) {
                            for (let y = 0; y < qr.size; y++) {
                                for (let x = 0; x < qr.size; x++) {
                                    if (qr.getModule(x, y)) {
                                        svg += `<rect x="${x}" y="${y}" width="1" height="1" />`;
                                    }
                                }
                            }
                        }
                        svg += `</g></svg>`;
                    }
                    if (mounted) {
                        setSvgString(svg);
                        setError(null);
                    }
                    return;
                } catch (e) {
                    console.error("qrcodegen render failed", e);
                    // fall through to using external API
                }
            }

            // Fallback: fetch SVG from api.qrserver.com (public free service)
            try {
                const apiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&margin=${margin}&data=${encodeURIComponent(
                    value
                )}&format=svg`;
                const svg = await fetchWithRetry(apiUrl, { method: "GET" }, 3);
                if (!svg || typeof svg !== "string") throw new Error("Invalid SVG response");
                // Ensure the root svg has an id for download/selection
                let fixed = svg;
                if (!/id=("|')qr-svg-export("|')/.test(fixed) && !/id=qr-svg-export/.test(fixed)) {
                    fixed = fixed.replace("<svg", `<svg id="qr-svg-export" width="${size}" height="${size}"`);
                } else {
                    // ensure width/height exist
                    fixed = fixed.replace(/<svg([^>]*)>/, (m, g1) => {
                        if (!/width=/.test(g1)) g1 += ` width="${size}"`;
                        if (!/height=/.test(g1)) g1 += ` height="${size}"`;
                        return `<svg${g1}>`;
                    });
                }
                if (mounted) {
                    setSvgString(fixed);
                    setError(null);
                }
            } catch (e) {
                console.error("Failed to fetch fallback QR SVG:", e);
                if (mounted) {
                    setError("QR generation failed");
                    setSvgString(null);
                }
            }
        };

        generate();
        return () => {
            mounted = false;
        };
    }, [value, size, margin]);

    if (error) {
        return (
            <div
                style={{ width: size, height: size }}
                className="flex items-center justify-center bg-red-100 border border-red-300 rounded-xl"
            >
                <p className="text-red-600 text-sm p-2 text-center">QR Gen Failed</p>
            </div>
        );
    }

    if (!svgString) {
        return (
            <div
                style={{ width: size, height: size }}
                className="flex items-center justify-center bg-gray-50 border border-gray-200 rounded-xl"
            >
                <p className="text-gray-500 text-sm p-2">Generating QR…</p>
            </div>
        );
    }

    // Render inline SVG using dangerouslySetInnerHTML so download/serialization works
    return (
        <div
            style={{ width: size, height: size }}
            dangerouslySetInnerHTML={{ __html: svgString }}
            aria-hidden="true"
        />
    );
};
// --- End Utility Functions ---


export default function SessionTab() {
    const [sessionTitle, setSessionTitle] = useState("");
    const [selectedClasses, setSelectedClasses] = useState([]);
    const [sessions, setSessions] = useState([]);
    const [showQRModal, setShowQRModal] = useState(false);
    const [generatedSession, setGeneratedSession] = useState(null);
    const [minutes, setMinutes] = useState(5);
    const [message, setMessage] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isQrCodeGenLoaded] = useState(typeof window !== "undefined" && typeof window.qrcodegen !== "undefined");
    const [checkInRecords, setCheckInRecords] = useState([]);
    const [isRecordsLoading, setIsRecordsLoading] = useState(false);

    const classOptions = ["A", "B", "C", "All"];

    const showToast = (msg, type) => {
        setMessage({ text: msg, type });
    };

    const clearToast = () => setMessage(null);


    useEffect(() => {
        const loadSessions = async () => {
            try {
                const sessionsData = await fetchWithRetry(`${API_BASE_URL}/sessions`, {
                    method: "GET",
                    headers: {
                        "X-User-Id": ADMIN_USER_ID,
                    },
                });

                // Convert backend data to frontend format
                const formatted = sessionsData.map((s) => {
                    // Use 'expiresAt' from backend response
                    const expiresAt = new Date(s.expiresAt); 
                    // Calculate time left in seconds
                    const timeLeft = Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000));
                    
                    // The backend token is in s.sessionToken, but the previous structure used s.id for session data
                    // I will assume s.token is returned from the backend based on previous context, and fallback to s.sessionToken if needed.
                    const token = s.sessionToken || s.id; 

                    return {
                        id: token,
                        title: s.sessionName,
                        eligibleClasses: s.section,
                        createdAt: new Date().toLocaleString(),
                        qrValue: token,
                        // The duration is not strictly needed on the front end if we use timeLeft/expiresAt
                        duration: 0, 
                        timeLeft,
                        status: timeLeft > 0 ? "Active" : "Expired",
                    };
                });

                setSessions(formatted);
            } catch (err) {
                console.error("Failed to load sessions:", err);
                showToast("Failed to load sessions from server", "error");
            }
        };

        loadSessions();
    }, []);
    // Countdown effect for sessions
    useEffect(() => {
        const interval = setInterval(() => {
            setSessions((prevSessions) =>
                prevSessions.map((s) => {
                    if (s.timeLeft > 0) {
                        return { ...s, timeLeft: s.timeLeft - 1 };
                    } else {
                        // Mark as expired if time runs out
                        return { ...s, timeLeft: 0, status: "Expired" };
                    }
                })
            );
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    const formatTime = (seconds) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
    };

    const toggleClass = (cls) => {
        if (selectedClasses.includes(cls)) {
            setSelectedClasses(selectedClasses.filter((c) => c !== cls));
        } else {
            if (cls === "All") setSelectedClasses(["All"]);
            else setSelectedClasses(selectedClasses.filter((c) => c !== "All").concat(cls));
        }
    };

    // --- API Functions ---
    const handleCreateSession = async () => {
        if (!sessionTitle || selectedClasses.length === 0) {
            return showToast("Please fill the session title and select a class/section.", "error");
        }

        const section = selectedClasses[0] === "All" ? "All" : selectedClasses.join(",");
        setIsLoading(true);

        try {
            const tokenResponse = await fetchWithRetry(
                `${API_BASE_URL}/generate-token?section=${encodeURIComponent(section)}&sessionName=${encodeURIComponent(sessionTitle)}`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "X-User-Id": ADMIN_USER_ID,
                    },
                }
            );

            const expiresInMinutes = tokenResponse.expiresInMinutes || 5;
            const token = tokenResponse.token;
            const timeLeftSeconds = expiresInMinutes * 60;

            const newSession = {
                id: token,
                title: sessionTitle,
                eligibleClasses: section,
                createdAt: new Date().toLocaleString(),
                qrValue: token,
                duration: timeLeftSeconds, 
                timeLeft: timeLeftSeconds,
                status: "Active",
            };

            // Use functional update to ensure we always append to the latest state
            setSessions((prev) => [newSession, ...prev]);
            setGeneratedSession(newSession);
            setShowQRModal(true);
            showToast(`Session '${sessionTitle}' created successfully!`, "success");

            setSessionTitle("");
            setSelectedClasses([]);
        } catch (err) {
            console.error("Error creating session:", err);
            showToast("Error creating session.", "error");
        } finally {
            setIsLoading(false);
        }
    };


    const fetchSessionRecords = async (token) => {
        setIsRecordsLoading(true);
        setCheckInRecords([]);
        try {
            const records = await fetchWithRetry(`${API_BASE_URL}/attendance/${token}`, {
                method: "GET",
                headers: {
                    "X-User-Id": ADMIN_USER_ID,
                },
            });
            // Expecting JSON array; if fetchWithRetry returned text, try parse
            let parsed = records;
            if (typeof records === "string") {
                try {
                    parsed = JSON.parse(records);
                } catch {
                    parsed = [];
                }
            }
            setCheckInRecords(Array.isArray(parsed) ? parsed : []);
        } catch (error) {
            console.error("Failed to fetch session records:", error);
            showToast(`Error fetching records: ${error.message}`, "error");
        } finally {
            setIsRecordsLoading(false);
        }
    };

    const openQRModalWithRecords = (session) => {
        setGeneratedSession(session);
        setShowQRModal(true);
        fetchSessionRecords(session.qrValue);
    };

    const handleDownloadQR = async () => {
        const svgElement = document.getElementById("qr-svg-export");
        if (!svgElement) {
            // If the inline SVG wasn't added with that id, try to find first svg inside the modal
            const modal = document.querySelector('[id^="qr-svg-export"], [id="qr-svg-export"]') || document.querySelector(".qr-modal-inline svg");
            if (modal) {
                // fallback to serializing that svg
                try {
                    const serializer = new XMLSerializer();
                    const source = serializer.serializeToString(modal);
                    const blob = new Blob([source], { type: "image/svg+xml;charset=utf-8" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `${generatedSession.title}_${generatedSession.qrValue.substring(0, 8)}_QR.svg`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                    showToast("QR code downloaded successfully!", "success");
                    return;
                } catch (e) {
                    console.error("Fallback download failed", e);
                }
            }

            showToast("Error: QR code SVG element not found for download.", "error");
            return;
        }

        try {
            const serializer = new XMLSerializer();
            const source = serializer.serializeToString(svgElement);
            const blob = new Blob([source], { type: "image/svg+xml;charset=utf-8" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `${generatedSession.title}_${generatedSession.qrValue.substring(0, 8)}_QR.svg`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            showToast("QR code downloaded successfully!", "success");
        } catch (e) {
            console.error("Download failed:", e);
            showToast("Failed to download QR code.", "error");
        }
    };

    // --- SORTING LOGIC ---
    // Sort active sessions (timeLeft > 0) to the top, and expired sessions (timeLeft <= 0) to the bottom.
    const sortedSessions = [...sessions].sort((a, b) => {
        // Check if session A is active (1) or expired (0)
        const aIsActive = a.timeLeft > 0 ? 1 : 0;
        // Check if session B is active (1) or expired (0)
        const bIsActive = b.timeLeft > 0 ? 1 : 0;
        
        // Primary Sort: Active (1) vs. Expired (0)
        // If the statuses are different, prioritize the active session
        // bIsActive - aIsActive will result in:
        //  1 - 0 = 1 (B active, A expired) -> B comes after A (A, B) -> INCORRECT. We want Active first.
        //  0 - 1 = -1 (A active, B expired) -> A comes before B (A, B) -> CORRECT.
        // We use bIsActive - aIsActive because 1 (Active) should come before 0 (Expired).
        if (aIsActive !== bIsActive) {
            return bIsActive - aIsActive; 
        }
        
        // Secondary Sort: If both are the same status, sort by time left descending (longer time left first)
        return b.timeLeft - a.timeLeft;
    });

    return (
        <div className="bg-gray-800 rounded-xl shadow-md p-6 relative min-h-screen text-white">
            {message && <ToastMessage message={message.text} type={message.type} onClose={clearToast} />}

            <h2 className="text-2xl font-bold mb-6 text-white border-b border-gray-700 pb-2">Create New Session</h2>

            <div className="space-y-4">
                <input
                    type="text"
                    placeholder="Enter session title (e.g., Physics Lecture 3)"
                    className="w-full bg-gray-700 border border-gray-600 px-4 py-3 rounded-xl focus:ring-blue-500 focus:border-blue-500 transition text-white placeholder-gray-400"
                    value={sessionTitle}
                    onChange={(e) => setSessionTitle(e.target.value)}
                />

                <div>
                    <p className="font-medium mb-2 text-gray-200">Select Eligible Classes:</p>
                    <div className="flex flex-wrap gap-3">
                        {classOptions.map((cls) => (
                            <button
                                key={cls}
                                onClick={() => toggleClass(cls)}
                                className={`px-4 py-2 rounded-full border-2 transition duration-200 shadow-sm
                                    ${selectedClasses.includes(cls)
                                    ? "bg-blue-600 text-white border-blue-600 hover:bg-blue-700 shadow-lg"
                                    : "bg-gray-700 text-gray-200 border-gray-600 hover:bg-gray-600"
                                    }`}
                            >
                                {cls}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex gap-4 p-3 bg-gray-700 rounded-xl border border-gray-600">
                    <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-200 mb-1">Duration (Minutes)</label>
                        <input
                            type="number"
                            min="1"
                            max="60"
                            placeholder="5"
                            value={minutes}
                            onChange={(e) => setMinutes(Number(e.target.value))}
                            className="w-full bg-gray-600 border border-gray-600 px-4 py-2 rounded-xl text-white"
                        />
                    </div>
                </div>

                <button
                    onClick={handleCreateSession}
                    disabled={isLoading}
                    className={`w-full text-white px-5 py-3 rounded-xl transition duration-300 font-semibold shadow-lg ${
                        isLoading ? "bg-gray-400 cursor-not-allowed" : "bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700"
                    }`}
                >
                    {isLoading ? (
                        <span className="flex items-center justify-center">
                            <svg
                                className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                            >
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path
                                    className="opacity-75"
                                    fill="currentColor"
                                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                ></path>
                            </svg>
                            Generating Token...
                        </span>
                    ) : (
                        "Generate Live QR Code Session"
                    )}
                </button>
            </div>

            <div className="mt-8 pt-4 border-t border-gray-700">
                <h3 className="text-xl font-bold mb-4 text-white">Ongoing Sessions</h3>
                {sessions.length === 0 ? (
                    <p className="text-gray-400 p-4 border rounded-xl bg-gray-700">No currently active sessions.</p>
                ) : (
                    <div className="space-y-3">
                        {sortedSessions.map((s) => (
                            <div
                                key={s.id}
                                className={`p-4 rounded-xl shadow-md flex justify-between items-center transition 
                                    ${s.timeLeft > 0 ? "bg-gray-800 border-l-4 border-blue-500" : "bg-red-900/20 border border-red-700 opacity-80"}`}
                            >
                                <div>
                                    <p className="font-semibold text-white">{s.title}</p>
                                    <p className="text-sm text-gray-400 mt-0.5">Eligible: {s.eligibleClasses}</p>
                                    <p className={`text-sm font-bold mt-1 ${s.timeLeft > 0 ? "text-blue-400" : "text-red-400"}`}>
                                        {s.timeLeft > 0 ? `Time left: ${formatTime(s.timeLeft)}` : "Expired"}
                                    </p>
                                </div>

                                <button
                                    onClick={() => openQRModalWithRecords(s)}
                                    className={`text-white px-4 py-2 rounded-full text-sm transition shadow-md ${
                                        s.timeLeft > 0 ? "bg-blue-600 hover:bg-blue-700" : "bg-gray-600 hover:bg-gray-500"
                                    }`}
                                >
                                    View Details
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* QR Modal with Attendance Records */}
            {showQRModal && generatedSession && (
                <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50 p-4">
                    <div className="bg-gray-900 p-8 rounded-2xl shadow-2xl w-full max-w-4xl text-left transform translate-y-0 border border-gray-700">
                        <h3 className="text-2xl font-bold mb-2 text-white">{generatedSession.title}</h3>
                        <p className="text-gray-300 mb-6">
                            Status:
                            <span className={`font-semibold ${generatedSession.timeLeft > 0 ? "text-green-400" : "text-red-400"}`}>
                                {generatedSession.timeLeft > 0 ? ` Active (${formatTime(generatedSession.timeLeft)} remaining)` : " Expired"}
                            </span>
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {/* QR Code Section */}
                            <div className="flex flex-col items-center border border-gray-700 p-4 rounded-xl">
                                <h4 className="font-semibold text-lg mb-4 text-white">Live QR Code</h4>
                                <div className="mb-6 p-4 border rounded-xl bg-gray-800 qr-modal-inline">
                                    <QRCodeSVG value={generatedSession.qrValue} size={256} />
                                </div>
                                <button
                                    onClick={handleDownloadQR}
                                    className="flex items-center justify-center bg-blue-600 text-white px-6 py-3 rounded-full hover:bg-blue-700 transition font-semibold shadow-md w-full max-w-xs"
                                >
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        width="20"
                                        height="20"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        className="mr-2"
                                    >
                                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                        <polyline points="7 10 12 15 17 10" />
                                        <line x1="12" x2="12" y1="15" y2="3" />
                                    </svg>
                                    Download QR
                                </button>
                            </div>

                            {/* Attendance Records Section */}
                            <div className="border border-gray-700 p-4 rounded-xl">
                                <h4 className="font-semibold text-lg mb-4 flex justify-between items-center text-white">
                                    Checked-In Students <span className="text-blue-400 text-sm font-bold">{checkInRecords.length} Total</span>
                                </h4>

                                {isRecordsLoading ? (
                                    <p className="text-gray-400 text-center py-8">Loading records...</p>
                                ) : checkInRecords.length === 0 ? (
                                    <p className="text-gray-400 py-8 text-center">No students have checked in yet.</p>
                                ) : (
                                    <div className="space-y-3 max-h-96 overflow-y-auto">
                                        {checkInRecords.map((record, index) => (
                                            <div key={index} className="flex justify-between items-center p-3 bg-gray-800 rounded-lg shadow-sm border border-gray-700">
                                                <p className="font-medium text-sm truncate w-1/2">
                                                    <span className="text-white font-bold">User ID:</span> {record.userId}
                                                </p>
                                                <p className="text-xs text-gray-400 font-mono">Checked In: {new Date(record.checkInTime).toLocaleTimeString()}</p>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        <button
                            onClick={() => setShowQRModal(false)}
                            className="mt-8 bg-gray-700 text-white px-6 py-3 rounded-full hover:bg-gray-600 transition font-semibold w-full"
                        >
                            Close Details
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}