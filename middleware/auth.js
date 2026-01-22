const isAuthenticated = (req, res, next) => {
    if (req.session.user) {
        return next();
    }
    req.session.error = 'Please login to access this page';
    res.redirect('/auth/login');
};

const isAdmin = (req, res, next) => {
    if (req.session.user && req.session.user.role === 'admin') {
        return next();
    }
    req.session.error = 'Admin access required';
    res.redirect('/auth/login');
};

const isManager = (req, res, next) => {
    if (req.session.user && (req.session.user.role === 'manager' || req.session.user.role === 'admin')) {
        return next();
    }
    req.session.error = 'Manager access required';
    res.redirect('/auth/login');
};

const isUser = (req, res, next) => {
    if (req.session.user && req.session.user.role === 'user') {
        return next();
    }
    req.session.error = 'User access required';
    res.redirect('/auth/login');
};

module.exports = { isAuthenticated, isAdmin, isManager, isUser };