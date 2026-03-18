function errorHandler(err, req, res, next) {
  console.error('[Error]', err.message, err.stack);

  if (err.name === 'ValidationError') {
    return res.status(400).json({ message: err.message, errors: err.errors });
  }
  if (err.code === '23505') {
    return res.status(409).json({ message: '数据已存在（重复键冲突）' });
  }
  if (err.code === '23503') {
    return res.status(400).json({ message: '关联数据不存在' });
  }

  const status = err.statusCode || err.status || 500;
  res.status(status).json({
    message: err.message || '服务器内部错误',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
}

module.exports = { errorHandler };
