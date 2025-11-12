import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import QRScanner from "../components/QRScanner";
import AttendanceStats from "../components/AttendanceStats";
import Header from "../components/Header";

// --- Configuration and Utilities ---

// const USER_ID = "simulated_student_123"; 
const API_CHECK_IN_URL = "http://localhost:8080/api/attendance/check-in";

let storedUser = null;
try {
  const raw = localStorage.getItem("user");
  if (raw) storedUser = JSON.parse(raw);
} catch (e) {
  console.warn("Invalid user data in localStorage:", e);
}
const USER_ID = storedUser?.id || null;
console.log("Loaded USER_ID:", USER_ID, "Stored User:", storedUser);




/**
 * Helper function for robust API calls with exponential backoff.
 */
const fetchWithRetry = async (url, options, retries = 3) => {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, options);
      
      // If the response is not ok (4xx, 5xx), read the body to get the error message
      if (!response.ok) {
        const errorBody = await response.json();
        const errorMessage = errorBody.message || `Server error (Status: ${response.status})`;
        throw new Error(errorMessage);
      }
      return await response.json();
    } catch (error) {
      console.error(`Attempt ${i + 1} failed: ${error.message}`);
      if (i === retries - 1) throw error;
      const delay = Math.pow(2, i) * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
};


// --- Toast/Message Component for User Feedback ---

const ToastMessage = ({ message, type, onClose }) => {
  const getToastStyles = () => {
    switch (type) {
      case 'success':
        return {
          bg: 'bg-green-900/90',
          border: 'border-green-700',
          text: 'text-green-300',
          icon: (
            <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          )
        };
      case 'error':
        return {
          bg: 'bg-red-900/90',
          border: 'border-red-700',
          text: 'text-red-300',
          icon: (
            <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          )
        };
      default:
        return {
          bg: 'bg-blue-900/90',
          border: 'border-blue-700',
          text: 'text-blue-300',
          icon: (
            <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )
        };
    }
  };

  const styles = getToastStyles();
  
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className={`fixed top-4 right-4 ${styles.bg} border ${styles.border} ${styles.text} p-4 rounded-xl shadow-xl z-50 backdrop-blur-sm`}
    >
      <div className="flex items-center gap-3">
        <div className="flex-shrink-0">
          {styles.icon}
        </div>
        <p className="font-medium pr-6">{message}</p>
        <button 
          onClick={onClose} 
          className="absolute top-2 right-2 p-1 hover:bg-white/10 rounded-full transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </motion.div>
  );
};

