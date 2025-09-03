const Team = require('../models/Team');
const User = require('../models/User');

const populateTeam = (query) => {
    return query.populate('adminIds members captainId viceCaptainId', '-passwordHash');
}

// @route   POST /api/teams
// @desc    Create a new team
exports.createTeam = async (req, res) => {
    try {
        const { name, logoUrl } = req.body;
        const newTeam = new Team({
            name,
            logoUrl,
            adminIds: [req.user.id],
            members: [req.user.id]
        });
        await newTeam.save();
        const populatedTeam = await populateTeam(Team.findById(newTeam._id));
        res.status(201).json(populatedTeam);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @route   POST /api/teams/join
// @desc    Join a team using an invite code
exports.joinTeam = async (req, res) => {
    try {
        const { inviteCode } = req.body;
        const team = await Team.findOne({ inviteCode });
        if (!team) {
            return res.status(404).json({ message: 'Team not found with this invite code' });
        }

        if (team.members.includes(req.user.id)) {
            return res.status(400).json({ message: 'You are already a member of this team' });
        }

        team.members.push(req.user.id);
        await team.save();
        const populatedTeam = await populateTeam(Team.findById(team._id));
        res.json(populatedTeam);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @route   GET /api/teams/:id
// @desc    Get a team by ID
exports.getTeamById = async (req, res) => {
    try {
        const team = await populateTeam(Team.findById(req.params.id));
        if (!team) {
            return res.status(404).json({ message: 'Team not found' });
        }
        res.json(team);
    } catch (error) {
        console.error(error);
        if (error.kind === 'ObjectId') {
            return res.status(404).json({ message: 'Team not found' });
        }
        res.status(500).json({ message: 'Server Error' });
    }
};

// @route   POST /api/teams/:id/members
// @desc    Add a member to a team (Admin only)
exports.addMember = async (req, res) => {
    try {
        const { memberId } = req.body; // This is the unique User._id
        const team = await Team.findById(req.params.id);

        if (!team) return res.status(404).json({ success: false, message: 'Team not found' });
        if (!team.adminIds.includes(req.user.id)) return res.status(403).json({ success: false, message: 'Only admins can add members' });

        const member = await User.findById(memberId);
        if (!member) return res.status(404).json({ success: false, message: 'User not found' });
        
        if (team.members.includes(memberId)) return res.status(400).json({ success: false, message: 'User is already in the team' });

        team.members.push(memberId);
        await team.save();
        res.json({ success: true, message: 'Member added successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// @route   DELETE /api/teams/:id/members/:memberId
// @desc    Remove a member from a team (Admin only)
exports.removeMember = async (req, res) => {
    try {
        const team = await Team.findById(req.params.id);

        if (!team) return res.status(404).json({ success: false, message: 'Team not found' });
        if (!team.adminIds.includes(req.user.id)) return res.status(403).json({ success: false, message: 'Only admins can remove members' });
        if (req.params.memberId === req.user.id) return res.status(400).json({ success: false, message: 'Admin cannot remove themself' });

        team.members.pull(req.params.memberId);
        // Also remove from admin, captain, vice-captain if they are removed
        team.adminIds.pull(req.params.memberId);
        if (team.captainId && team.captainId.toString() === req.params.memberId) team.captainId = null;
        if (team.viceCaptainId && team.viceCaptainId.toString() === req.params.memberId) team.viceCaptainId = null;

        await team.save();
        res.json({ success: true, message: 'Member removed successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// @route   PUT /api/teams/:id/admins
// @desc    Toggle admin status for a member (Admin only)
exports.toggleAdmin = async (req, res) => {
    try {
        const { memberId } = req.body;
        const team = await Team.findById(req.params.id);

        if (!team) return res.status(404).json({ success: false, message: 'Team not found' });
        if (!team.adminIds.includes(req.user.id)) return res.status(403).json({ success: false, message: 'Only admins can manage roles' });
        if (memberId === req.user.id) return res.status(400).json({ success: false, message: 'Cannot change your own admin status' });
        
        if (team.adminIds.includes(memberId)) {
            team.adminIds.pull(memberId);
        } else {
            team.adminIds.push(memberId);
        }

        await team.save();
        res.json({ success: true, message: 'Admin status updated' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// @route   PUT /api/teams/:id/roles
// @desc    Set captain or vice-captain (Admin only)
exports.setRole = async (req, res) => {
    try {
        const { memberId, role } = req.body; // role: 'captain' or 'viceCaptain'
        const team = await Team.findById(req.params.id);

        if (!team) return res.status(404).json({ success: false, message: 'Team not found' });
        if (!team.adminIds.includes(req.user.id)) return res.status(403).json({ success: false, message: 'Only admins can set roles' });
        if (!team.members.includes(memberId)) return res.status(400).json({ success: false, message: 'Player is not a member of this team' });

        if (role === 'captain') team.captainId = memberId;
        else if (role === 'viceCaptain') team.viceCaptainId = memberId;
        else return res.status(400).json({ success: false, message: 'Invalid role specified' });

        await team.save();
        res.json({ success: true, message: 'Team role updated' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};
