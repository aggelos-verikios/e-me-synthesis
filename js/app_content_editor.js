// Do the CTI staff after document.ready
$(document).ready(function(){
  i18next.use(i18nextXHRBackend)
         .use(i18nextLocalStorageCache)
         .use(i18nextBrowserLanguageDetector)
         .init(i18nextOptions, function(err, t){
                 $(document).trigger('afterready');
         });
});

var extdevtoken="verik9*7F4V23(9@!";

// teacher verikiost
//var logged_user="verikiost";
//var extusertoken="verikt(24!9g";

// student verikioss
//var logged_user="verikioss";
//var extusertoken= "veriks1!3@*(";

//ΜΟΝΟ ΓΙΑ ΧΡΗΣΗ, ΟΧΙ ΕΠΕΞΕΡΓΑΣΙΑ
var root_url='https://dev.e-me.edu.gr';
var api_url='https://api.dev.e-me.edu.gr';

function addtokens(req) {
    req.setRequestHeader("extdevtoken",extdevtoken);
    req.setRequestHeader("extusertoken",extusertoken);
    req.setRequestHeader("Accept-Language","el-GR");

    return req;
}

function handleError(request) {
    var request_json = $.parseJSON(request.responseText).meta;
    if (request_json.code == '401') {
        window.location.href = root_url;
    } else {
        var error_msg = '';
        var request_json = $.parseJSON(request.responseText).meta;
        if (request_json.error_msg instanceof Array) {
            _.each(request_json.error_msg, function(error) {
                error_msg += error.msg + '<br>';
            });
        } else {
            error_msg = request_json.error_msg;
        }
        alert(error_msg);
    }
}


function getApiCall(url_part, successCallback, params) {
    $.support.cors = true;
    $.ajax({
        url : api_url + '/v1' + url_part,
        type : 'GET',
        contentType : "application/json",
        beforeSend : addtokens,
        success : function(data, status, xhr) {
            if (params) {
                if (params.length == 1) {
                    successCallback(data, params[0]);
                } else if (params.length == 2) {
                    successCallback(data, params[0], params[1]);
                } else if (params.length == 3) {
                    successCallback(data, params[0], params[1],
                            params[2]);
                } else if (params.length == 4) {
                    successCallback(data, params[0], params[1],
                            params[2], params[3]);
                }
            } else {
                successCallback(data);
            }
        },
        statusCode : {
            403 : function() {
                window.location.href = root_url + "/forbidden";
            },
            404 : function() {
                window.location.href = root_url + "/404";
            },
        },
        error : function(request, status, error) {
            if (window.location.href.indexOf("users/" + logged_user
                    + "/profile") > -1) {
                window.location.href = root_url + "/404";
                console.log(error);
            } else {
                handleError(request);
            }
        }
    });
}

function putNewApiCall(url_part,put_data,successCallback,success_message,params){
    params=(params)?params:null;
    $.support.cors = true;
    $.ajax({
          url: api_url+'/v1'+url_part,
          type: 'PUT',
          contentType: "application/json",
          beforeSend:addtokens,
          data: put_data,
          success: function(data,status) {
            if(data){
              successCallback(data,params);
            }else{
              successCallback(params);
            }
          },
          error: function (request, status, error) {
              handleError(request);
          }
    });
}

function postNewApiCall(url_part, post_data, successCallback, success_message, params){
    params=(params)?params:null;

    $.support.cors = true;
    $.ajax({
          url: api_url+'/v1'+url_part,
          type: 'POST',
          contentType: "application/json",
          beforeSend:addtokens,
          data: post_data,
          success: function(data,status) {
            if(data){
              successCallback(data,params);
            }else{
              successCallback(params);
            }
          },
          error: function (request, status, error) {
              handleError(request);
          }
    });
}

function deleteNewApiCall(url_part,successCallback,success_message,params){
    params=(params)?params:null;
    $.support.cors = true;
    $.ajax({
          url: api_url+'/v1'+url_part,
          type: 'DELETE',
          beforeSend:addtokens,
          contentType: "application/json",
          success: function(data, status) {
            if(successCallback!=null){
               successCallback(data,params);
            }
          },
          error: function (request, status, error) {
              handleError(request);
          }
    });
}

// ----------------------------------------------------------------------------
// e-me Synthesis app code
// ----------------------------------------------------------------------------

var ContentEditor = { };

/**
 * A cache of user and hive data.
 */
ContentEditor.Cache = new function () {
    var self = this;

    self.userCache = { };

    self.hiveCache = { };

    // Return the cached data for the hive with the specified hid
    self.getHive = function(hid) {
        return self.hiveCache[hid];
    };

    // Set the cached data for the hive with the specified hid
    self.putHive = function(hid, data) {
        self.hiveCache[hid] = data;
        return self;
    };

    // Empty the hive cache
    self.emptyHiveCache = function() {
        self.hiveCache = { };
        return self;
    };

    // Return the cached data for the user with the specified uid
    self.getUser = function(uid) {
        return self.userCache[uid];
    };

    // Set the cached data for the user with the specified uid
    self.putUser = function(uid) {
        self.userCache[uid] = data;
        return self;
    };

    // Empty the user cache
    self.emptyUserCache = function() {
        self.userCache = { };
        return self;
    };
};

