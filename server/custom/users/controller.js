var Users = connection.model('Users');
const Reports = connection.model('Reports');
const Controller = require('../../core/controller.js');

class UsersController extends Controller {
    constructor () {
        super(Users);
        this.searchFields = ['userName'];
    }
}

var controller = new UsersController();

exports.UsersCreate = function (req, res) {
    req.query.trash = true;
    req.query.companyid = true;
    req.body.companyID = 'COMPID';

    // Do we have to generate a password?
    if (req.body.sendPassword) {
        var generatePassword = require('password-generator');
        var thePassword = generatePassword();
        req.body.pwd1 = thePassword;
        req.body.userPassword = thePassword;
    }

    req.body.status = 'active';
    req.body.nd_trash_deleted = false;

    var Users = connection.model('Users');
    Users.createTheUser(req, res, req.body, function (result) {
        if (req.body.sendPassword && typeof thePassword !== 'undefined') {
            var recipients = [];
            recipients.push(req.body);
            sendEmailTemplate('newUserAndPassword', recipients, 'email', 'welcome to urungi');
        }

        res.status(200).json(result);
    });
};

exports.UsersUpdate = function (req, res) {
    req.query.trash = true;
    req.query.companyid = true;

    if (req.body.pwd1 && req.body.pwd2) {
        if (req.body.pwd1 === req.body.pwd2) {
            var hash = require('../../util/hash');
            hash(req.body.pwd1, function (err, salt, hash) {
                if (err) throw err;
                req.body.password = '';
                req.body.salt = salt;
                req.body.hash = hash;
                controller.update(req).then(function (result) {
                    res.status(200).json(result);
                });
            });
        } else {
            var result = { result: 0, msg: 'Passwords do not match' };
            res.status(200).json(result);
        }
    } else {
        controller.update(req).then(function (result) {
            res.status(200).json(result);
        });
    }
};

exports.UsersDelete = function (req, res) {
    req.query.trash = true;
    controller.remove(req).then(function (result) {
        res.status(200).json(result);
    });
};

exports.UsersFindAll = function (req, res) {
    req.query.trash = true;
    req.query.companyid = true;

    controller.findAll(req).then(function (result) {
        res.status(200).json(result);
    });
};

exports.UsersFindOne = function (req, res) {
    req.query.companyid = true;

    controller.findOne(req).then(function (result) {
        res.status(200).json(result);
    });
};

exports.logout = function (req, res) {
    req.logOut();
    res.clearCookie('remember_me');
    req.session.loggedIn = false;
    req.session = null;
    res.end();
};

exports.changeMyPassword = function (req, res) {
    if (req.body.pwd1 && req.body.pwd2) {
        if (req.body.pwd1 === req.body.pwd2) {
            var hash = require('../../util/hash');
            hash(req.body.pwd1, function (err, salt, hash) {
                if (err) throw err;
                Users.updateOne({ _id: req.user._id }, { salt: salt, hash: hash }, function (err) {
                    if (err) { console.error(err); }

                    const result = { result: 1, msg: 'Password changed' };
                    res.status(200).json(result);
                });
            });
        } else {
            const result = { result: 0, msg: 'Passwords do not match' };
            res.status(200).json(result);
        }
    }
};

exports.changeUserStatus = function (req, res) {
    Users.setStatus(req, function (result) {
        res.status(200).json(result);
    });
};

exports.setViewedContextHelp = function (req, res) {
    Users.setViewedContextHelp(req, function (result) {
        res.status(200).json(result);
    });
};

