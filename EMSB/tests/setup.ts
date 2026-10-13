process.env.NODE_ENV = "test";
process.env.MONGODB_URI = "mongodb://localhost:27017";
process.env.MONGODB_DATABASE = "eniac_ems_test";
process.env.JWT_SECRET = "test-jwt-secret-at-least-32-chars-long-here!!";
process.env.JWT_EXPIRES_IN = "24h";
process.env.CORS_ORIGIN = "http://localhost:5173";
process.env.LOG_LEVEL = "error";
process.env.PORT = "4000";
process.env.MAIL_PROVIDER = "log";
// The suite issues thousands of requests from a single IP; keep limiters out of the way.
process.env.RATE_LIMIT_MAX = "1000000";
process.env.AUTH_RATE_LIMIT_MAX = "1000000";