/**
 * Define the default option values for the e-me ApiHelper
 */
var ApiHelperDefaults= {
    api: '/ext/apps/app_content_editor/content/',
    profile: '/users/$uid/profile/',
    settings: '/users/$uid/settings/',
    contacts: '/users/$uid/contacts/',
    hive: '/groups/$hid',
    hives: '/users/$uid/groups/',
    all_hives: '/groups?type=hive',
};

/**
 * e-me api helper singleton. Wraps over more primitive get/put/post ApiCall
 * functions and provides a unique point for parameterizing urls.
 */
var ApiHelper = new (function (){
    var self = this;

    // Options, created by deep-copy extending the defaults by user options
    self.options = $.extend(true, {}, ApiHelperDefaults);

    // Extend current options with the specified options
    self.setOptions = function(options) {
        self.options = $.extend(true, self.options, ApiHelperDefaults);
        return self;
    };

    // Get data about the user with the specified id, and feed them to the
    // specified callback function.
    self.getUser = function(uid, callback) {
        getApiCall(self.options.profile.replace('$uid', uid), callback);
        return self;
    };

    // Get data about the hive with the specified slug, and feed them to the
    // specified callback function.
    self.getHive = function(hid, callback) {
        getApiCall(self.options.hive.replace('$hid', hid), callback);
        return self;
    };

    // Get data about the hive with the specified slug, and feed them to the
    // specified callback function.
    self.getAllHives = function(callback) {
        getApiCall(self.options.all_hives, callback);
        return self;
    };

    // Get data about the hive with the specified slug, and feed them to the
    // specified callback function.
    self.getAllHives = function(callback) {
        getApiCall(self.options.all_hives, callback);
        return self;
    };
});

/**
 * Define the file permission codes. More permissieve codes include as a bitmask
 * the less permissive ones.
 */
var Permission = {
    NONE: 0,
    READ: 1,
    EDIT: 3,
    MANAGE: 7,
};

/**
 * Define the user category literals expected by the e-me platform.
 */
var UserCategory = {
    ADMINS: "admins",
    HELPERS: "helpers",
    MEMBERS: "members",
    FOLLOWERS: "followers",
};

/**
 * Define the Knockout view model of the e-me document permissions.
 *
 * @param uid  user id
 * @param pid  permission id (see Permission object for values)
 * @param isHive  truthvalue of whether this is a hive permission
 */
function PermissionModel(uid, pid, isHive) {
    var self = this;

    isHive = (isHive === true);

    // Either user or hive id
    self.uid = uid;

    // Hive slug - unused for the moment
    self.slug = null;

    // Permission id
    self.pid = ko.observable(pid);

    // User or hive display name
    self.name = ko.observable(uid);

    // User role
    self.role = ko.observable();

    // Truthvalue of whether this permission is applicable to a single user
    self.isUser = ko.observable(!isHive);

    // Truthvalue of whether this permission is applicable to a single hive
    self.isHive = ko.observable(isHive);

    // Permission level for hive admins
    self.admins = ko.observable(Permission.NONE);

    // Permission level for hive members
    self.members = ko.observable(Permission.NONE);

    // Permission level for hive helpers
    self.helpers = ko.observable(Permission.NONE);

    // Permission level for hive followers
    self.followers = ko.observable(Permission.NONE);

    // Deserialize hive user group data
    self.deserializeHiveGroups = function(groups, permissionLevel) {
        if (groups instanceof Array) {
            for (var i = 0; i < groups.length; i++) {
                var group = groups[i];

                if (group == UserCategory.ADMINS)
                    self.admins(permissionLevel);

                if (group == UserCategory.HELPERS)
                    self.helpers(permissionLevel);

                if (group == UserCategory.MEMBERS)
                    self.members(permissionLevel);

                if (group == UserCategory.FOLLOWERS)
                    self.followers(permissionLevel);
            }
        }

        return self;
    };

    // Serialize this permission object to the format expected by the e-me server
    // and store the result in the specified privacy object.
    self.serialize = function(privacy) {
        if (self.isUser()) {
            self.serializeSimple(privacy, self.pid());
        }
        else if (self.isHive()) {
            self.serializeSimple(privacy, self.admins(), UserCategory.ADMINS);
            self.serializeSimple(privacy, self.helpers(), UserCategory.HELPERS);
            self.serializeSimple(privacy, self.members(), UserCategory.MEMBERS);
            self.serializeSimple(privacy, self.followers(), UserCategory.FOLLOWERS);
        }

        return self;
    }

    // Handles a simple serialization case of either a user permission or
    // single hive group permission for the specified permission level,
    // and stores the result in the specified privacy object.
    self.serializeSimple = function(privacy, pid, group) {
        if (pid == Permission.MANAGE) {
            if (!privacy.manage)
                privacy.manage = { };

            if (self.isUser())
                self.serializeUser(privacy.manage);
            else if (self.isHive())
                self.serializeHiveGroup(privacy.manage, group);

            // Users with MANAGE permission also get EDIT and READ
            pid = Permission.EDIT;
        }

        if (pid == Permission.EDIT) {
            if (!privacy.edit)
                privacy.edit = { };

            if (self.isUser())
                self.serializeUser(privacy.edit);
            else if (self.isHive())
                self.serializeHiveGroup(privacy.edit, group);

            // Users with EDIT permission also get READ permission
            pid = Permission.READ;
        }

        if (pid == Permission.READ) {
            if (!privacy.read)
                privacy.read = { };

            if (self.isUser())
                self.serializeUser(privacy.read);
            else if (self.isHive())
                self.serializeHiveGroup(privacy.read, group);
        }

        return self;
    };

    // Serialize this user permission to the format expected by the e-me server
    // and store the result in the specified container object.
    self.serializeUser = function(container) {
        if (!container.users)
            container.users = [];

        container.users.push(self.uid);
        return self;
    };

    // Serialize this hive group permission to the format expected by the e-me server
    // and store the result in the specified container object.
    self.serializeHiveGroup = function(container, group) {
        if (!container.hives) {
            container.hives = { };
        }

        if (!container.hives.hive_ids) {
            container.hives.hive_ids = { };
        }

        if (!container.hives.hive_ids[self.uid])
            container.hives.hive_ids[self.uid] = [];

        container.hives.hive_ids[self.uid].push(group);

        return self;
    };

    return self;
}

