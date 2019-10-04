
 /******************************************************************************************** 
 	 THIS FILE HAS BEEN COMPILED FROM TYPESCRIPT SOURCES. 
 	 PLEASE DO NOT MODIFY THIS FILE DIRECTLY AS YOU WILL LOSE YOUR CHANGES WHEN RECOMPILING. 
 	 INSTEAD, EDIT THE TYPESCRIPT SOURCES UNDER THE WWW FOLDER, AND THEN RUN GULP. 
 	 FOR MORE INFORMATION, PLEASE SEE CONTRIBUTING.md. 
 *********************************************************************************************/ 


"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var child_process = require("child_process");
var os = require("os");
var path = require("path");
var Q = require("q");
var TestUtil = (function () {
    function TestUtil() {
    }
    TestUtil.readTestRunDirectory = function () {
        var commandLineOption = TestUtil.readMochaCommandLineOption(TestUtil.TEST_RUN_DIRECTORY);
        var testRunDirectory = commandLineOption ? commandLineOption : TestUtil.defaultTestRunDirectory;
        console.log("testRunDirectory = " + testRunDirectory);
        return testRunDirectory;
    };
    TestUtil.readTestUpdatesDirectory = function () {
        var commandLineOption = TestUtil.readMochaCommandLineOption(TestUtil.TEST_UPDATES_DIRECTORY);
        var testUpdatesDirectory = commandLineOption ? commandLineOption : TestUtil.defaultUpdatesDirectory;
        console.log("testUpdatesDirectory = " + testUpdatesDirectory);
        return testUpdatesDirectory;
    };
    TestUtil.readPluginPath = function () {
        var commandLineFlag = TestUtil.readMochaCommandLineFlag(TestUtil.PULL_FROM_NPM);
        var pluginPath = commandLineFlag ? "cordova-plugin-code-push" : TestUtil.thisPluginPath;
        console.log("pluginPath = " + pluginPath);
        return pluginPath;
    };
    TestUtil.readAndroidServerUrl = function () {
        var commandLineOption = TestUtil.readMochaCommandLineOption(TestUtil.ANDROID_SERVER_URL);
        var androidServerUrl = commandLineOption ? commandLineOption : TestUtil.defaultAndroidServerUrl;
        console.log("androidServerUrl = " + androidServerUrl);
        return androidServerUrl;
    };
    TestUtil.readIOSServerUrl = function () {
        var commandLineOption = TestUtil.readMochaCommandLineOption(TestUtil.IOS_SERVER_URL);
        var iOSServerUrl = commandLineOption ? commandLineOption : TestUtil.defaultIOSServerUrl;
        return iOSServerUrl;
    };
    TestUtil.readAndroidEmulator = function () {
        var commandLineOption = TestUtil.readMochaCommandLineOption(TestUtil.ANDROID_EMULATOR);
        var androidEmulator = commandLineOption ? commandLineOption : TestUtil.defaultAndroidEmulator;
        return androidEmulator;
    };
    TestUtil.readIOSEmulator = function () {
        var deferred = Q.defer();
        function onReadIOSEmuName(iOSEmulatorName) {
            console.log("Using " + iOSEmulatorName + " for iOS tests");
            deferred.resolve(iOSEmulatorName);
        }
        var commandLineOption = TestUtil.readMochaCommandLineOption(TestUtil.IOS_EMULATOR);
        if (commandLineOption) {
            onReadIOSEmuName(commandLineOption);
        }
        else {
            this.getProcessOutput("xcrun simctl list")
                .then(function (listOfDevicesWithDevicePairs) {
                var listOfDevices = listOfDevicesWithDevicePairs.slice(listOfDevicesWithDevicePairs.indexOf("-- iOS"), listOfDevicesWithDevicePairs.indexOf("-- tvOS"));
                var phoneDevice = /iPhone (\S* )*(\(([0-9A-Z-]*)\))/g;
                var match = listOfDevices.match(phoneDevice);
                onReadIOSEmuName(match[match.length - 1]);
            })
                .catch(function () {
                deferred.reject(undefined);
            });
        }
        return deferred.promise;
    };
    TestUtil.readRestartEmulators = function () {
        var restartEmulators = TestUtil.readMochaCommandLineFlag(TestUtil.RESTART_EMULATORS);
        if (restartEmulators)
            console.log("restart emulators");
        return restartEmulators;
    };
    TestUtil.readCoreTestsOnly = function () {
        var coreTestsOnly = TestUtil.readMochaCommandLineFlag(TestUtil.CORE_TESTS_ONLY);
        if (coreTestsOnly)
            console.log("only core tests");
        return coreTestsOnly;
    };
    TestUtil.readShouldSetup = function () {
        var noSetup = TestUtil.readMochaCommandLineFlag(TestUtil.SETUP);
        if (noSetup)
            console.log("set up test project directories");
        return noSetup;
    };
    TestUtil.readTargetPlatforms = function () {
        var platforms = [];
        if (this.readMochaCommandLineFlag(TestUtil.ANDROID_PLATFORM_OPTION_NAME)) {
            console.log("Android");
            platforms.push("android");
        }
        if (this.readMochaCommandLineFlag(TestUtil.IOS_PLATFORM_OPTION_NAME)) {
            console.log("iOS");
            platforms.push("ios");
        }
        return platforms;
    };
    TestUtil.readShouldUseWkWebView = function () {
        var shouldUseWkWebView = TestUtil.readMochaCommandLineOption(TestUtil.SHOULD_USE_WKWEBVIEW);
        switch (shouldUseWkWebView) {
            case "true":
                console.log("WkWebView");
                return 1;
            case "both":
                console.log("Both WkWebView and UIWebView");
                return 2;
            case "false":
            default:
                return 0;
        }
    };
    TestUtil.readMochaCommandLineOption = function (optionName) {
        var optionValue = undefined;
        for (var i = 0; i < process.argv.length; i++) {
            if (process.argv[i].indexOf(optionName) === 0) {
                if (i + 1 < process.argv.length) {
                    optionValue = process.argv[i + 1];
                }
                break;
            }
        }
        return optionValue;
    };
    TestUtil.readMochaCommandLineFlag = function (optionName) {
        for (var i = 0; i < process.argv.length; i++) {
            if (process.argv[i].indexOf(optionName) === 0) {
                return true;
            }
        }
        return false;
    };
    TestUtil.getProcessOutput = function (command, options, logOutput) {
        if (logOutput === void 0) { logOutput = false; }
        var deferred = Q.defer();
        var result = "";
        options = options || {};
        options.maxBuffer = 1024 * 500;
        if (logOutput) {
            console.log("Running command: " + command);
        }
        child_process.exec(command, options, function (error, stdout, stderr) {
            result += stdout;
            if (logOutput) {
                stdout && console.log(stdout);
            }
            if (logOutput && stderr) {
                console.error("" + stderr);
            }
            if (error) {
                if (logOutput)
                    console.error("" + error);
                deferred.reject(error);
            }
            else {
                deferred.resolve(result);
            }
        });
        return deferred.promise;
    };
    TestUtil.ANDROID_PLATFORM_OPTION_NAME = "--android";
    TestUtil.ANDROID_SERVER_URL = "--androidserver";
    TestUtil.ANDROID_EMULATOR = "--androidemu";
    TestUtil.IOS_PLATFORM_OPTION_NAME = "--ios";
    TestUtil.IOS_SERVER_URL = "--iosserver";
    TestUtil.IOS_EMULATOR = "--iosemu";
    TestUtil.RESTART_EMULATORS = "--clean";
    TestUtil.SHOULD_USE_WKWEBVIEW = "--use-wkwebview";
    TestUtil.TEST_RUN_DIRECTORY = "--test-directory";
    TestUtil.TEST_UPDATES_DIRECTORY = "--updates-directory";
    TestUtil.CORE_TESTS_ONLY = "--core";
    TestUtil.PULL_FROM_NPM = "--npm";
    TestUtil.SETUP = "--setup";
    TestUtil.templatePath = path.join(__dirname, "../../test/template");
    TestUtil.thisPluginPath = path.join(__dirname, "../..");
    TestUtil.defaultAndroidServerUrl = "http://10.0.2.2:3001";
    TestUtil.defaultIOSServerUrl = "http://127.0.0.1:3000";
    TestUtil.defaultAndroidEmulator = "emulator";
    TestUtil.defaultTestRunDirectory = path.join(os.tmpdir(), "cordova-plugin-code-push", "test-run");
    TestUtil.defaultUpdatesDirectory = path.join(os.tmpdir(), "cordova-plugin-code-push", "updates");
    return TestUtil;
}());
exports.TestUtil = TestUtil;
