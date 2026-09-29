const crypto = require('crypto');

// UUID v4 string, used as the primary key for every table so ids stay
// compatible with the existing React frontend (which expects string ids).
const newId = () => crypto.randomUUID();

// Wraps an async route handler so thrown/rejected errors are forwarded
// to Express's error middleware instead of crashing the process.
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// Standard success envelope used by every endpoint.
const ok = (res, data, extra = {}, status = 200) =>
  res.status(status).json({ success: true, data, ...extra });

// Standard error envelope.
const fail = (res, message, status = 400, extra = {}) =>
  res.status(status).json({ success: false, error: message, message, ...extra });

const generateOrderNumber = () => {
  const date = new Date();
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const rand = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
  return `ORD-${y}${m}${d}-${rand}`;
};

module.exports = { newId, asyncHandler, ok, fail, generateOrderNumber };