/**
 * Helper function - make a permission with the specified level for the user
 * with the specified id. It asynchronously gets the user display name.
 *
 * @param uid   the user id
 * @param pid   the permission id (see Permission object for values)
 * @returns     a new PermissionModel object
 */
function makeUserPermission(uid, pid) {
    var permission = new PermissionModel(uid, pid);

    ApiHelper.getUser(uid, function(json) {
        var profile = json.data.profile;
        permission.name(profile.name + ' ' + profile.surname);
        permission.role(profile.role == 'teacher' ? 'Εκπαιδευτικός' : 'Μαθητής');
    });

    return permission;
}

/**
 * Helper function - make a permission with the specified level for the hive
 * with the specified id (which is actually the hive slug).
 * It asynchronously gets the hive display name.
 * FIXME:: until the slug issue is solved, it retrieves hive data from cache
 *
 * @param hid   hive slug
 * @param pid   the permission id (see Permission object for values)
 * @returns     a new PermissionModel object
 */
function makeHivePermission(hid, pid) {
    var permission = new PermissionModel(hid, pid, true);

    ApiHelper.getHive(hid, function(json) {
        var hive = json.data;
        permission.name(hive.name);
    });

    return permission;
}

/**
 * Define the knockout.js view model for the documents of the e-me Synthesis App
 *
 * @param uid       current user id
 * @param jsonData  optional raw json document data
 */