exports.getCounts = function (req, res) {
    var companyID = req.user.companyID;
    var theCounts = {};

    // Only for WSTADMIN - these counts are only for the WSTADMIN role
    var isWSTADMIN = false;

    if (req.isAuthenticated()) {
        for (var i in req.user.roles) {
            if (req.user.roles[i] === 'WSTADMIN') {
                isWSTADMIN = true;
            }
        }
    }

    if (isWSTADMIN) {
        // get all reports
        Reports.countDocuments({ companyID: companyID, owner: req.user._id, nd_trash_deleted: false }, function (err, reportCount) {
            if (err) { console.error(err); }

            theCounts.reports = reportCount;
            // get all dashboards
            var Dashboardsv2 = connection.model('Dashboardsv2');
            Dashboardsv2.countDocuments({ companyID: companyID, owner: req.user._id, nd_trash_deleted: false }, function (err, dashCount) {
                if (err) { console.error(err); }

                theCounts.dashBoards = dashCount;
                // get all pages
                var Pages = connection.model('Pages');
                Pages.countDocuments({ companyID: companyID, owner: req.user._id, nd_trash_deleted: false }, function (err, pageCount) {
                    if (err) { console.error(err); }

                    theCounts.pages = pageCount;
                    // get all datasources
                    var DataSources = connection.model('DataSources');
                    DataSources.countDocuments({ companyID: companyID, nd_trash_deleted: false }, function (err, dtsCount) {
                        if (err) { console.error(err); }

                        theCounts.dataSources = dtsCount;
                        // get all layers
                        var Layers = connection.model('Layers');
                        Layers.countDocuments({ companyID: companyID, nd_trash_deleted: false }, function (err, layersCount) {
                            if (err) { console.error(err); }

                            theCounts.layers = layersCount;
                            // get all users
                            var Users = connection.model('Users');
                            Users.countDocuments({ companyID: companyID, nd_trash_deleted: false }, function (err, usersCount) {
                                if (err) { console.error(err); }

                                theCounts.users = usersCount;
                                // get all roles
                                var Roles = connection.model('Roles');
                                Roles.countDocuments({ companyID: companyID, nd_trash_deleted: false }, function (err, rolesCount) {
                                    if (err) { console.error(err); }

                                    theCounts.roles = rolesCount;
                                    // send the response
                                    res.status(200).json(theCounts);
                                });
                            });
                        });
                    });
                });
            });
        });
    } else {
        // get all reports
        Reports.countDocuments({ companyID: companyID, owner: req.user._id, nd_trash_deleted: false }, function (err, reportCount) {
            if (err) { console.error(err); }

            theCounts.reports = reportCount;
            // get all dashboards
            var Dashboards = connection.model('Dashboardsv2');
            Dashboards.countDocuments({ companyID: companyID, owner: req.user._id, nd_trash_deleted: false }, function (err, dashCount) {
                if (err) { console.error(err); }

                theCounts.dashBoards = dashCount;
                // get all pages
                var Pages = connection.model('Pages');
                Pages.countDocuments({ companyID: companyID, owner: req.user._id, nd_trash_deleted: false }, function (err, pageCount) {
                    if (err) { console.error(err); }

                    theCounts.pages = pageCount;
                    res.status(200).json(theCounts);
                });
            });
        });
    }
};

exports.getCountsForUser = function (req, res) {
    var userID = req.query.userID;
    var companyID = req.user.companyID;
    var theCounts = {};

    // get all reports
    var Reports = connection.model('Reports');
    Reports.countDocuments({ companyID: companyID, owner: userID, isPublic: true, nd_trash_deleted: false }, function (err, reportCount) {
        if (err) { console.error(err); }

        theCounts.publishedReports = reportCount;
        // get all dashboards
        var Dashboards = connection.model('Dashboardsv2');
        Dashboards.countDocuments({ companyID: companyID, owner: userID, isPublic: true, nd_trash_deleted: false }, function (err, dashCount) {
            if (err) { console.error(err); }

            theCounts.publishedDashBoards = dashCount;

            Reports.countDocuments({ companyID: companyID, owner: userID, isPublic: false, nd_trash_deleted: false }, function (err, privateReportCount) {
                if (err) { console.error(err); }

                theCounts.privateReports = privateReportCount;

                var Dashboards = connection.model('Dashboardsv2');
                Dashboards.countDocuments({ companyID: companyID, owner: userID, isPublic: false, nd_trash_deleted: false }, function (err, privateDashCount) {
                    if (err) { console.error(err); }

                    theCounts.privateDashBoards = privateDashCount;
                    res.status(200).json(theCounts);
                });
            });
        });
    });
};

exports.getUserReports = function (req, res) {
    var page = (req.query.page) ? req.query.page : 1;
    var userID = req.query.userID;
    var companyID = req.user.companyID;
    var Reports = connection.model('Reports');
    Reports.find({ companyID: companyID, owner: userID, nd_trash_deleted: false }, { reportName: 1, parentFolder: 1, isPublic: 1, reportType: 1, reportDescription: 1, status: 1 }, function (err, reports) {
        if (err) { console.error(err); }

        res.status(200).json({ result: 1, page: page, pages: 1, items: reports });
    });
};

