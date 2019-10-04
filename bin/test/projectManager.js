
 /******************************************************************************************** 
 	 THIS FILE HAS BEEN COMPILED FROM TYPESCRIPT SOURCES. 
 	 PLEASE DO NOT MODIFY THIS FILE DIRECTLY AS YOU WILL LOSE YOUR CHANGES WHEN RECOMPILING. 
 	 INSTEAD, EDIT THE TYPESCRIPT SOURCES UNDER THE WWW FOLDER, AND THEN RUN GULP. 
 	 FOR MORE INFORMATION, PLEASE SEE CONTRIBUTING.md. 
 *********************************************************************************************/ 


"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var child_process = require("child_process");
var replace = require("replace");
var path = require("path");
var Q = require("q");
var fs = require("fs");
var mkdirp = require("mkdirp");
var platform = require("./platform");
var del = require("del");
var archiver = require("archiver");
var ProjectManager = (function () {
    function ProjectManager() {
    }
    ProjectManager.setupProject = function (projectDirectory, templatePath, appName, appNamespace, version) {
        if (version === void 0) { version = ProjectManager.DEFAULT_APP_VERSION; }
        if (fs.existsSync(projectDirectory)) {
            del.sync([projectDirectory], { force: true });
        }
        mkdirp.sync(projectDirectory);
        var indexHtml = "www/index.html";
        var destinationIndexPath = path.join(projectDirectory, indexHtml);
        return ProjectManager.execChildProcess("cordova create " + projectDirectory + " " + appNamespace + " " + appName + " --template " + templatePath)
            .then(ProjectManager.replaceString.bind(undefined, destinationIndexPath, ProjectManager.CODE_PUSH_APP_VERSION_PLACEHOLDER, version));
    };
    ProjectManager.setupScenario = function (projectDirectory, appId, templatePath, jsPath, targetPlatform, build, version) {
        if (build === void 0) { build = true; }
        if (version === void 0) { version = ProjectManager.DEFAULT_APP_VERSION; }
        var indexHtml = "www/index.html";
        var templateIndexPath = path.join(templatePath, indexHtml);
        var destinationIndexPath = path.join(projectDirectory, indexHtml);
        var scenarioJs = "www/" + jsPath;
        var templateScenarioJsPath = path.join(templatePath, scenarioJs);
        var destinationScenarioJsPath = path.join(projectDirectory, scenarioJs);
        var configXml = "config.xml";
        var templateConfigXmlPath = path.join(templatePath, configXml);
        var destinationConfigXmlPath = path.join(projectDirectory, configXml);
        var packageFile = eval("(" + fs.readFileSync("./package.json", "utf8") + ")");
        var pluginVersion = packageFile.version;
        console.log("Setting up scenario " + jsPath + " in " + projectDirectory);
        return ProjectManager.copyFile(templateIndexPath, destinationIndexPath, true)
            .then(ProjectManager.replaceString.bind(undefined, destinationIndexPath, ProjectManager.SERVER_URL_PLACEHOLDER, targetPlatform.getServerUrl()))
            .then(ProjectManager.replaceString.bind(undefined, destinationIndexPath, ProjectManager.INDEX_JS_PLACEHOLDER, jsPath))
            .then(ProjectManager.replaceString.bind(undefined, destinationIndexPath, ProjectManager.CODE_PUSH_APP_VERSION_PLACEHOLDER, version))
            .then(function () {
            return ProjectManager.copyFile(templateScenarioJsPath, destinationScenarioJsPath, true);
        })
            .then(ProjectManager.replaceString.bind(undefined, destinationScenarioJsPath, ProjectManager.SERVER_URL_PLACEHOLDER, targetPlatform.getServerUrl()))
            .then(function () {
            return ProjectManager.copyFile(templateConfigXmlPath, destinationConfigXmlPath, true);
        })
            .then(ProjectManager.replaceString.bind(undefined, destinationConfigXmlPath, ProjectManager.ANDROID_KEY_PLACEHOLDER, platform.Android.getInstance().getDefaultDeploymentKey()))
            .then(ProjectManager.replaceString.bind(undefined, destinationConfigXmlPath, ProjectManager.IOS_KEY_PLACEHOLDER, platform.IOS.getInstance().getDefaultDeploymentKey()))
            .then(ProjectManager.replaceString.bind(undefined, destinationConfigXmlPath, ProjectManager.SERVER_URL_PLACEHOLDER, targetPlatform.getServerUrl()))
            .then(ProjectManager.replaceString.bind(undefined, destinationConfigXmlPath, ProjectManager.PLUGIN_VERSION_PLACEHOLDER, pluginVersion))
            .then(function () {
            return build ? ProjectManager.buildPlatform(projectDirectory, targetPlatform) : ProjectManager.preparePlatform(projectDirectory, targetPlatform);
        });
    };
    ProjectManager.createUpdateArchive = function (projectDirectory, targetPlatform, isDiff) {
        var deferred = Q.defer();
        var archive = archiver.create("zip", {});
        var archivePath = path.join(projectDirectory, "update.zip");
        console.log("Creating an update archive at: " + archivePath);
        if (fs.existsSync(archivePath)) {
            fs.unlinkSync(archivePath);
        }
        var writeStream = fs.createWriteStream(archivePath);
        var targetFolder = targetPlatform.getPlatformWwwPath(projectDirectory);
        writeStream.on("close", function () {
            deferred.resolve(archivePath);
        });
        archive.on("error", function (e) {
            deferred.reject(e);
        });
        if (isDiff) {
            archive.append("{\"deletedFiles\":[]}", { name: "hotcodepush.json" });
        }
        archive.directory(targetFolder, "www");
        archive.pipe(writeStream);
        archive.finalize();
        return deferred.promise;
    };
    ProjectManager.addPlugin = function (projectFolder, plugin) {
        console.log("Adding plugin " + plugin + " to " + projectFolder);
        return ProjectManager.execChildProcess("cordova plugin add " + plugin, { cwd: projectFolder });
    };
    ProjectManager.removePlugin = function (projectFolder, plugin) {
        console.log("Removing plugin " + plugin + " from " + projectFolder);
        return ProjectManager.execChildProcess("cordova plugin remove " + plugin, { cwd: projectFolder });
    };
    ProjectManager.buildPlatform = function (projectFolder, targetPlatform) {
        console.log("Building " + targetPlatform.getCordovaName() + " project in " + projectFolder);
        return ProjectManager.execChildProcess("cordova build " + targetPlatform.getCordovaName(), { cwd: projectFolder }, false);
    };
    ProjectManager.preparePlatform = function (projectFolder, targetPlatform) {
        console.log("Preparing " + targetPlatform.getCordovaName() + " project in " + projectFolder);
        return ProjectManager.execChildProcess("cordova prepare " + targetPlatform.getCordovaName(), { cwd: projectFolder });
    };
    ProjectManager.launchApplication = function (appNamespace, targetPlatform) {
        console.log("Launching " + appNamespace + " on " + targetPlatform.getCordovaName());
        return targetPlatform.getEmulatorManager().launchInstalledApplication(appNamespace);
    };
    ProjectManager.endRunningApplication = function (appNamespace, targetPlatform) {
        console.log("Ending " + appNamespace + " on " + targetPlatform.getCordovaName());
        return targetPlatform.getEmulatorManager().endRunningApplication(appNamespace);
    };
    ProjectManager.prepareEmulatorForTest = function (appNamespace, targetPlatform) {
        console.log("Preparing " + targetPlatform.getCordovaName() + " emulator for " + appNamespace + " tests");
        return targetPlatform.getEmulatorManager().prepareEmulatorForTest(appNamespace);
    };
    ProjectManager.uninstallApplication = function (appNamespace, targetPlatform) {
        console.log("Uninstalling " + appNamespace + " on " + targetPlatform.getCordovaName());
        return targetPlatform.getEmulatorManager().uninstallApplication(appNamespace);
    };
    ProjectManager.runPlatform = function (projectFolder, targetPlatform, skipBuild, target) {
        if (skipBuild === void 0) { skipBuild = true; }
        console.log("Running project in " + projectFolder + " on " + targetPlatform.getCordovaName());
        var runTarget = target ? " --target " + target : "";
        var nobuild = skipBuild ? " --nobuild" : "";
        return ProjectManager.execChildProcess("cordova run " + targetPlatform.getCordovaName() + runTarget + nobuild, { cwd: projectFolder });
    };
    ProjectManager.addPlatform = function (projectFolder, targetPlatform, version) {
        console.log("Adding " + targetPlatform.getCordovaName() + " to project in " + projectFolder);
        return ProjectManager.execChildProcess("cordova platform add " + targetPlatform.getCordovaName() + (version ? "@" + version : ""), { cwd: projectFolder });
    };
    ProjectManager.replaceString = function (filePath, regex, replacement) {
        console.log("replacing \"" + regex + "\" with \"" + replacement + "\" in " + filePath);
        replace({ regex: regex, replacement: replacement, recursive: false, silent: true, paths: [filePath] });
    };
    ProjectManager.restartApplication = function (appNamespace, targetPlatform) {
        console.log("Restarting " + appNamespace + " on " + targetPlatform.getCordovaName());
        return targetPlatform.getEmulatorManager().restartApplication(appNamespace);
    };
    ProjectManager.resumeApplication = function (appNamespace, targetPlatform, delayBeforeResumingMs) {
        if (delayBeforeResumingMs === void 0) { delayBeforeResumingMs = 1000; }
        console.log("Resuming " + appNamespace + " on " + targetPlatform.getCordovaName());
        return targetPlatform.getEmulatorManager().resumeApplication(appNamespace, delayBeforeResumingMs);
    };
    ProjectManager.execChildProcess = function (command, options, logOutput) {
        if (logOutput === void 0) { logOutput = true; }
        var deferred = Q.defer();
        options = options || {};
        options.maxBuffer = 1024 * 1024;
        options.timeout = 5 * 60 * 1000;
        console.log("Running command: " + command);
        child_process.exec(command, options, function (error, stdout, stderr) {
            if (logOutput)
                stdout && console.log(stdout);
            stderr && console.error(stderr);
            if (error) {
                console.error(error);
                deferred.reject(error);
            }
            else {
                deferred.resolve(stdout.toString());
            }
        });
        return deferred.promise;
    };
    ProjectManager.copyFile = function (source, destination, overwrite) {
        var deferred = Q.defer();
        try {
            var errorHandler = function (error) {
                deferred.reject(error);
            };
            if (overwrite && fs.existsSync(destination)) {
                fs.unlinkSync(destination);
            }
            var readStream = fs.createReadStream(source);
            readStream.on("error", errorHandler);
            var writeStream = fs.createWriteStream(destination);
            writeStream.on("error", errorHandler);
            writeStream.on("close", deferred.resolve.bind(undefined, undefined));
            readStream.pipe(writeStream);
        }
        catch (e) {
            deferred.reject(e);
        }
        return deferred.promise;
    };
    ProjectManager.ANDROID_KEY_PLACEHOLDER = "CODE_PUSH_ANDROID_DEPLOYMENT_KEY";
    ProjectManager.IOS_KEY_PLACEHOLDER = "CODE_PUSH_IOS_DEPLOYMENT_KEY";
    ProjectManager.SERVER_URL_PLACEHOLDER = "CODE_PUSH_SERVER_URL";
    ProjectManager.INDEX_JS_PLACEHOLDER = "CODE_PUSH_INDEX_JS_PATH";
    ProjectManager.CODE_PUSH_APP_VERSION_PLACEHOLDER = "CODE_PUSH_APP_VERSION";
    ProjectManager.CODE_PUSH_APP_ID_PLACEHOLDER = "CODE_PUSH_TEST_APPLICATION_ID";
    ProjectManager.PLUGIN_VERSION_PLACEHOLDER = "CODE_PUSH_PLUGIN_VERSION";
    ProjectManager.DEFAULT_APP_VERSION = "Store version";
    return ProjectManager;
}());
exports.ProjectManager = ProjectManager;
