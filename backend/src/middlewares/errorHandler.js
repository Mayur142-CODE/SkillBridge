export const notFound = (req, res, next) => {
  const error = new Error(`Resource Not Found - ${req.originalUrl}`);
  res.status(404);
  next(error);
};

export const errorHandler = (err, req, res, next) => {
  let statusCode = err.status || err.statusCode || (res.statusCode === 200 ? 500 : res.statusCode);

  if (
    err.name === 'MulterError' ||
    err.code === 'LIMIT_FILE_SIZE' ||
    err.message?.includes('Invalid CV format') ||
    err.message?.includes('Invalid resume format') ||
    err.message?.includes('Invalid document format') ||
    err.message?.includes('Invalid image format') ||
    err.message?.includes('Invalid import format')
  ) {
    statusCode = 400;
  }

  console.error(`[Error] ${err.message}`, {
    stack: process.env.NODE_ENV === 'production' ? null : err.stack
  });

  res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal Server Error',
    ...(err.validationErrors ? { errors: err.validationErrors } : {}),
    stack: process.env.NODE_ENV === 'production' ? null : err.stack
  });
};
