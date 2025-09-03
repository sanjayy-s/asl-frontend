const User = require('../models/User');

// @route   PUT /api/users/profile
// @desc    Update user profile
exports.updateProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const { name, age, position, imageUrl, year, mobile } = req.body;

        // Update only the fields that are provided
        if (name) user.profile.name = name;
        if (age) user.profile.age = age;
        if (position) user.profile.position = position;
        if (imageUrl) user.profile.imageUrl = imageUrl;
        if (year !== undefined) user.profile.year = year;
        if (mobile !== undefined) user.profile.mobile = mobile;

        await user.save();
        
        const userResponse = user.toObject();
        delete userResponse.passwordHash;

        res.json(userResponse);
    } catch (error) {
        console.error(error.message);
        res.status(500).send('Server Error');
    }
};

// @route   GET /api/users/:id
// @desc    Get user by ID
exports.getUserById = async (req, res) => {
    try {
        const user = await User.findById(req.params.id).select('-passwordHash');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json(user);
    } catch (error) {
        console.error(error.message);
        if (error.kind === 'ObjectId') {
            return res.status(404).json({ message: 'User not found' });
        }
        res.status(500).send('Server Error');
    }
};
