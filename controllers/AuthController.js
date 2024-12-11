const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const redisClient = require('../utils/redis');
const dbClient = require('../utils/db');

class AuthController {
  static async getConnect(req, res) {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.split(' ')[1] || '';
    const [email, password] = Buffer.from(token, 'base64').toString('utf-8').split(':');

    if (!email || !password) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const hashedPassword = crypto.createHash('sha1').update(password).digest('hex');

    try {
      const usersCollection = dbClient.db.collection('users');
      const user = await usersCollection.findOne({ email, password: hashedPassword });

      if (!user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const authToken = uuidv4();
      const tokenKey = `auth_${authToken}`;

      await redisClient.set(tokenKey, user._id.toString(), 24 * 60 * 60); // 24 hours

      res.status(200).json({ token: authToken });
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async getDisconnect(req, res) {
    const token = req.headers['x-token'];

    if (!token) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const tokenKey = `auth_${token}`;

    try {
      const userId = await redisClient.get(tokenKey);

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      await redisClient.del(tokenKey);

      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}

module.exports = AuthController;
