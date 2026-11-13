# Express.js Skill Guidelines

- **Routing**: Organize routes using `express.Router()`.
- **Middleware**: Keep middleware functions modular. Remember to call `next()` or send a response.
- **Error Handling**: Use centralized error handling middleware `(err, req, res, next)`.
- **Async/Await**: Wrap async route handlers to catch exceptions and pass them to `next`.