export default function Profile({ setIsLoggedIn }) {
  const navigate = useNavigate();
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [message, setMessage] = useState(null);
  const [cameraOpen, setCameraOpen] = useState(false);

  const showToast = (msg, type) => {
    // Handle both string messages and object messages
    if (typeof msg === 'object') {
      setMessage({ text: msg.message, type: msg.type });
    } else {
      setMessage({ text: msg, type });
    }
  };
  
  const clearToast = () => setMessage(null);


  // --- MOCK DATA ---
  const [attendanceRecords, setAttendanceRecords] = useState([
    {
      subject: "Computer Science",
      attended: 28,
      total: 30,
      percentage: 93,
      instructor: "Dr. Sarah Johnson",
      sessions: [
        { date: "2025-11-07", status: "Present", topic: "Data Structures" },
        { date: "2025-11-05", status: "Present", topic: "Algorithms" },
        { date: "2025-11-03", status: "Present", topic: "Database Systems" },
        { date: "2025-11-01", status: "Present", topic: "Web Development" },
        { date: "2025-10-30", status: "Absent", topic: "Network Security" },
      ],
    },
    {
      subject: "Advanced Mathematics",
      attended: 25,
      total: 30,
      percentage: 83,
      instructor: "Prof. Michael Chen",
      sessions: [
        { date: "2025-11-07", status: "Present", topic: "Linear Algebra" },
        { date: "2025-11-05", status: "Present", topic: "Calculus" },
        { date: "2025-11-03", status: "Absent", topic: "Statistics" },
        { date: "2025-11-01", status: "Present", topic: "Probability" },
        { date: "2025-10-30", status: "Present", topic: "Discrete Math" },
      ],
    },
    {
      subject: "Software Engineering",
      attended: 27,
      total: 30,
      percentage: 90,
      instructor: "Dr. Emily Roberts",
      sessions: [
        { date: "2025-11-07", status: "Present", topic: "Agile Methodologies" },
        { date: "2025-11-05", status: "Present", topic: "System Design" },
        { date: "2025-11-03", status: "Present", topic: "Testing" },
        { date: "2025-11-01", status: "Present", topic: "DevOps" },
        { date: "2025-10-30", status: "Present", topic: "Project Management" },
      ],
    },
    {
      subject: "Artificial Intelligence",
      attended: 26,
      total: 30,
      percentage: 87,
      instructor: "Prof. David Kim",
      sessions: [
        { date: "2025-11-07", status: "Present", topic: "Machine Learning" },
        { date: "2025-11-05", status: "Present", topic: "Neural Networks" },
        { date: "2025-11-03", status: "Present", topic: "Computer Vision" },
        { date: "2025-11-01", status: "Absent", topic: "Natural Language Processing" },
        { date: "2025-10-30", status: "Present", topic: "Robotics" },
      ],
    },
  ]);

  const [events, setEvents] = useState([
    {
      title: "Tech Innovation Summit",
      date: "2025-11-15",
      type: "Conference",
      description: "Annual technology conference featuring industry leaders",
      location: "Main Auditorium"
    },
    {
      title: "AI Workshop Series",
      date: "2025-11-12",
      type: "Workshop",
      description: "Hands-on machine learning workshop",
      location: "Lab 204"
    },
    {
      title: "Code Sprint Challenge",
      date: "2025-11-10",
      type: "Competition",
      description: "24-hour coding competition with amazing prizes",
      location: "Computer Lab"
    },
    {
      title: "Industry Expert Talk",
      date: "2025-11-09",
      type: "Seminar",
      description: "Guest lecture by Google Engineering Director",
      location: "Virtual Hall"
    },
  ]);
  // --- END MOCK DATA ---


  const handleLogout = () => {
    // In a real app, this would involve clearing a JWT token or server-side session
    localStorage.removeItem("user");
    setIsLoggedIn(false);
    navigate("/");
  };

  /**
   * Main function to handle a successful QR code scan.
   * Sends the decoded token to the backend for check-in validation.
   */
  const validateSession = () => {
    try {
      const userData = localStorage.getItem("user");
      if (!userData) {
        return null;
      }
      const user = JSON.parse(userData);
      if (!user?.id) {
        return null;
      }
      return user;
    } catch (error) {
      console.error("Session validation failed:", error);
      return null;
    }
  };

  const handleScan = async (decodedText) => {
    if (isScanning) return;

    // Filter out invalid QR codes
    if (!decodedText || decodedText.startsWith("blob:") || decodedText.length < 10) {
      showToast("Invalid QR code detected. Please scan a valid attendance QR.", "error");
      return;
    }

    setIsScanning(true);
    showToast("QR code detected. Verifying attendance...", "info");

    try {
      // Validate session before proceeding
      const user = validateSession();
      if (!user) {
        showToast("Session expired. Please log in again.", "error");
        try { localStorage.removeItem('user'); } catch (e) {}
        setIsLoggedIn(false);
        navigate('/');
        return;
      }

      // Try to decode the QR content as JSON
      let sessionData;
      try {
        sessionData = JSON.parse(decodedText);
      } catch (e) {
        // If not JSON, use as raw token
        sessionData = { token: decodedText };
      }

      // Build request body expected by backend (TokenRequest)
      const requestBody = { token: sessionData.token };

      console.log("Sending attendance token:", requestBody);

      // Use validated user session for request
      const response = await fetch(API_CHECK_IN_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-User-Id": user.id,
          "Authorization": `Bearer ${user.token}`, // Add token if your backend expects it
        },
        body: JSON.stringify(requestBody),
        credentials: 'include', // Include cookies if your backend uses them
      });

      // Read body first so we can inspect message whether ok or not
      const responseBody = await response.json().catch(() => ({}));
      if (!response.ok) {
        // Handle session expiration specially (403)
        if (response.status === 403) {
          const msg = responseBody.message || 'Session expired. Please log in again.';
          showToast(msg, 'error');
          // clear local auth and redirect to login
          try { localStorage.removeItem('user'); } catch (e) {}
          setIsLoggedIn(false);
          navigate('/');
          return;
        }
        throw new Error(responseBody.message || 'Failed to record attendance');
      }

      const result = responseBody;

      // Update UI with success message
      showToast(result.message || "Attendance recorded successfully!", "success");
      
      // Optionally update the attendance records
      if (result.session) {
        setAttendanceRecords(prev => prev.map(subject => {
          if (subject.subject === result.session.subject) {
            return {
              ...subject,
              attended: subject.attended + 1,
              percentage: Math.round(((subject.attended + 1) / subject.total) * 100),
              sessions: [
                {
                  date: new Date().toISOString().split('T')[0],
                  status: "Present",
                  topic: result.session.topic || "Current Session"
                },
                ...subject.sessions
              ]
            };
          }
          return subject;
        }));
      }

    } catch (error) {
      console.error("Attendance error:", error);
      showToast(error.message || "Failed to record attendance. Please try again.", "error");
    } finally {
      setIsScanning(false);
      // Close scanner UI (QRScanner handles stopping the camera on unmount)
      setCameraOpen(false);
    }
  };



  useEffect(() => {
    // Check localStorage for logged-in user data
    const checkUserData = () => {
      try {
        const userData = localStorage.getItem("user");
        if (!userData) {
          navigate("/");
        }
      } catch (error) {
        console.error("Error checking user data:", error);
        navigate("/");
      }
    };
    
    checkUserData();
  }, [navigate]);

  // QR scanner lifecycle is handled by the QRScanner component.

  const openSubjectModal = (subject) => {
    setSelectedSubject(subject);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedSubject(null);
  };

  // Limit to latest 4 events for a clean dashboard view
  const latestEvents = events.slice(0, 4);

  return (
    <div className="min-h-screen bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Toast Notification Area */}
        {message && <ToastMessage message={message.text} type={message.type} onClose={clearToast} />}

        {/* Header Component */}
        <Header user={storedUser} onLogout={handleLogout} />

        {/* Main Content */}
        <div className="space-y-8">
          {/* Attendance Stats */}
          <section className="bg-gray-800 p-6 rounded-2xl shadow-lg border border-gray-700">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-white">Attendance Overview</h2>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setCameraOpen(!cameraOpen)}
                className={`px-6 py-3 rounded-full font-semibold shadow-md transition-all ${
                  cameraOpen
                    ? 'bg-red-500 hover:bg-red-600 text-white'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                {cameraOpen ? 'Close Scanner' : 'Scan QR Code'}
              </motion.button>
            </div>

            {/* QR Scanner */}
            <AnimatePresence>
              {cameraOpen && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mb-8"
                >
                  <div className="max-w-xl mx-auto bg-gray-700 p-6 rounded-2xl shadow-inner border border-gray-600">
                    <div className="bg-gray-800 rounded-xl p-4 mb-4 border border-gray-600">
                      <h3 className="text-white font-semibold mb-4">Scan Attendance QR Code</h3>
                      <div className="relative bg-gray-900 rounded-lg p-2 border border-gray-700">
                        <div className="mx-auto overflow-hidden rounded-xl shadow-lg" style={{ width: '100%', maxWidth: 420 }}>
                          <QRScanner onScan={handleScan} onError={(msg) => showToast(msg, 'error')} />
                        </div>
                        {isScanning && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-lg">
                            <div className="text-center">
                              <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mb-2"></div>
                              <p className="text-blue-400 font-semibold">Processing attendance...</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Removed file upload fallback - only live camera scanning is supported now */}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Attendance Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {attendanceRecords.map((subject, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  onClick={() => openSubjectModal(subject)}
                  className="bg-gray-700 p-6 rounded-xl border border-gray-600 hover:border-blue-500 transition-all cursor-pointer"
                >
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-xl font-bold text-white">{subject.subject}</h3>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      subject.percentage >= 90 ? 'bg-green-900 text-green-300' :
                      subject.percentage >= 75 ? 'bg-yellow-900 text-yellow-300' :
                      'bg-red-900 text-red-300'
                    }`}>
                      {subject.percentage}%
                    </span>
                  </div>
                  <p className="text-gray-400 text-sm mb-2">Instructor: {subject.instructor}</p>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-300">Present: {subject.attended}/{subject.total}</span>
                    <span className="text-blue-400 hover:text-blue-300">View History →</span>
                  </div>
                </motion.div>
              ))}
            </div>
          </section>

          {/* Recent Events Section */}
          <section className="bg-gray-800 p-6 rounded-2xl shadow-lg border border-gray-700">
            <h2 className="text-2xl font-bold text-white mb-6">Recent Events</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {latestEvents.map((event, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className="bg-gray-700 p-5 rounded-xl hover:border-blue-500 border border-gray-600 transition-all"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-semibold text-white text-lg">{event.title}</h4>
                      <p className="text-gray-400 text-sm mt-1">{event.date}</p>
                      <p className="text-gray-500 text-sm mt-2">{event.description}</p>
                      <p className="text-blue-400 text-sm mt-2">📍 {event.location}</p>
                    </div>
                    <span className="px-3 py-1 bg-blue-900 text-blue-300 rounded-full text-sm font-medium">
                      {event.type}
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
          </section>
        </div>
      </div>

      {/* Attendance Modal */}
      <AnimatePresence>
        {showModal && selectedSubject && (
          <>
            <motion.div
              className="fixed inset-0 bg-black bg-opacity-70 z-40 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeModal}
            />

            <motion.div
              className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-11/12 max-w-lg bg-gray-800 rounded-3xl shadow-2xl z-50 p-8 border border-gray-700"
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: "spring", stiffness: 200, damping: 25 }}
            >
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-3xl font-bold text-white">{selectedSubject.subject}</h2>
                  <p className="text-gray-400 mt-2">Instructor: {selectedSubject.instructor}</p>
                </div>
                <div className={`px-4 py-2 rounded-xl text-sm font-semibold ${
                  selectedSubject.percentage >= 90 ? 'bg-green-900 text-green-300' :
                  selectedSubject.percentage >= 75 ? 'bg-yellow-900 text-yellow-300' :
                  'bg-red-900 text-red-300'
                }`}>
                  Attendance: {selectedSubject.percentage}%
                </div>
              </div>
              
              <div className="bg-gray-700 rounded-2xl p-4 mb-6">
                <div className="flex justify-between items-center text-gray-300 text-sm mb-2">
                  <span>Present: {selectedSubject.attended}</span>
                  <span>Absent: {selectedSubject.total - selectedSubject.attended}</span>
                  <span>Total: {selectedSubject.total}</span>
                </div>
                <div className="w-full bg-gray-600 rounded-full h-2.5">
                  <div 
                    className={`h-2.5 rounded-full ${
                      selectedSubject.percentage >= 90 ? 'bg-green-500' :
                      selectedSubject.percentage >= 75 ? 'bg-yellow-500' :
                      'bg-red-500'
                    }`}
                    style={{ width: `${selectedSubject.percentage}%` }}
                  ></div>
                </div>
              </div>

              <div className="mb-4">
                <h3 className="text-xl font-semibold text-white mb-4">Session History</h3>
                <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                  {selectedSubject.sessions.map((s, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className={`p-4 rounded-xl flex items-center justify-between ${
                        s.status === "Present"
                          ? "bg-green-900/30 border border-green-700"
                          : "bg-red-900/30 border border-red-700"
                      }`}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <span className={`w-2 h-2 rounded-full ${
                            s.status === "Present" ? "bg-green-500" : "bg-red-500"
                          }`}></span>
                          <p className="text-white font-medium">{s.topic}</p>
                        </div>
                        <p className="text-gray-400 text-sm mt-1">{s.date}</p>
                      </div>
                      <span className={`px-3 py-1 rounded-lg text-sm font-medium ${
                        s.status === "Present"
                          ? "text-green-300 bg-green-900/50"
                          : "text-red-300 bg-red-900/50"
                      }`}>
                        {s.status}
                      </span>
                    </motion.div>
                  ))}
                </div>
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={closeModal}
                className="mt-6 w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl py-3 hover:from-blue-700 hover:to-blue-800 transition font-semibold shadow-lg"
              >
                Close Details
              </motion.button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
      
      {/* Custom scrollbar styles */}
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.2);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.3);
        }
      `}</style>
    </div>
  );
}
