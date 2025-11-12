import React from 'react';
import { motion } from 'framer-motion';

const Header = ({ user, onLogout }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-r from-blue-600 to-blue-800 text-white rounded-2xl shadow-lg p-6 mb-8"
    >
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Welcome Back!</h1>
          <p className="mt-2 text-blue-100">{user?.name || 'Student'}</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onLogout}
          className="px-6 py-2 bg-white text-blue-600 rounded-full font-semibold shadow-md hover:bg-blue-50 transition-colors"
        >
          Logout
        </motion.button>
      </div>
      
      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
        <div className="bg-blue-700 bg-opacity-50 p-4 rounded-xl">
          <h3 className="text-blue-100 text-sm">Today's Classes</h3>
          <p className="text-2xl font-bold mt-1">3</p>
        </div>
        <div className="bg-blue-700 bg-opacity-50 p-4 rounded-xl">
          <h3 className="text-blue-100 text-sm">Overall Attendance</h3>
          <p className="text-2xl font-bold mt-1">85%</p>
        </div>
        <div className="bg-blue-700 bg-opacity-50 p-4 rounded-xl">
          <h3 className="text-blue-100 text-sm">Upcoming Events</h3>
          <p className="text-2xl font-bold mt-1">2</p>
        </div>
        <div className="bg-blue-700 bg-opacity-50 p-4 rounded-xl">
          <h3 className="text-blue-100 text-sm">This Month</h3>
          <p className="text-2xl font-bold mt-1">24/30</p>
        </div>
      </div>
    </motion.div>
  );
};

export default Header;