exports.getUserDashboards = function (req, res) {
    var page = (req.query.page) ? req.query.page : 1;
    var userID = req.query.userID;
    var companyID = req.user.companyID;
    var Dashboards = connection.model('Dashboardsv2');
    Dashboards.find({ companyID: companyID, owner: userID, nd_trash_deleted: false }, { dashboardName: 1, parentFolder: 1, isPublic: 1, dashboardDescription: 1, status: 1 }, function (err, privateDashCount) {
        if (err) { console.error(err); }

        res.status(200).json({ result: 1, page: page, pages: 1, items: privateDashCount });
    });
};

exports.getUserPages = function (req, res) {
    var page = (req.query.page) ? req.query.page : 1;
    var userID = req.query.userID;
    var companyID = req.user.companyID;
    var Pages = connection.model('Pages');
    Pages.find({ companyID: companyID, owner: userID, nd_trash_deleted: false }, { pageName: 1, parentFolder: 1, isPublic: 1, dashboardDescription: 1, status: 1 }, function (err, pages) {
        if (err) { console.error(err); }

        res.status(200).json({ result: 1, page: page, pages: 1, items: pages });
    });
};

exports.getUserData = function (req, res) {
    var Companies = connection.model('Companies');
    Companies.findOne({ companyID: req.user.companyID, nd_trash_deleted: false }, {}, function (err, company) {
        if (err) { console.error(err); }

        var theUserData = {};
        theUserData.companyData = req.user.companyData;
        theUserData.companyID = req.user.companyID;
        theUserData.contextHelp = req.user.contextHelp;
        theUserData.dialogs = req.user.dialogs;
        theUserData.filters = req.user.filters;
        theUserData.privateSpace = req.user.privateSpace;
        theUserData.roles = req.user.roles;
        theUserData.rolesData = req.user.rolesData;
        theUserData.status = req.user.status;
        theUserData.userName = req.user.userName;

        var createReports = false;
        var createDashboards = false;
        var createPages = false;
        var isWSTADMIN = false;
        var exploreData = false;
        var viewSQL = false;
        var publishReports = false;
        var publishDashboards = false;
        var canPublish = false;

        if (req.isAuthenticated()) {
            for (var i in req.user.roles) {
                if (req.user.roles[i] === 'WSTADMIN') {
                    isWSTADMIN = true;
                    createReports = true;
                    createDashboards = true;
                    createPages = true;
                    exploreData = true;
                    viewSQL = true;
                    canPublish = true;
                    publishReports = true;
                    publishDashboards = true;

                    req.session.reportsCreate = createReports;
                    req.session.dashboardsCreate = createDashboards;
                    req.session.exploreData = exploreData;
                    req.session.viewSQL = viewSQL;
                    req.session.isWSTADMIN = isWSTADMIN;
                    req.session.canPublish = canPublish;
                    req.session.publishReports = publishReports;
                    req.session.publishDashboards = publishDashboards;

                    theUserData.reportsCreate = createReports;
                    theUserData.dashboardsCreate = createDashboards;
                    theUserData.exploreData = exploreData;
                    theUserData.viewSQL = viewSQL;
                    theUserData.isWSTADMIN = isWSTADMIN;
                    theUserData.canPublish = canPublish;
                    theUserData.publishReports = publishReports;
                    theUserData.publishDashboards = publishDashboards;
                }
            }
        }

        if (req.user.roles.length > 0 && !isWSTADMIN) {
            var Roles = connection.model('Roles');
            Roles.find({ _id: { $in: req.user.roles } }, {}, function (err, roles) {
                if (err) { console.error(err); }

                req.session.rolesData = roles;

                for (var i in roles) {
                    if (roles[i].reportsCreate) { createReports = true; }
                    if (roles[i].dashboardsCreate) { createDashboards = true; }
                    if (roles[i].pagesCreate) { createPages = true; }
                    if (roles[i].exploreData) { exploreData = true; }
                    if (roles[i].viewSQL) { viewSQL = true; }
                    if (roles[i].reportsPublish) { publishReports = true; }
                    if (roles[i].dashboardsPublish) { publishDashboards = true; }
                }

                req.session.reportsCreate = createReports;
                req.session.dashboardsCreate = createDashboards;
                req.session.pagesCreate = createPages;
                req.session.exploreData = exploreData;
                req.session.viewSQL = viewSQL;
                req.session.isWSTADMIN = isWSTADMIN;
                req.session.canPublish = canPublish;
                req.session.publishReports = publishReports;
                req.session.publishDashboards = publishDashboards;

                theUserData.reportsCreate = createReports;
                theUserData.dashboardsCreate = createDashboards;
                theUserData.exploreData = exploreData;
                theUserData.viewSQL = viewSQL;
                theUserData.isWSTADMIN = isWSTADMIN;
                theUserData.canPublish = canPublish;
                theUserData.publishReports = publishReports;
                theUserData.publishDashboards = publishDashboards;

                res.status(200).json({ result: 1, page: 1, pages: 1, items: { user: theUserData, companyData: company, rolesData: roles, reportsCreate: createReports, dashboardsCreate: createDashboards, pagesCreate: createPages, exploreData: exploreData, viewSQL: viewSQL } });
            });
        } else {
            // var user = (req.user) ? req.user : false;
            res.status(200).json({ result: 1, page: 1, pages: 1, items: { user: theUserData, companyData: company, rolesData: [], reportsCreate: createReports, dashboardsCreate: createDashboards, pagesCreate: createPages, exploreData: exploreData, viewSQL: viewSQL, isWSTADMIN: isWSTADMIN } });
        }
    });
};
exports.getUserOtherData = function (req, res) {
    var Users = connection.model('Users');
    Users.findOne({ _id: req.user._id }, {}, function (err, user) {
        if (err) { console.error(err); }

        res.status(200).json({ result: 1, page: 1, pages: 1, items: user });
    });
};

