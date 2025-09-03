const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { 
    createTeam, 
    joinTeam, 
    getTeamById, 
    addMember, 
    removeMember,
    toggleAdmin,
    setRole
} = require('../controllers/teamController');

// All routes are protected
router.use(auth);

router.post('/', createTeam);
router.post('/join', joinTeam);
router.get('/:id', getTeamById);

// Admin-only routes
router.post('/:id/members', addMember);
router.delete('/:id/members/:memberId', removeMember);
router.put('/:id/admins', toggleAdmin);
router.put('/:id/roles', setRole);

module.exports = router;
