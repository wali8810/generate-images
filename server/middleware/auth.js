
import jwt from 'jsonwebtoken';

export default function(req, res, next) {
  // Obter token do header Authorization: "Bearer <token>"
  const token = req.header('Authorization')?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ msg: 'Nenhum token, autorização negada' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded.user;
    next();
  } catch (err) {
    res.status(401).json({ msg: 'Token inválido' });
  }
};
