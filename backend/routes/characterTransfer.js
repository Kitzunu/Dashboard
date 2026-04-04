const express = require('express');
const router = express.Router();
const { requireGMLevel } = require('../middleware/auth');
const { authPool, charPool } = require('../db');
const { audit } = require('../audit');

router.post('/transfer', requireGMLevel(3), async (req, res) => {
  const { characterGuid, targetAccountId } = req.body;
  if (!characterGuid || !targetAccountId) {
    return res.status(400).json({ error: 'characterGuid and targetAccountId are required' });
  }
  try {
    const [[character]] = await charPool.query(
      'SELECT guid, name, account, online FROM characters WHERE guid = ?',
      [characterGuid]
    );
    if (!character) {
      return res.status(404).json({ error: 'Character not found' });
    }
    if (character.online) {
      return res.status(400).json({ error: 'Character is currently online and cannot be transferred' });
    }

    const [[targetAccount]] = await authPool.query(
      'SELECT id, username FROM account WHERE id = ?',
      [targetAccountId]
    );
    if (!targetAccount) {
      return res.status(404).json({ error: 'Target account not found' });
    }

    const oldAccountId = character.account;
    await charPool.query(
      'UPDATE characters SET account = ? WHERE guid = ?',
      [targetAccountId, characterGuid]
    );

    audit(req, 'character.transfer',
      `guid=${character.guid} name=${character.name} from_account=${oldAccountId} to_account=${targetAccountId}`
    );

    res.json({
      success: true,
      character: character.name,
      fromAccount: oldAccountId,
      toAccount: targetAccountId,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/validate/:guid', requireGMLevel(3), async (req, res) => {
  try {
    const guid = parseInt(req.params.guid, 10);
    if (!guid) return res.status(400).json({ error: 'Invalid GUID' });

    const [[character]] = await charPool.query(
      'SELECT guid, name, account, online, level, race, `class` FROM characters WHERE guid = ?',
      [guid]
    );
    if (!character) {
      return res.status(404).json({ error: 'Character not found' });
    }

    const [[account]] = await authPool.query(
      'SELECT id, username FROM account WHERE id = ?',
      [character.account]
    );

    res.json({
      character: {
        guid: character.guid,
        name: character.name,
        level: character.level,
        race: character.race,
        class: character.class,
        online: !!character.online,
        canTransfer: !character.online,
      },
      account: account ? { id: account.id, username: account.username } : null,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Search accounts by username for the transfer target picker
router.get('/search-accounts', requireGMLevel(3), async (req, res) => {
  try {
    const q = (req.query.q || '').trim();
    if (q.length < 2) {
      return res.status(400).json({ error: 'Search query must be at least 2 characters' });
    }
    const [rows] = await authPool.query(
      'SELECT id, username FROM account WHERE username LIKE ? ORDER BY username ASC LIMIT 20',
      [`%${q}%`]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
