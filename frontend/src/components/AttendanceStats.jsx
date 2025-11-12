import React from 'react';
import { motion } from 'framer-motion';

const CircularProgress = ({ percentage, size = 120, strokeWidth = 12 }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg className="transform -rotate-90" viewBox={`0 0 ${size} ${size}`}>
        <circle
          className="text-gray-200"
          strokeWidth={strokeWidth}
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
        <motion.circle
          className={percentage >= 75 ? "text-green-500" : percentage >= 60 ? "text-yellow-500" : "text-red-500"}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={circumference}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.5, type: "spring" }}
          strokeLinecap="round"
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-2xl font-bold">{percentage}%</span>
      </div>
    </div>
  );
};

const AttendanceStats = ({ subjects, onSubjectClick }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {subjects.map((subject, idx) => (
        <motion.div
          key={idx}
          onClick={() => onSubjectClick(subject)}
          className="bg-gray-800 rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow duration-300 cursor-pointer border border-gray-700"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: idx * 0.1 }}
          whileHover={{ scale: 1.02 }}
        >
          <div className="flex flex-col items-center">
            <CircularProgress percentage={subject.percentage} />
            <h3 className="mt-4 text-xl font-bold text-gray-800">{subject.subject}</h3>
            <p className="text-gray-600 mt-2">
              {subject.attended} / {subject.total} Classes
            </p>
            <div className="mt-4 w-full">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Last attended:</span>
                <span>{subject.sessions[0]?.date || 'N/A'}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-600 mt-1">
                <span>Status:</span>
                <span className={subject.percentage >= 75 ? 'text-green-600' : 'text-red-600'}>
                  {subject.percentage >= 75 ? 'Good Standing' : 'Attention Needed'}
                </span>
              </div>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
};

export default AttendanceStats;