exports.getUserObjects = async function (req, res) {
    const Companies = connection.model('Companies');
    const query = {
        'companyID': req.user.companyID,
        'nd_trash_deleted': false
    };
    const company = await Companies.findOne(query).exec();

    const folders = company.publicSpace;

    let canPublish = false;
    if (req.session.isWSTADMIN) {
        canPublish = true;
        await getFolderStructureForWSTADMIN(folders, 0);
    } else {
        if (req.user.roles.length > 0) {
            const Roles = connection.model('Roles');
            const query = {
                '_id': { '$in': req.user.roles },
                'companyID': req.user.companyID
            };
            const roles = await Roles.find(query).lean().exec();

            canPublish = await navigateRoles(folders, roles);
        }
    }

    const reports = await getNoFolderReports();
    reports.forEach(report => folders.push(report));

    const dashboards = await getNoFolderDashboards();
    dashboards.forEach(dashboard => folders.push(dashboard));

    const pages = await getNoFolderPages();
    pages.forEach(page => folders.push(page));

    const body = {
        result: 1,
        page: 1,
        pages: 1,
        items: folders,
        userCanPublish: canPublish
    };
    res.status(200).json(body);
};

async function navigateRoles (folders, rolesData) {
    var canPublish = false;

    for (const r in rolesData) {
        if (!rolesData[r].grants || rolesData[r].grants.length === 0) {
            rolesData.splice(r, 1);
        }
    }

    for (const r in rolesData) {
        for (const g in rolesData[r].grants) {
            var theGrant = rolesData[r].grants[g];

            const publish = await setGrantsToFolder_v2(folders, theGrant);
            if (publish) {
                canPublish = true;
            }
        }
    }

    return canPublish;
}

async function setGrantsToFolder_v2 (folders, grant) {
    var publish = false;

    for (var i in folders) {
        const folder = folders[i];
        if (folder.id === grant.folderID) {
            folder.grants = grant;

            if (grant.publishReports === true) {
                publish = true;
            }

            const reports = await getReportsForFolder(grant.folderID, grant);
            reports.forEach(report => folder.nodes.push(report));

            const dashboards = await getDashboardsForFolder(grant.folderID, grant);
            dashboards.forEach(dashboard => folder.nodes.push(dashboard));

            const pages = await getPagesForFolder(grant.folderID, grant);
            pages.forEach(page => folder.nodes.push(page));

            return publish;
        } else {
            if (folder.nodes && folder.nodes.length > 0) {
                return setGrantsToFolder_v2(folder.nodes, grant);
            }
        }
    }
}

