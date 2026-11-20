export const validate = (schema) => (req, res, next) => {
  const parsed = schema.safeParse({
    body: req.body,
    query: req.query,
    params: req.params,
  });

  if (!parsed.success) {
    return next(parsed.error);
  }

  if (parsed.data.body) req.body = parsed.data.body;
  if (parsed.data.query) req.query = parsed.data.query;
  if (parsed.data.params) req.params = parsed.data.params;

  next();
};