function DocumentModel(uid, jsonData) {
    var self = this;

    // User id
    self.uid = uid;

    // Document id
    self.id = ko.observable();

    // Document title
    self.title = ko.observable();

    // Copy of the title of currently edited document
    self.titleCopy = ko.observable();

    // Document content
    self.content = ko.observable();

    // Template to use for rendering document
    self.template = ko.observable();

    // Document API version
    self.version = ko.observable();

    // Following data are transient

    // Set of ids of user having permissions on this document
    self.users = {};

    // Set of slugs of hives having permissions on this document
    self.hives = {};

    // Document user permissions
    self.permissions = ko.observableArray([]);

    // Return an indication of the document size
    self.size = ko.pureComputed(function() {
        return self.content() ? self.content().length : 0;
    });

    // Date that the document was last updated
    self.createdDate = ko.observable();

    // Time that the document was last updated
    self.createdTime = ko.observable();

    // Date that the document was last updated
    self.modifiedDate = ko.observable();

    // Time that the document was last updated
    self.modifiedTime = ko.observable();

    // Thruthvalue of whether current user can manage the document
    self.userCanManage = ko.observable(false);

    // Thruthvalue of whether current user can edit the document
    self.userCanEdit = ko.observable(false);

    // Thruthvalue of whether current user can read the document
    self.userCanRead = ko.observable(false);

    // Thruthvalue of whether this document is shared among multiple users
    self.isShared = ko.observable(false);

    // Reset document to initial state
    self.reset = function() {
        self.id(null);
        self.title(null);
        self.titleCopy(null);
        self.content(null);
        self.template(null);
        self.version(null);

        self.users = {};
        self.hives = {};
        self.permissions([]);

        self.createdDate(null);
        self.createdTime(null);
        self.modifiedDate(null);
        self.modifiedTime(null);

        self.userCanManage(false);
        self.userCanEdit(false);
        self.userCanRead(false);
        self.isShared(false);
    };

    // Unpack server JSON response to current document data
    self.deserialize = function(json) {
        self.id(json._id);
        self.title(json.data.title);
        self.titleCopy(json.data.title);
        self.content(json.data.content);
        self.template(json.data.template);
        self.version(json.data.version);

        self.deserializeTimestamps(json);

        self.deserializePermissions(json.privacy);

        return self;
    };

    // Deserialization helper - convert document timestamps to date/time fields
    self.deserializeTimestamps = function(json) {
        var parts = json.doc_created.split('T');

       self.createdDate(parts[0]);
       self.createdTime(parts[1].split('.')[0]);

       parts = (json.doc_updated
                ? json.doc_updated
                : json.doc_created)
               .split('T');

        self.modifiedDate(parts[0]);
        self.modifiedTime(parts[1].split('.')[0]);
    };

    // Set the user access rights for this document
    self.deserializePermissions = function(privacy) {
        self.users = {};
        self.hives = {};
        self.permissions([]);
        self.isShared(false);

        console.log('deserializePermissions - privacy:');
        console.log(privacy);

        if (privacy) {
            if (privacy.read)
                self.deserializePermissionLevel(privacy.read, Permission.READ);

            if (privacy.edit)
                self.deserializePermissionLevel(privacy.edit, Permission.EDIT);

            if (privacy.manage)
                self.deserializePermissionLevel(privacy.manage, Permission.MANAGE);
        }
        else {
            // No privacy data given, assume Read permission for current user
            self.addUserPermission(self.uid, Permission.READ);
        }

        if (!self.isShared()
            && (self.permissions.length > 1
                || (self.permissions.length <= 1 && !self.userCanManage())))
            self.isShared(true);

        return self;
    }

    // Deserialize server JSON response data of the specified level
    // (either READ, EDIT, or MANAGE) to PermissionModel objects.
    self.deserializePermissionLevel = function(container, permissionLevel) {
        if (container.users) {
            for (var i = 0; i < container.users.length; i++) {
                var uid = container.users[i];
                self.addUserPermission(uid, permissionLevel);
            }
        }

        if (container.hives && container.hives.hive_ids) {
            var hive_ids = container.hives.hive_ids;
            for (var hid in hive_ids) {
                console.log(hive_ids);
                if (hive_ids.hasOwnProperty(hid)) {
                    self.addHivePermission(hid, permissionLevel, hive_ids[hid]);
                }
            }
        }
    };

    // Add the user with the specified user id to the list of users having
    // permissions on this document, with the specified level of access
    self.addUserPermission = function(uid, level) {
        if (!self.users[uid]) {
            var permission = makeUserPermission(uid, level);
            self.users[uid] = permission;
            self.permissions.push(permission);
        }
        else {
            self.users[uid].pid(level);
        }

        if (self.uid == uid) {
            self.userCanManage(level >= Permission.MANAGE);
            self.userCanEdit(level >= Permission.EDIT);
            self.userCanRead(level >= Permission.READ);
        }
        else {
            self.isShared(true);
        }
    };

    // Add the hive with the specified hive id to the list of hives having
    // permissions on this document, with the specified level of access
    // for the specified groups of hive users.
    self.addHivePermission = function(hid, level, groups) {
        if (!self.hives[hid]) {
            var permission = makeHivePermission(hid, level);
            permission.deserializeHiveGroups(groups, level);

            self.hives[hid] = permission;
            self.permissions.push(permission)
        }
        else {
            self.hives[hid].deserializeHiveGroups(groups, level);
        }

        self.isShared(true);
    };

    // Remove the specified permission from the list of the current document permissions
    // The permission is not removed if its the last user permission.
    // Returns true if the permission was removed
    self.removePermission = function(permission) {
        if (permission.isUser()) {
            var uid = permission.uid;
            if (self.isLastUserPermission(uid)) {
                return false;
            }

            self.users[uid] = undefined;
        }
        else {
            // hive permission
            self.hives[hid] = undefined;
        }

        self.permissions.remove(permission);
        return true;
    };

    // The following are helper functions that do:
    //   - packing document data to structures that are send to the server,
    //   - unpacking server JSON response to document data

    // Return the data structure for saving the current document data
    self.serializePermissions = function() {

        // var privacy = {};
        // Bug: initialize privacy structure as a whole, otherwise hive permission
        // are not deleted properly.
        var privacy = {
            read: { users: [], hives: { hive_ids: {} } },
            edit: { users: [], hives: { hive_ids: {} } },
            manage: { users: [], hives: { hive_ids: {} } },
        };

        console.log('serializePermissions - permissions:');
        console.log(ko.mapping.toJSON(self.permissions));

        var length = self.permissions().length;
        for (var i = 0; i < length; i++) {
            self.permissions()[i].serialize(privacy);
        }

        console.log('serializePermissions - resulting privacy:');
        console.log(privacy);

        return privacy;
    };

    // Return the data structure for saving the current document data
    self.serialize = function() {
        return {
            data: {
                title: self.title(),
                content: self.content(),
                template: self.template(),
                version: self.version()
            },
        };
    };

    // Return the data structure for saving new document data
    self.serializeNew = function(template) {
        return {
            data: {
                title: template.new_document_title,
                content: template.new_document_content,
                template: template.new_document_template,
                version: template.new_document_version
            }
        };
    };

    // Return truthvalue of whether the specified user id is the last user
    // permission in the permissions observable array.
    self.isLastUserPermission = function(uid) {
        var permissions = self.permissions();
        for (var i = 0; i < permissions.length; i++) {
            if (permissions[i].isUser() && permissions[i].uid != uid)
                return false;
        }

        return true;
    };


    // Return truthvalue of whether the specified user id is included in
    // the permissions observable array. User id can in fact be a hive id.
    self.userHasPermission = function(uid) {
        var permissions = self.permissions();
        for (var i = 0; i < permissions.length; i++) {
            if (permissions[i].uid == uid)
                return true;
        }

        return false;
    };

    // Finally, initialize this document with the given jsonData, if any
    if (jsonData) {
        self.deserialize(jsonData);
    }
}

