const redisClient = require('../utils/redis');
const dbClient = require('../utils/db');

class UsersController {
  static async postNew(req, res) {
    const { email, password } = req.body;

    if (!email) {
      res.status(400).json({ error: 'Missing email' });
      return;
    }

    if (!password) {
      res.status(400).json({ error: 'Missing password' });
      return;
    }

    try {
      const usersCollection = dbClient.db.collection('users');
      const existingUser = await usersCollection.findOne({ email });

      if (existingUser) {
        res.status(400).json({ error: 'Already exist' });
        return;
      }

      const hashedPassword = crypto.createHash('sha1').update(password).digest('hex');

      const newUser = {
        email,
        password: hashedPassword,
      };

      const result = await usersCollection.insertOne(newUser);

      res.status(201).json({ id: result.insertedId, email });
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async getMe(req, res) {
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

      const usersCollection = dbClient.db.collection('users');
      const user = await usersCollection.findOne({ _id: dbClient.db.ObjectId(userId) });

      if (!user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      res.status(200).json({ id: user._id, email: user.email });
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}

module.exports = UsersController;
