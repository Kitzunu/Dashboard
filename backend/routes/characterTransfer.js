const express = require('express');
const router = express.Router();
const { requireGMLevel } = require('../middleware/auth');
const { authPool, getRealmPools, getAllRealmIds } = require('../db');
const { audit } = require('../audit');
const { generateDump, loadDump } = require('./pdump');
const log = require('../logger')('character-transfer');

router.post('/transfer', requireGMLevel(3), async (req, res) => {
  const { characterGuid, targetAccountId } = req.body;
  if (!characterGuid || !targetAccountId) {
    return res.status(400).json({ error: 'characterGuid and targetAccountId are required' });
  }
  try {
    const [[character]] = await req.charPool.query(
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
    await req.charPool.query(
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

    const [[character]] = await req.charPool.query(
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

// Cross-realm character transfer via pdump (dump from source, load into destination)
router.post('/transfer-cross-realm', requireGMLevel(3), async (req, res) => {
  const { characterGuid, targetAccountId, sourceRealmId, destRealmId } = req.body;
  if (!characterGuid || !targetAccountId || !sourceRealmId || !destRealmId) {
    return res.status(400).json({ error: 'characterGuid, targetAccountId, sourceRealmId, and destRealmId are required' });
  }
  if (sourceRealmId === destRealmId) {
    return res.status(400).json({ error: 'Source and destination realms are the same — use the standard transfer endpoint' });
  }

  try {
    const sourcePools = getRealmPools(sourceRealmId);
    const destPools = getRealmPools(destRealmId);
    if (!sourcePools || !destPools) {
      return res.status(400).json({ error: 'Invalid source or destination realm' });
    }

    // Validate source character
    const [[character]] = await sourcePools.charPool.query(
      'SELECT guid, name, account, online FROM characters WHERE guid = ?',
      [characterGuid]
    );
    if (!character) {
      return res.status(404).json({ error: 'Character not found on source realm' });
    }
    if (character.online) {
      return res.status(400).json({ error: 'Character is currently online and cannot be transferred' });
    }

    // Validate target account
    const [[targetAccount]] = await authPool.query(
      'SELECT id, username FROM account WHERE id = ?',
      [targetAccountId]
    );
    if (!targetAccount) {
      return res.status(404).json({ error: 'Target account not found' });
    }

    // Generate dump from source realm
    const dumpContent = await generateDump(sourcePools.charPool, characterGuid);

    // Load dump into destination realm
    const loadResult = await loadDump(destPools.charPool, dumpContent, {
      accountId: parseInt(targetAccountId, 10),
      characterName: character.name,
    });

    // Delete character from source realm after successful load
    const conn = await sourcePools.charPool.getConnection();
    try {
      await conn.beginTransaction();
      // Delete in dependency order
      const guid = characterGuid;
      const [mails] = await conn.query('SELECT id FROM mail WHERE receiver = ?', [guid]);
      const mailIds = mails.map(m => m.id);
      if (mailIds.length > 0) {
        await conn.query('DELETE FROM mail_items WHERE mail_id IN (?)', [mailIds]);
      }
      await conn.query('DELETE FROM mail WHERE receiver = ?', [guid]);

      const [invItems] = await conn.query('SELECT item FROM character_inventory WHERE guid = ?', [guid]);
      const itemGuids = invItems.map(r => r.item).filter(Boolean);
      if (itemGuids.length > 0) {
        await conn.query('DELETE FROM item_instance WHERE guid IN (?)', [itemGuids]);
        await conn.query('DELETE FROM character_gifts WHERE item_guid IN (?)', [itemGuids]);
      }

      const [pets] = await conn.query('SELECT id FROM character_pet WHERE owner = ?', [guid]);
      const petIds = pets.map(p => p.id);
      if (petIds.length > 0) {
        for (const tbl of ['pet_aura', 'pet_spell', 'pet_spell_cooldown']) {
          await conn.query(`DELETE FROM \`${tbl}\` WHERE guid IN (?)`, [petIds]).catch(() => {});
        }
        await conn.query('DELETE FROM character_pet_declinedname WHERE id IN (?)', [petIds]).catch(() => {});
      }
      await conn.query('DELETE FROM character_pet WHERE owner = ?', [guid]);

      // Delete all character_* tables
      const charTables = [
        'character_account_data', 'character_achievement', 'character_achievement_progress',
        'character_action', 'character_aura', 'character_declinedname', 'character_equipmentsets',
        'character_glyphs', 'character_homebind', 'character_inventory',
        'character_queststatus', 'character_queststatus_daily', 'character_queststatus_weekly',
        'character_queststatus_monthly', 'character_queststatus_seasonal',
        'character_queststatus_rewarded', 'character_reputation', 'character_skills',
        'character_spell', 'character_spell_cooldown', 'character_talent',
      ];
      for (const tbl of charTables) {
        await conn.query(`DELETE FROM \`${tbl}\` WHERE guid = ?`, [guid]).catch(() => {});
      }
      await conn.query('DELETE FROM characters WHERE guid = ?', [guid]);

      await conn.commit();
    } catch (deleteErr) {
      await conn.rollback();
      log.error('Failed to delete source character after cross-realm transfer:', deleteErr.message);
      // The character was already loaded into the destination — log but don't fail
    } finally {
      conn.release();
    }

    audit(req, 'character.transfer.crossrealm',
      `guid=${character.guid} name=${character.name} from_realm=${sourceRealmId} to_realm=${destRealmId} from_account=${character.account} to_account=${targetAccountId} new_guid=${loadResult.characterGuid}`
    );

    res.json({
      success: true,
      character: character.name,
      fromRealm: sourceRealmId,
      toRealm: destRealmId,
      fromAccount: character.account,
      toAccount: parseInt(targetAccountId, 10),
      newGuid: loadResult.characterGuid,
      forceRename: loadResult.forceRename,
    });
  } catch (err) {
    log.error('Cross-realm transfer error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