/**
 * Define the default option values for the e-me Synthesis Editor App
 */
var appContentEditorDefaults = {
    // Templates - some of them are plain text, some are html,
    // and some are DOM IDs of elements containing html.
    template: {
        // Title of newly created document
        new_document_title: 'Νέο έγγραφο',

        // Content of newly created document
        new_document_content: '<p>Καλώς ορίσατε στο νέο σας έγγραφο.</p>',

        // API version of Content Editor app used to create the document
        new_document_version: '1.0',

        // CSS template used to create the document
        new_document_template: null,

        // Template DOM ID to use for displaying documents as a list
        doc_list_template_id: 'document_index_list_view',

        // Template DOM ID to use for displaying documents as a grid
        doc_grid_template_id: 'document_index_grid_view',
    },

    // Panel DOM IDs
    panel: {
        home: 'app_home',
        invalid_hash: 'invalid_hash',
        list: 'document_index',
        edit: 'document_edit',
        info: 'document_info',
        help: 'app_help',
        templates: 'template_index',
    },

    url: {
        api: '/ext/apps/app_content_editor/content/',
        profile: '/users/$uid/profile/',
        settings: '/users/$uid/settings/',
        contacts: '/users/$uid/contacts/',
        hives: '/users/$uid/groups/',
        translations: 'translations/el.json',
    },

    // Hash routes
    hash: {
        home: '#/',
        help: '#/help',
        index: '#/index',
        templates: '#/templates',
        edit: '#/:document_id/edit',
        info: '#/:document_id/info',
    },

    // ContentTools editor toolbox tools
    tools: [
        [
            'bold',
            'italic',
            'link',
            'align-left',
            'align-center',
            'align-right'
        ], [
            'heading',
            'subheading',
            'paragraph',
            'unordered-list',
            'ordered-list',
            'table',
            'indent',
            'unindent',
            'line-break'
        ], [
            //'image',
            'video',
            'preformatted'
        ], [
            'undo',
            'redo',
            'remove'
        ]
    ],

    local: {
        copyTitle: "Αντιγραφο του ",
    },
};


/**
 * Define the knockout.js view model for the ContentTools Editor App
 *
 * @param userProfile the e-me structure that describes the profile
 *                    of the currently logged-in user
 * @param options     a structure to override default option values
 *                    see appContentEditorDefaults for details
 */
