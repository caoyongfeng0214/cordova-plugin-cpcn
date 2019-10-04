
 /******************************************************************************************** 
 	 THIS FILE HAS BEEN COMPILED FROM TYPESCRIPT SOURCES. 
 	 PLEASE DO NOT MODIFY THIS FILE DIRECTLY AS YOU WILL LOSE YOUR CHANGES WHEN RECOMPILING. 
 	 INSTEAD, EDIT THE TYPESCRIPT SOURCES UNDER THE WWW FOLDER, AND THEN RUN GULP. 
 	 FOR MORE INFORMATION, PLEASE SEE CONTRIBUTING.md. 
 *********************************************************************************************/ 


"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var path = require("path");
var ProjectManager = require("./projectManager");
var tu = require("./testUtil");
var Q = require("q");
var Android = (function () {
    function Android(emulatorManager) {
        this.emulatorManager = emulatorManager;
    }
    Android.getInstance = function () {
        if (!this.instance) {
            this.instance = new Android(new AndroidEmulatorManager());
        }
        return this.instance;
    };
    Android.prototype.getCordovaName = function () {
        return "android";
    };
    Android.prototype.getServerUrl = function () {
        if (!this.serverUrl)
            this.serverUrl = tu.TestUtil.readAndroidServerUrl();
        return this.serverUrl;
    };
    Android.prototype.getPlatformWwwPath = function (projectDirectory) {
        return path.join(projectDirectory, "platforms/android/assets/www");
    };
    Android.prototype.getEmulatorManager = function () {
        return this.emulatorManager;
    };
    Android.prototype.getDefaultDeploymentKey = function () {
        return "mock-android-deployment-key";
    };
    return Android;
}());
exports.Android = Android;
var IOS = (function () {
    function IOS(emulatorManager) {
        this.emulatorManager = emulatorManager;
    }
    IOS.getInstance = function () {
        if (!this.instance) {
            this.instance = new IOS(new IOSEmulatorManager());
        }
        return this.instance;
    };
    IOS.prototype.getCordovaName = function () {
        return "ios";
    };
    IOS.prototype.getServerUrl = function () {
        if (!this.serverUrl)
            this.serverUrl = tu.TestUtil.readIOSServerUrl();
        return this.serverUrl;
    };
    IOS.prototype.getPlatformWwwPath = function (projectDirectory) {
        return path.join(projectDirectory, "platforms/ios/www");
    };
    IOS.prototype.getEmulatorManager = function () {
        return this.emulatorManager;
    };
    IOS.prototype.getDefaultDeploymentKey = function () {
        return "mock-ios-deployment-key";
    };
    return IOS;
}());
exports.IOS = IOS;
var emulatorMaxReadyAttempts = 5;
var emulatorReadyCheckDelayMs = 30 * 1000;
function bootEmulatorInternal(platformName, restartEmulators, targetEmulator, checkEmulator, startEmulator, killEmulator) {
    var deferred = Q.defer();
    console.log("Setting up " + platformName + " emulator.");
    function onEmulatorReady() {
        console.log(platformName + " emulator is ready!");
        deferred.resolve(undefined);
        return deferred.promise;
    }
    function checkEmulatorReady() {
        var checkDeferred = Q.defer();
        console.log("Checking if " + platformName + " emulator is ready yet...");
        checkEmulator()
            .then(function () {
            checkDeferred.resolve(undefined);
        }, function (error) {
            console.log(platformName + " emulator is not ready yet!");
            checkDeferred.reject(error);
        });
        return checkDeferred.promise;
    }
    var emulatorReadyAttempts = 0;
    function checkEmulatorReadyLooper() {
        var looperDeferred = Q.defer();
        emulatorReadyAttempts++;
        if (emulatorReadyAttempts > emulatorMaxReadyAttempts) {
            console.log(platformName + " emulator is not ready after " + emulatorMaxReadyAttempts + " attempts, abort.");
            deferred.reject(platformName + " emulator failed to boot.");
            looperDeferred.resolve(undefined);
        }
        setTimeout(function () {
            checkEmulatorReady()
                .then(function () {
                looperDeferred.resolve(undefined);
                onEmulatorReady();
            }, function () {
                return checkEmulatorReadyLooper().then(function () { looperDeferred.resolve(undefined); }, function () { looperDeferred.reject(undefined); });
            });
        }, emulatorReadyCheckDelayMs);
        return looperDeferred.promise;
    }
    function startEmulatorAndLoop() {
        console.log("Booting " + platformName + " emulator named " + targetEmulator + ".");
        startEmulator(targetEmulator).catch(function (error) { console.log(error); deferred.reject(error); });
        return checkEmulatorReadyLooper();
    }
    var promise;
    if (restartEmulators) {
        console.log("Killing " + platformName + " emulator.");
        promise = killEmulator().catch(function () { return null; }).then(startEmulatorAndLoop);
    }
    else {
        promise = checkEmulatorReady().then(onEmulatorReady, startEmulatorAndLoop);
    }
    return deferred.promise;
}
var IOSEmulatorManager = (function () {
    function IOSEmulatorManager() {
    }
    IOSEmulatorManager.prototype.bootEmulator = function (restartEmulators) {
        function checkIOSEmulator() {
            return tu.TestUtil.getProcessOutput("xcrun simctl getenv booted asdf");
        }
        function startIOSEmulator(iOSEmulatorName) {
            return tu.TestUtil.getProcessOutput("xcrun instruments -w \"" + iOSEmulatorName + "\"")
                .catch(function (error) { return undefined; });
        }
        function killIOSEmulator() {
            return tu.TestUtil.getProcessOutput("killall Simulator");
        }
        return tu.TestUtil.readIOSEmulator()
            .then(function (iOSEmulatorName) {
            return bootEmulatorInternal("iOS", restartEmulators, iOSEmulatorName, checkIOSEmulator, startIOSEmulator, killIOSEmulator);
        });
    };
    IOSEmulatorManager.prototype.launchInstalledApplication = function (appId) {
        return tu.TestUtil.getProcessOutput("xcrun simctl launch booted " + appId, undefined);
    };
    IOSEmulatorManager.prototype.endRunningApplication = function (appId) {
        return tu.TestUtil.getProcessOutput("xcrun simctl spawn booted launchctl list", undefined)
            .then(function (processListOutput) {
            var regex = new RegExp("(\\S+" + appId + "\\S+)");
            var execResult = regex.exec(processListOutput);
            if (execResult) {
                return execResult[0];
            }
            else {
                return Q.reject("Could not get the running application label.");
            }
        })
            .then(function (applicationLabel) {
            return tu.TestUtil.getProcessOutput("xcrun simctl spawn booted launchctl stop " + applicationLabel, undefined);
        }, function (error) {
            return Q.resolve(error);
        });
    };
    IOSEmulatorManager.prototype.restartApplication = function (appId) {
        var _this = this;
        return this.endRunningApplication(appId)
            .then(function () {
            return Q.delay(1000);
        })
            .then(function () { return _this.launchInstalledApplication(appId); });
    };
    IOSEmulatorManager.prototype.resumeApplication = function (appId, delayBeforeResumingMs) {
        var _this = this;
        if (delayBeforeResumingMs === void 0) { delayBeforeResumingMs = 1000; }
        return this.launchInstalledApplication("com.apple.camera")
            .then(function () {
            console.log("Waiting for " + delayBeforeResumingMs + "ms before resuming the test application.");
            return Q.delay(delayBeforeResumingMs);
        })
            .then(function () {
            return _this.launchInstalledApplication(appId);
        });
    };
    IOSEmulatorManager.prototype.prepareEmulatorForTest = function (appId) {
        return this.endRunningApplication(appId);
    };
    IOSEmulatorManager.prototype.uninstallApplication = function (appId) {
        return tu.TestUtil.getProcessOutput("xcrun simctl uninstall booted " + appId, undefined);
    };
    return IOSEmulatorManager;
}());
exports.IOSEmulatorManager = IOSEmulatorManager;
var AndroidEmulatorManager = (function () {
    function AndroidEmulatorManager() {
    }
    AndroidEmulatorManager.prototype.bootEmulator = function (restartEmulators) {
        function checkAndroidEmulator() {
            return tu.TestUtil.getProcessOutput("adb shell pm list packages");
        }
        function startAndroidEmulator(androidEmulatorName) {
            return tu.TestUtil.getProcessOutput("emulator @" + androidEmulatorName);
        }
        function killAndroidEmulator() {
            return tu.TestUtil.getProcessOutput("adb emu kill");
        }
        return bootEmulatorInternal("Android", restartEmulators, tu.TestUtil.readAndroidEmulator(), checkAndroidEmulator, startAndroidEmulator, killAndroidEmulator);
    };
    AndroidEmulatorManager.prototype.launchInstalledApplication = function (appId) {
        return ProjectManager.ProjectManager.execChildProcess("adb shell monkey -p " + appId + " -c android.intent.category.LAUNCHER 1");
    };
    AndroidEmulatorManager.prototype.endRunningApplication = function (appId) {
        return ProjectManager.ProjectManager.execChildProcess("adb shell am force-stop " + appId);
    };
    AndroidEmulatorManager.prototype.restartApplication = function (appId) {
        var _this = this;
        return this.endRunningApplication(appId)
            .then(function () {
            return Q.delay(1000);
        })
            .then(function () {
            return _this.launchInstalledApplication(appId);
        });
    };
    AndroidEmulatorManager.prototype.resumeApplication = function (appId, delayBeforeResumingMs) {
        var _this = this;
        if (delayBeforeResumingMs === void 0) { delayBeforeResumingMs = 1000; }
        return this.launchInstalledApplication("com.android.settings")
            .then(function () {
            console.log("Waiting for " + delayBeforeResumingMs + "ms before resuming the test application.");
            return Q.delay(delayBeforeResumingMs);
        })
            .then(function () {
            return _this.launchInstalledApplication(appId);
        });
    };
    AndroidEmulatorManager.prototype.prepareEmulatorForTest = function (appId) {
        return this.endRunningApplication(appId)
            .then(function () { return ProjectManager.ProjectManager.execChildProcess("adb shell pm clear " + appId); });
    };
    AndroidEmulatorManager.prototype.uninstallApplication = function (appId) {
        return ProjectManager.ProjectManager.execChildProcess("adb uninstall " + appId);
    };
    return AndroidEmulatorManager;
}());
exports.AndroidEmulatorManager = AndroidEmulatorManager;
var PlatformResolver = (function () {
    function PlatformResolver() {
    }
    PlatformResolver.resolvePlatforms = function (cordovaPlatformNames) {
        var platforms = [];
        for (var i = 0; i < cordovaPlatformNames.length; i++) {
            var resolvedPlatform = PlatformResolver.resolvePlatform(cordovaPlatformNames[i]);
            if (resolvedPlatform)
                platforms.push(resolvedPlatform);
            else {
                console.error("Unsupported platform: " + cordovaPlatformNames[i]);
                return undefined;
            }
        }
        return platforms;
    };
    PlatformResolver.resolvePlatform = function (cordovaPlatformName) {
        for (var i = 0; i < this.supportedPlatforms.length; i++) {
            if (this.supportedPlatforms[i].getCordovaName() === cordovaPlatformName) {
                return this.supportedPlatforms[i];
            }
        }
        console.error("Unsupported platform: " + cordovaPlatformName);
        return undefined;
    };
    PlatformResolver.supportedPlatforms = [Android.getInstance(), IOS.getInstance()];
    return PlatformResolver;
}());
exports.PlatformResolver = PlatformResolver;