async function getFolderStructureForWSTADMIN (folders, index) {
    const folder = folders[index];

    if (folder) {
        if (!folder.nodes) {
            folder.nodes = [];
        }

        await getFolderStructureForWSTADMIN(folder.nodes, 0);

        folder.grants = {
            folderID: folder.id,
            executeDashboards: true,
            executeReports: true,
            executePages: true,
            publishReports: true
        };

        const reports = await getReportsForFolder(folder.id, folder.grants);
        reports.forEach(report => folder.nodes.push(report));

        const dashboards = await getDashboardsForFolder(folder.id, folder.grants);
        dashboards.forEach(dashboard => folder.nodes.push(dashboard));

        const pages = await getPagesForFolder(folder.id, folder.grants);
        pages.forEach(page => folder.nodes.push(page));

        await getFolderStructureForWSTADMIN(folders, index + 1);
    }
}

async function getReportsForFolder (idfolder, grant) {
    var nodes = [];

    if (!grant || grant.executeReports) {
        const Reports = connection.model('Reports');

        const query = {
            'nd_trash_deleted': false,
            'companyID': 'COMPID',
            'parentFolder': idfolder,
            'isPublic': true
        };
        const projection = { reportName: 1, reportType: 1, reportDescription: 1 };

        const reports = await Reports.find(query).select(projection).exec();
        nodes = reports.map(report => ({
            id: report._id,
            title: report.reportName,
            nodeType: 'report',
            description: report.reportDescription,
            nodeSubtype: report.reportType,
            nodes: []
        }));
    }

    return nodes;
}

async function getDashboardsForFolder (idfolder, grant) {
    var nodes = [];

    if (!grant || grant.executeDashboards) {
        const Dashboards = connection.model('Dashboardsv2');

        const query = {
            'nd_trash_deleted': false,
            'companyID': 'COMPID',
            'parentFolder': idfolder,
            'isPublic': true
        };
        const projection = { dashboardName: 1, dashboardDescription: 1 };

        const dashboards = await Dashboards.find(query).select(projection).exec();
        nodes = dashboards.map(dashboard => ({
            id: dashboard._id,
            title: dashboard.dashboardName,
            description: dashboard.dashboardDescription,
            nodeType: 'dashboard',
            nodes: []
        }));
    }

    return nodes;
}

async function getPagesForFolder (idfolder, grant) {
    var nodes = [];

    if (!grant || grant.executePages) {
        const Pages = connection.model('Pages');

        const query = {
            'nd_trash_deleted': false,
            'companyID': 'COMPID',
            'parentFolder': idfolder,
            'isPublic': true
        };
        const projection = { pageName: 1, pageDescription: 1 };

        const pages = await Pages.find(query).select(projection).exec();
        nodes = pages.map(page => ({
            id: page._id,
            title: page.pageName,
            nodeType: 'page',
            description: page.pageDescription,
            nodes: []
        }));
    }

    return nodes;
}

async function getNoFolderReports () {
    return getReportsForFolder('root');
}

async function getNoFolderDashboards () {
    return getDashboardsForFolder('root');
}

async function getNoFolderPages () {
    return getPagesForFolder('root');
}

exports.getUserLastExecutions = function (req, res) {
    var statistics = connection.model('statistics');

    let find;
    if (req.session.isWSTADMIN) {
        find = { action: 'execute' };
    } else {
        find = { '$and': [{ userID: '' + req.user._id + '' }, { action: 'execute' }] };
    }

    // Last executions

    statistics.aggregate([
        { $match: find },
        { $group: {
            _id: { relationedID: '$relationedID',
                type: '$type',
                relationedName: '$relationedName',
                action: '$action' },
            lastDate: { $max: '$createdOn' }
        } },
        { $sort: { lastDate: -1 } }
    ], function (err, lastExecutions) {
        if (err) {
            console.log(err);
            return;
        }

        statistics.aggregate([
            { $match: find },
            { $group: {
                _id: { relationedID: '$relationedID',
                    type: '$type',
                    relationedName: '$relationedName',
                    action: '$action' },
                count: { $sum: 1 }
            } },
            { $sort: { count: -1 } }
        ], function (err, mostExecuted) {
            if (err) {
                console.log(err);
                return;
            }
            var mergeResults = { theLastExecutions: lastExecutions, theMostExecuted: mostExecuted };
            res.status(200).json({ result: 1, page: 1, pages: 1, items: mergeResults });
        });
    });
};