function AppContentEditorModel(userProfile, options) {
    var self = this;

    // Options, created by deep-copy extending the defaults by user options
    self.options = $.extend(true, {}, appContentEditorDefaults, options);

    self.uid = userProfile._id;

    // Fix parameterized urls
    self.options.url.profile = self.options.url.profile.replace('$uid', self.uid);
    self.options.url.settings = self.options.url.settings.replace('$uid', self.uid);
    self.options.url.contacts = self.options.url.contacts.replace('$uid', self.uid);
    self.options.url.hives = self.options.url.hives.replace('$uid', self.uid);

    // URL of the content editor app
    self.apiUrl = self.options.url.api;

    // Profile data of currently logged-in user
    self.userProfile = userProfile;

    // User contacts array
    self.contacts = ko.observableArray([]);

    // User selected contacts array
    self.selectedContacts = ko.observableArray([]);

    // User hives array
    self.hives = ko.observableArray([]);

    // User selected hives array
    self.selectedHives = ko.observableArray([]);

    // Thruthvalue of whether the user contacts dialog is visible
    self.isSelectContactsOpen = ko.observable(false);

    // Thruthvalue of whether the document info dialog is visible
    self.isDocumentInfoOpen = ko.observable(false);

    // DOM Identifier of currently displayd panel
    self.currentPanel = ko.observable(self.options.panel.list);

    // DOM ID of the template for displaying document lists (for example list/grid)
    self.docListTemplateId = ko.observable(self.options.template.doc_grid_template_id);

    // Document template array to display in the index panel
    self.templates = ko.observableArray([]);

    // Document template currently selected from the template array
    self.selectedTemplate = ko.observable();

    // Document array to display in the index panel
    self.documents = ko.observableArray([]);

    // Document currently selected from the document array
    self.selectedDocument = ko.observable();

    // Data of currently edited document
    self.document = new DocumentModel(self.uid);

    // Options for document user permissions
    self.permissionOptions = [
        { value: Permission.NONE, name: "Κανένα", },
        { value: Permission.READ, name: "Ανάγνωση", },
        { value: Permission.EDIT, name: "Επεξεργασία", },
        { value: Permission.MANAGE, name: "Διαχείριση", },
    ];

    // Whether or not editor is in edit mode
    self.inEditMode = ko.observable(false);

    // Content tools editor tool
    self.editor = ContentTools.EditorApp.get();

    // Disable alert on cancel/refresh
    //
    // ContentTools display an alert if, while editing a page, we attempt to
    // cancel the changes or refresh the page. This makes the management of
    // editor status difficult in single page applications like this.
    // So disable it and get done with it.
    ContentTools.CANCEL_MESSAGE = null;

    // Set the editor to use Greek language
    // Note the use of instead $.get of getApiCall
    $.get(self.options.url.translations, function(json) {
        ContentEdit.addTranslations('el', json);
        ContentEdit.LANGUAGE = 'el';
    });

    // Set the value of the currentPanel observable to be the specified panel.
    // While doing so, also close any showing modals and cancel edit mode.
    // This is the preferred way to switch between panels, since it can handle
    // the case when the user presses the browser back button while having a
    // modal window open.
    self.setCurrentPanel = function(panel) {
        $(".modal").modal('hide');
        self.cancelEdit();
        self.currentPanel(panel);
        return self;
    };

    // Return truthvalue of whether current panel is the document edit panel
    self.inEditPanel = ko.pureComputed(function() {
        return self.currentPanel() == self.options.panel.edit;
    });

    // Return truthvalue of whether current panel is the document list panel
    self.inListPanel = ko.pureComputed(function() {
        return self.currentPanel() == self.options.panel.list;
    });

    // Return truthvalue of whether document list template is grid view
    self.inGridView = ko.pureComputed(function() {
        return self.docListTemplateId() == self.options.template.doc_grid_template_id;
    });

    // Cycle between the list/grid templates for document lists
    self.cycleDocListTemplate = function() {
        self.docListTemplateId(self.inGridView()
                               ? self.options.template.doc_list_template_id
                               : self.options.template.doc_grid_template_id);
    };

    // Return truthvalue of whether to show the pencil (edit) icon in the menu
    self.showStartEditIcon = ko.pureComputed(function() {
        return self.document.userCanEdit() && !self.inEditMode();
    });

    // Return truthvalue of whether to show the save and cancel edit icons in the menu
    self.showStopEditIcons = ko.pureComputed(function() {
        return self.document.userCanEdit() && self.inEditMode();
    });

    //
    // Functions startEdit(), stopEdit() and cancelEdit() defined below
    // manually start, stop and cancel the ContentTools editor.
    //
    // This is needed in order to customize the UI (Edit/Save/Cancel buttons).
    // In addition, a CSS change is required in .ct-ignition class to hide it.
    //
    // For more information, see
    //   https://github.com/GetmeUK/ContentTools/issues/307
    //
    // The following information at stackoverflow is outdated:
    //   http://stackoverflow.com/questions/34645700/customise-edit-button-for-contenttools

    // Start editing current document
    self.startEdit = function() {
    	if (self.document.userCanEdit()) {
            if (self.inEditMode()) {
                self.cancelEdit();
            }

            self.editor.init('*[data-editable]', 'data-name');
            self.editor.addEventListener('saved', self.saveEventHandler);

            // Set the tools available to the editor
            // See https://github.com/GetmeUK/ContentTools/issues/173
            self.editor.toolbox().tools(self.options.tools);

            self.editor.start();
            self.inEditMode(true);
    	}

        return self;
    };

    // Stop editing current document, and save if saveChanges is not false
    self.stopEdit = function(saveChanges) {
        if (self.inEditMode()) {
            self.inEditMode(false);
            self.editor.stop(saveChanges !== false);
            self.editor.removeEventListener('saved', self.saveEventHandler);
        }

        return self;
    };

    // Stop editing current document, and discard changes
    self.cancelEdit = function() {
        return self.stopEdit(false);
    };

    // The following functions implement the actual logic of saving, loading
    // and deleting from the database.

    // Handler for the 'saved' event triggered by ContentTools
    self.saveEventHandler = function(ev) {
        console.log('saving - event data:');
        console.log(ev);

        // Check to see if there are any changes to save
        var regions = ev.detail().regions;
        if (Object.keys(regions).length == 0) {
            return;
        }

        // Refresh the documentContent() observable with the changed region contents
        if (regions.hasOwnProperty('content')) {
            self.document.content(regions['content']);
            self.saveDocument();
        }
    };

    // Create a "Copy of ..." document title, in preparation of a "save as" operation
    self.copyDocumentTitle = function() {
        self.document.titleCopy(self.options.local.copyTitle + self.document.title());

        return self;
    };

    // Undo changes to documentTitleCopy()
    self.undoDocumentTitle = function() {
        self.document.titleCopy(self.document.title());

        return self;
    };

    // Save changes to document title, if required
    self.renameDocument = function() {
        if (self.document.titleCopy() != self.document.title()) {
            self.document.title(self.document.titleCopy());
            self.saveDocument();
        }

        return self;
    };

    // Save current document
    self.saveDocument = function() {
    	if (self.document.userCanEdit()) {
            self.editor.busy(true);

            var data = JSON.stringify(self.document.serialize());
            putNewApiCall(self.apiUrl + self.document.id(), data, function() {
                self.editor.busy(false);
                //new ContentTools.FlashUI('ok');
            });
    	}

        return self;
    };

    // Create a new document
    self.createDocument = function() {
        var post_data = self.document.serializeNew(self.options.template);

        postNewApiCall(self.apiUrl, JSON.stringify(post_data), function(json) {
            self.document.deserialize(json.data);
            window.location.hash = '#/' + self.document.id() + '/edit';
        });

        return self;
    };

    // Create a new document by copying the contents of current document
    self.copyDocument = function() {
        if (self.document.titleCopy() != self.document.title()) {
            self.document.title(self.document.titleCopy());
        }

        var post_data = self.document.serialize();

        postNewApiCall(self.apiUrl, JSON.stringify(post_data), function(json) {
            self.document.deserialize(json.data);
            window.location.hash = '#/' + self.document.id() + '/edit';
        });

        return self;
    };

    // Load the document with the specified id
    self.loadDocument = function(document_id) {
        self.document.reset();

        getApiCall(self.apiUrl + document_id, function(json){
            console.log('----> self.loadDocument:');
            console.log(json);
            self.document.deserialize(json.data);
            self.selectedDocument(self.document);
        });

        return self;
    };

    // load all user documents and populate the self.documents() array observable
    self.loadDocuments = function() {
        self.documents([]);

        getApiCall(self.apiUrl, function(json) {
            if (json.data && json.data instanceof Array) {
                var l = json.data.length;

                for (var i = 0; i < l; i++) {
                    self.documents.push(new DocumentModel(self.uid, json.data[i]));
                }
            }
        });

        return self;
    };

    // Set the selected document to be the specified document. Rather redudant function.
    self.setSelectedDocument = function(document) {
        self.selectedDocument(document);
        return self;
    }

    // Delete the document identified by the self.selectedDocument() observable
    self.deleteSelectedDocument = function() {
        self.cancelEdit();

        var _id = self.selectedDocument().id();
        deleteNewApiCall(self.apiUrl + _id, function(json) {
            // If we are in list panel, then reload the self.documents() observable array
            // Otherwise we deleted from the edit panel, so go to the list panel
            if (self.inListPanel())
                self.loadDocuments();
            else
                location.hash = self.options.hash.index;
        });

        return self;
    };

    // load all templates and populate the self.templates() array observable
    // FIXME:: uses dummy data for the moment
    self.loadTemplates = function() {
        console.log('self.loadTemplates');
        self.templates([]);
        self.templates.push({ title: 'Πρότυπο Α' });
        self.templates.push({ title: 'Πρότυπο Β' });
        self.templates.push({ title: 'Πρότυπο Γ' });
        self.templates.push({ title: 'Πρότυπο Δ' });

        return self;
    };

    // Read current document permissions
    self.loadDocumentPermissions = function() {
        // FIXME:: still returns the whole document and not only the privacy fields
        getApiCall(self.apiUrl + self.document.id() + '?fields={"privacy":1}', function(json) {
            console.log('----> self.readDocumentPermissions:');
            console.log(json);
            if (json.data.privacy)
                self.document.deserializePermissions(json.data.privacy);
        });

        return self;
    };

    // Save current document permissions
    self.saveDocumentPermissions = function() {
        if (self.document.userCanManage()) {
            self.editor.busy(true);

            var privacyData = self.document.serializePermissions();
            console.log('saveDocumentPermissions');
            console.log(privacyData);

            if (! $.isEmptyObject(privacyData)) {
                var contentData = { privacy: privacyData };
                //contentData.privacy = privacyData;
                console.log(contentData);

                var data = JSON.stringify(contentData);
                putNewApiCall(self.apiUrl + self.document.id(), data, function() {
                    self.editor.busy(false);
                    self.loadDocumentPermissions();
                });
            }

            return self;
        }
    };

    // Load user contacts and hives in order to present them in the selection modal
    self.loadContactsAndHives = function() {
    	self.loadContacts();
    	self.loadHives();

        return self;
    };

    // Empty the data structures of contacts and hives
    self.unloadContactsAndHives = function() {
        self.contacts([]);
        self.selectedContacts([]);

        self.hives([]);
        self.selectedHives([]);

        return self;
    };

    // load all user contacts and populate the self.contacts() array observable
    self.loadContacts = function() {
        self.contacts([]);
        self.selectedContacts([]);

        getApiCall(self.options.url.contacts, function(json) {
            if (json.data && json.data instanceof Array) {
	            for (var i = 0; i < json.data.length; i++) {
	                var contact = json.data[i];

	                if (!self.document.userHasPermission(contact.userid)) {
	                    contact.selected = ko.observable(false);
	                    self.contacts.push(contact);
	                }
	            }
            }
        });

        return self;
    };

    // Return truthvalue of whether there are contacts available to select from
    self.hasContacts = ko.pureComputed(function() {
        return self.contacts().length > 0;
    });

    // load all user hives and populate the self.hives() array observable
    self.loadHives = function() {
        self.hives([]);
        self.selectedHives([]);

        getApiCall(self.options.url.hives, function(json) {
            if (json.data && json.data instanceof Array) {
                for (var i = 0; i < json.data.length; i++) {
                    var hive = json.data[i];

                    if (!self.document.userHasPermission(hive._id)) {
                        hive.selected = ko.observable(false);
                        self.hives.push(hive);
                    }
                }
            }
        });

        return self;
    };

    // Return truthvalue of whether there are hives available to select from
    self.hasHives = ko.pureComputed(function() {
        return self.hives().length > 0;
    });

    // Toggle the status of the specified contact to selected or deselected
    self.toggleSelectContact = function(contact) {
    	if (contact.selected())
    		self.selectedContacts.remove(contact);
    	else
    		self.selectedContacts.push(contact);

    	contact.selected(!contact.selected());

        return self;
    };

    // Toggle the status of the specified contact to selected or deselected
    self.toggleSelectHive = function(hive) {
        if (hive.selected())
            self.selectedHives.remove(hive);
        else
            self.selectedHives.push(hive);

        hive.selected(!hive.selected());

        return self;
    };

    // Share selected document with all users
    self.shareWithAll = function() {
        self.document.addUserPermission('all', Permission.READ);

        console.log(ko.mapping.toJSON(self.document.permissions()));
        self.unloadContactsAndHives();

        return self;
    };

    // Share selected document with all contacts
    self.shareWithContacts = function() {
        self.document.addUserPermission('contacts', Permission.READ);

        console.log(ko.mapping.toJSON(self.document.permissions()));
        self.unloadContactsAndHives();

        return self;
    };

    // Share selected document with the selected contacts, as stored
    // in self.selectedContacts array
    self.addPermissions = function() {
    	var len = self.selectedContacts().length;
    	for (var i = 0; i < len; i++) {
    		var uid = self.selectedContacts()[i].userid;
    		self.document.addUserPermission(uid, Permission.READ);
    	}

    	len = self.selectedHives().length;
    	for (var i = 0; i < len; i++) {
    	    var hive = self.selectedHives()[i];
    		self.document.addHivePermission(hive._id, Permission.READ);
    	}

    	console.log(ko.mapping.toJSON(self.document.permissions()));
        $('.modal').modal('handleUpdate');
        self.unloadContactsAndHives();

        return self;
    };

    // Remove the specified permission from the list of the current document permissions
    self.removePermission = function(permission) {
        self.document.removePermission(permission);
        return self;
    };

    // Setup local routes and run application
    //
    // The ContentTools app is a single page application, so we use Sammy.js
    // to handle the hash routes. Each hash route handler is then called
    // to display the panel corresponding to the hash route.
    //
    // This is done by setting the value of the currentPanel() observable to
    // the ID of the DOM element that contains the panel's html template.
    // Knockout.js binding mechanism then renders the template by attaching it
    // to the specified parent element.


    self.app = Sammy(function() {
        var hash = self.options.hash;
        var panel = self.options.panel;

        // Hash route '#/' displays the 'home' panel
        this.get(hash.home, function() {
            self.setCurrentPanel(panel.home);
        });

        // Hash route '#/help' displays the 'help' panel
        this.get(hash.help, function() {
            self.setCurrentPanel(panel.help);
        });

        // Hash route '#/index' displays the 'document index' panel
        this.get(hash.index, function() {
            self.loadDocuments()
                .setCurrentPanel(panel.list);
        });

        // Hash route '#/templates' displays the 'document templates' panel
        this.get(hash.templates, function() {
            self.loadTemplates()
                .setCurrentPanel(panel.templates);
        });

        // Hash route '#/:document_id/edit' displays the 'edit' panel
        this.get(hash.edit, function() {
            self.loadDocument(this.params.document_id)
                .setCurrentPanel(panel.edit);
        });

        // Hash route '#/:document_id/info' displays the 'info' panel
        this.get(hash.info, function() {
            self.loadDocument(this.params.document_id)
                .setCurrentPanel(panel.info);
        });

        // Everything else - displays the 'invalid url' panel
        this.get('', function() {
            console.log('Invalid hash [' + window.location.hash + ']')
            self.setCurrentPanel(panel.invalid_hash);
        });
    });

    self.app.run();
}

// Do content_editor staff then
$(document).bind('afterready', function() {

    //HiveCache.load().then(function() { });

    ko.components.register('my-component', {
        template: { fromUrl: 'file.html', maxCacheAge: 120 },
    });

    var templateFromUrlLoader = {
        loadTemplate: function(name, templateConfig, callback) {
            if (templateConfig.fromUrl) {
                // Uses jQuery's ajax facility to load the markup from a file
                var fullUrl = 'templates/' + templateConfig.fromUrl + '?cacheAge=' + templateConfig.maxCacheAge;
                $.get(fullUrl, function(markupString) {
                    // We need an array of DOM nodes, not a string.
                    // We can use the default loader to convert to the
                    // required format.
                    ko.components.defaultLoader.loadTemplate(name, markupString, callback);
                });
            } else {
                // Unrecognized config format. Let another loader handle it.
                callback(null);
            }
        }
    };

    // Register it
    ko.components.loaders.unshift(templateFromUrlLoader);

    // load user profile
    getApiCall('/users/' + logged_user + '/profile', function(json) {
        console.log(json);
        var userProfile = json.data;

        $('#logged-user-avatar').attr('src', userProfile.settings.profile_image);
        $('#logged-user-name').text(userProfile._id);

        // Create the options object, using html templates for data
        var options = {
            template: {
                new_document_title: $('#new_document_title').html(),
                new_document_content: $('#new_document_content').html(),
            }
        };

        var viewModel = new AppContentEditorModel(userProfile, options);
        ko.applyBindings(viewModel);
    });

});