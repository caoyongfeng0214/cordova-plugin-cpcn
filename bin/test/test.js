
 /******************************************************************************************** 
 	 THIS FILE HAS BEEN COMPILED FROM TYPESCRIPT SOURCES. 
 	 PLEASE DO NOT MODIFY THIS FILE DIRECTLY AS YOU WILL LOSE YOUR CHANGES WHEN RECOMPILING. 
 	 INSTEAD, EDIT THE TYPESCRIPT SOURCES UNDER THE WWW FOLDER, AND THEN RUN GULP. 
 	 FOR MORE INFORMATION, PLEASE SEE CONTRIBUTING.md. 
 *********************************************************************************************/ 


"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var tm = require("./projectManager");
var tu = require("./testUtil");
var su = require("./serverUtil");
var platform = require("./platform");
var path = require("path");
var assert = require("assert");
var Q = require("q");
var express = require("express");
var bodyparser = require("body-parser");
var projectManager = tm.ProjectManager;
var testUtil = tu.TestUtil;
var templatePath = testUtil.templatePath;
var thisPluginPath = testUtil.readPluginPath();
var testRunDirectory = testUtil.readTestRunDirectory();
var updatesDirectory = testUtil.readTestUpdatesDirectory();
var onlyRunCoreTests = testUtil.readCoreTestsOnly();
var targetPlatforms = platform.PlatformResolver.resolvePlatforms(testUtil.readTargetPlatforms());
var shouldUseWkWebView = testUtil.readShouldUseWkWebView();
var shouldSetup = testUtil.readShouldSetup();
var restartEmulators = testUtil.readRestartEmulators();
var TestAppName = "CodePushTest";
var TestNamespace = "com.microsoft.codepush.test";
var AcquisitionSDKPluginName = "code-push";
var WkWebViewEnginePluginName = "cordova-plugin-wkwebview-engine";
var ScenarioCheckForUpdatePath = "js/scenarioCheckForUpdate.js";
var ScenarioCheckForUpdateCustomKey = "js/scenarioCheckForUpdateCustomKey.js";
var ScenarioDownloadUpdate = "js/scenarioDownloadUpdate.js";
var ScenarioInstall = "js/scenarioInstall.js";
var ScenarioInstallOnResumeWithRevert = "js/scenarioInstallOnResumeWithRevert.js";
var ScenarioInstallOnRestartWithRevert = "js/scenarioInstallOnRestartWithRevert.js";
var ScenarioInstallOnRestart2xWithRevert = "js/scenarioInstallOnRestart2xWithRevert.js";
var ScenarioInstallWithRevert = "js/scenarioInstallWithRevert.js";
var ScenarioSync1x = "js/scenarioSync.js";
var ScenarioSyncResume = "js/scenarioSyncResume.js";
var ScenarioSyncResumeDelay = "js/scenarioSyncResumeDelay.js";
var ScenarioSyncRestartDelay = "js/scenarioSyncResumeDelay.js";
var ScenarioSync2x = "js/scenarioSync2x.js";
var ScenarioRestart = "js/scenarioRestart.js";
var ScenarioSyncMandatoryDefault = "js/scenarioSyncMandatoryDefault.js";
var ScenarioSyncMandatoryResume = "js/scenarioSyncMandatoryResume.js";
var ScenarioSyncMandatoryRestart = "js/scenarioSyncMandatoryRestart.js";
var UpdateDeviceReady = "js/updateDeviceReady.js";
var UpdateNotifyApplicationReady = "js/updateNotifyApplicationReady.js";
var UpdateSync = "js/updateSync.js";
var UpdateSync2x = "js/updateSync2x.js";
var UpdateNotifyApplicationReadyConditional = "js/updateNARConditional.js";
var mockResponse;
var testMessageResponse;
var testMessageCallback;
var updateCheckCallback;
var mockUpdatePackagePath;
function cleanupTest() {
    console.log("Cleaning up!");
    mockResponse = undefined;
    testMessageCallback = undefined;
    updateCheckCallback = undefined;
    testMessageResponse = undefined;
}
function setupTests() {
    it("sets up tests correctly", function (done) {
        var promises = [];
        targetPlatforms.forEach(function (platform) {
            promises.push(platform.getEmulatorManager().bootEmulator(restartEmulators));
        });
        console.log("Building test project.");
        promises.push(createTestProject(testRunDirectory));
        console.log("Building update project.");
        promises.push(createTestProject(updatesDirectory));
        Q.all(promises).then(function () { done(); }, function (error) { done(error); });
    });
}
function createTestProject(directory) {
    return projectManager.setupProject(directory, templatePath, TestAppName, TestNamespace)
        .then(function () {
        var promises = [];
        targetPlatforms.forEach(function (platform) {
            promises.push(projectManager.addPlatform(directory, platform));
        });
        return Q.all(promises);
    })
        .then(function () {
        return projectManager.addPlugin(directory, AcquisitionSDKPluginName);
    })
        .then(function () {
        return projectManager.addPlugin(directory, thisPluginPath);
    });
}
function createDefaultResponse() {
    var defaultResponse = new su.CheckForUpdateResponseMock();
    defaultResponse.downloadURL = "";
    defaultResponse.description = "";
    defaultResponse.isAvailable = false;
    defaultResponse.isMandatory = false;
    defaultResponse.appVersion = "";
    defaultResponse.packageHash = "";
    defaultResponse.label = "";
    defaultResponse.packageSize = 0;
    defaultResponse.updateAppVersion = false;
    return defaultResponse;
}
function createMockResponse(mandatory) {
    if (mandatory === void 0) { mandatory = false; }
    var updateResponse = new su.CheckForUpdateResponseMock();
    updateResponse.isAvailable = true;
    updateResponse.appVersion = "1.0.0";
    updateResponse.downloadURL = "mock.url/download";
    updateResponse.isMandatory = mandatory;
    updateResponse.label = "mock-update";
    updateResponse.packageHash = "12345-67890";
    updateResponse.packageSize = 12345;
    updateResponse.updateAppVersion = false;
    return updateResponse;
}
function verifyMessages(expectedMessages, deferred) {
    var messageIndex = 0;
    return function (requestBody) {
        try {
            console.log("Message index: " + messageIndex);
            if (typeof expectedMessages[messageIndex] === "string") {
                assert.equal(expectedMessages[messageIndex], requestBody.message);
            }
            else {
                assert(su.areEqual(expectedMessages[messageIndex], requestBody));
            }
            if (++messageIndex === expectedMessages.length) {
                deferred.resolve(undefined);
            }
        }
        catch (e) {
            deferred.reject(e);
        }
    };
}
function runTests(targetPlatform, useWkWebView) {
    var server;
    function setupServer() {
        console.log("Setting up server at " + targetPlatform.getServerUrl());
        var app = express();
        app.use(bodyparser.json());
        app.use(bodyparser.urlencoded({ extended: true }));
        app.use(function (req, res, next) {
            res.setHeader("Access-Control-Allow-Origin", "*");
            res.setHeader("Access-Control-Allow-Methods", "*");
            res.setHeader("Access-Control-Allow-Headers", "origin, content-type, accept, X-CodePush-SDK-Version, X-CodePush-Plugin-Version, X-CodePush-Plugin-Name");
            next();
        });
        app.get("/updateCheck", function (req, res) {
            updateCheckCallback && updateCheckCallback(req);
            res.send(mockResponse);
            console.log("Update check called from the app.");
            console.log("Request: " + JSON.stringify(req.query));
            console.log("Response: " + JSON.stringify(mockResponse));
        });
        app.get("/download", function (req, res) {
            console.log("Application downloading the package.");
            res.download(mockUpdatePackagePath);
        });
        app.post("/reportTestMessage", function (req, res) {
            console.log("Application reported a test message.");
            console.log("Body: " + JSON.stringify(req.body));
            if (!testMessageResponse) {
                console.log("Sending OK");
                res.sendStatus(200);
            }
            else {
                console.log("Sending body: " + testMessageResponse);
                res.status(200).send(testMessageResponse);
            }
            testMessageCallback && testMessageCallback(req.body);
        });
        var serverPortRegEx = /:([0-9]+)/;
        server = app.listen(+targetPlatform.getServerUrl().match(serverPortRegEx)[1]);
    }
    function cleanupServer() {
        if (server) {
            server.close();
            server = undefined;
        }
    }
    function prepareTest() {
        return projectManager.prepareEmulatorForTest(TestNamespace, targetPlatform);
    }
    function getMockResponse(mandatory, randomHash) {
        if (mandatory === void 0) { mandatory = false; }
        if (randomHash === void 0) { randomHash = true; }
        var updateResponse = createMockResponse(mandatory);
        updateResponse.downloadURL = targetPlatform.getServerUrl() + "/download";
        if (randomHash) {
            updateResponse.packageHash = "randomHash-" + Math.floor(Math.random() * 10000);
        }
        return updateResponse;
    }
    function setupScenario(scenarioPath) {
        console.log("\nScenario: " + scenarioPath);
        return projectManager.setupScenario(testRunDirectory, TestNamespace, templatePath, scenarioPath, targetPlatform);
    }
    function setupUpdateScenario(updateScenarioPath, version) {
        console.log("Creating an update at location: " + updatesDirectory);
        return projectManager.setupScenario(updatesDirectory, TestNamespace, templatePath, updateScenarioPath, targetPlatform, false, version);
    }
    describe("window.codePush", function () {
        before(function () {
            setupServer();
            return projectManager.uninstallApplication(TestNamespace, targetPlatform);
        });
        after(function () {
            cleanupServer();
            return useWkWebView ? projectManager.removePlugin(testRunDirectory, WkWebViewEnginePluginName).then(function () { return projectManager.removePlugin(updatesDirectory, WkWebViewEnginePluginName); }) : null;
        });
        describe("#window.codePush.checkForUpdate", function () {
            afterEach(function () {
                cleanupTest();
            });
            before(function () {
                return setupScenario(ScenarioCheckForUpdatePath);
            });
            beforeEach(function () {
                return prepareTest();
            });
            if (!onlyRunCoreTests) {
                it("window.codePush.checkForUpdate.noUpdate", function (done) {
                    var noUpdateResponse = createDefaultResponse();
                    noUpdateResponse.isAvailable = false;
                    noUpdateResponse.appVersion = "0.0.1";
                    mockResponse = { updateInfo: noUpdateResponse };
                    testMessageCallback = function (requestBody) {
                        try {
                            assert.equal(su.TestMessage.CHECK_UP_TO_DATE, requestBody.message);
                            done();
                        }
                        catch (e) {
                            done(e);
                        }
                    };
                    projectManager.runPlatform(testRunDirectory, targetPlatform);
                });
                it("window.codePush.checkForUpdate.sendsBinaryHash", function (done) {
                    var noUpdateResponse = createDefaultResponse();
                    noUpdateResponse.isAvailable = false;
                    noUpdateResponse.appVersion = "0.0.1";
                    updateCheckCallback = function (request) {
                        try {
                            assert(request.query.packageHash);
                        }
                        catch (e) {
                            done(e);
                        }
                    };
                    mockResponse = { updateInfo: noUpdateResponse };
                    testMessageCallback = function (requestBody) {
                        try {
                            assert.equal(su.TestMessage.CHECK_UP_TO_DATE, requestBody.message);
                            done();
                        }
                        catch (e) {
                            done(e);
                        }
                    };
                    projectManager.runPlatform(testRunDirectory, targetPlatform);
                });
                it("window.codePush.checkForUpdate.noUpdate.updateAppVersion", function (done) {
                    var updateAppVersionResponse = createDefaultResponse();
                    updateAppVersionResponse.updateAppVersion = true;
                    updateAppVersionResponse.appVersion = "2.0.0";
                    mockResponse = { updateInfo: updateAppVersionResponse };
                    testMessageCallback = function (requestBody) {
                        try {
                            assert.equal(su.TestMessage.CHECK_UP_TO_DATE, requestBody.message);
                            done();
                        }
                        catch (e) {
                            done(e);
                        }
                    };
                    projectManager.runPlatform(testRunDirectory, targetPlatform);
                });
            }
            it("window.codePush.checkForUpdate.update", function (done) {
                var updateResponse = createMockResponse();
                mockResponse = { updateInfo: updateResponse };
                testMessageCallback = function (requestBody) {
                    try {
                        assert.equal(su.TestMessage.CHECK_UPDATE_AVAILABLE, requestBody.message);
                        assert.notEqual(null, requestBody.args[0]);
                        var remotePackage = requestBody.args[0];
                        assert.equal(remotePackage.downloadUrl, updateResponse.downloadURL);
                        assert.equal(remotePackage.isMandatory, updateResponse.isMandatory);
                        assert.equal(remotePackage.label, updateResponse.label);
                        assert.equal(remotePackage.packageHash, updateResponse.packageHash);
                        assert.equal(remotePackage.packageSize, updateResponse.packageSize);
                        assert.equal(remotePackage.deploymentKey, targetPlatform.getDefaultDeploymentKey());
                        done();
                    }
                    catch (e) {
                        done(e);
                    }
                };
                updateCheckCallback = function (request) {
                    try {
                        assert.notEqual(null, request);
                        assert.equal(request.query.deploymentKey, targetPlatform.getDefaultDeploymentKey());
                    }
                    catch (e) {
                        done(e);
                    }
                };
                projectManager.runPlatform(testRunDirectory, targetPlatform);
            });
            if (!onlyRunCoreTests) {
                it("window.codePush.checkForUpdate.error", function (done) {
                    mockResponse = "invalid {{ json";
                    testMessageCallback = function (requestBody) {
                        try {
                            assert.equal(su.TestMessage.CHECK_ERROR, requestBody.message);
                            done();
                        }
                        catch (e) {
                            done(e);
                        }
                    };
                    projectManager.runPlatform(testRunDirectory, targetPlatform);
                });
            }
        });
        if (!onlyRunCoreTests) {
            describe("#window.codePush.checkForUpdate.customKey", function () {
                afterEach(function () {
                    cleanupTest();
                });
                before(function () {
                    return setupScenario(ScenarioCheckForUpdateCustomKey);
                });
                beforeEach(function () {
                    return prepareTest();
                });
                it("window.codePush.checkForUpdate.customKey.update", function (done) {
                    var updateResponse = createMockResponse();
                    mockResponse = { updateInfo: updateResponse };
                    updateCheckCallback = function (request) {
                        try {
                            assert.notEqual(null, request);
                            assert.equal(request.query.deploymentKey, "CUSTOM-DEPLOYMENT-KEY");
                            done();
                        }
                        catch (e) {
                            done(e);
                        }
                    };
                    projectManager.runPlatform(testRunDirectory, targetPlatform);
                });
            });
            describe("#remotePackage.download", function () {
                afterEach(function () {
                    cleanupTest();
                });
                before(function () {
                    return setupScenario(ScenarioDownloadUpdate);
                });
                beforeEach(function () {
                    return prepareTest();
                });
                var getMockResponse = function () {
                    var updateResponse = createMockResponse();
                    updateResponse.downloadURL = targetPlatform.getServerUrl() + "/download";
                    return updateResponse;
                };
                it("remotePackage.download.success", function (done) {
                    mockResponse = { updateInfo: getMockResponse() };
                    mockUpdatePackagePath = path.join(templatePath, "config.xml");
                    testMessageCallback = function (requestBody) {
                        try {
                            assert.equal(su.TestMessage.DOWNLOAD_SUCCEEDED, requestBody.message);
                            done();
                        }
                        catch (e) {
                            done(e);
                        }
                    };
                    projectManager.runPlatform(testRunDirectory, targetPlatform);
                });
                it("remotePackage.download.error", function (done) {
                    mockResponse = { updateInfo: getMockResponse() };
                    mockUpdatePackagePath = path.join(templatePath, "invalid_path.zip");
                    testMessageCallback = function (requestBody) {
                        try {
                            assert.equal(su.TestMessage.DOWNLOAD_ERROR, requestBody.message);
                            done();
                        }
                        catch (e) {
                            done(e);
                        }
                    };
                    projectManager.runPlatform(testRunDirectory, targetPlatform);
                });
            });
            describe("#localPackage.install", function () {
                afterEach(function () {
                    cleanupTest();
                });
                before(function () {
                    return setupScenario(ScenarioInstall);
                });
                beforeEach(function () {
                    return prepareTest();
                });
                var getMockResponse = function () {
                    var updateResponse = createMockResponse();
                    updateResponse.downloadURL = targetPlatform.getServerUrl() + "/download";
                    return updateResponse;
                };
                it("localPackage.install.unzip.error", function (done) {
                    mockResponse = { updateInfo: getMockResponse() };
                    mockUpdatePackagePath = path.join(templatePath, "config.xml");
                    testMessageCallback = function (requestBody) {
                        try {
                            assert.equal(su.TestMessage.INSTALL_ERROR, requestBody.message);
                            done();
                        }
                        catch (e) {
                            done(e);
                        }
                    };
                    projectManager.runPlatform(testRunDirectory, targetPlatform);
                });
                it("localPackage.install.handlesDiff.againstBinary", function (done) {
                    mockResponse = { updateInfo: getMockResponse() };
                    setupUpdateScenario(UpdateNotifyApplicationReady, "Diff Update 1")
                        .then(projectManager.createUpdateArchive.bind(undefined, updatesDirectory, targetPlatform, true))
                        .then(function (updatePath) {
                        var deferred = Q.defer();
                        mockUpdatePackagePath = updatePath;
                        testMessageCallback = verifyMessages([su.TestMessage.UPDATE_INSTALLED, su.TestMessage.DEVICE_READY_AFTER_UPDATE, su.TestMessage.NOTIFY_APP_READY_SUCCESS], deferred);
                        projectManager.runPlatform(testRunDirectory, targetPlatform);
                        return deferred.promise;
                    })
                        .then(function () {
                        var deferred = Q.defer();
                        testMessageCallback = verifyMessages([su.TestMessage.DEVICE_READY_AFTER_UPDATE, su.TestMessage.NOTIFY_APP_READY_SUCCESS], deferred);
                        projectManager.restartApplication(TestNamespace, targetPlatform);
                        return deferred.promise;
                    })
                        .done(done, done);
                });
                it("localPackage.install.immediately", function (done) {
                    mockResponse = { updateInfo: getMockResponse() };
                    setupUpdateScenario(UpdateNotifyApplicationReady, "Update 1")
                        .then(projectManager.createUpdateArchive.bind(undefined, updatesDirectory, targetPlatform))
                        .then(function (updatePath) {
                        var deferred = Q.defer();
                        mockUpdatePackagePath = updatePath;
                        testMessageCallback = verifyMessages([su.TestMessage.UPDATE_INSTALLED, su.TestMessage.DEVICE_READY_AFTER_UPDATE, su.TestMessage.NOTIFY_APP_READY_SUCCESS], deferred);
                        projectManager.runPlatform(testRunDirectory, targetPlatform);
                        return deferred.promise;
                    })
                        .then(function () {
                        var deferred = Q.defer();
                        testMessageCallback = verifyMessages([su.TestMessage.DEVICE_READY_AFTER_UPDATE, su.TestMessage.NOTIFY_APP_READY_SUCCESS], deferred);
                        projectManager.restartApplication(TestNamespace, targetPlatform);
                        return deferred.promise;
                    })
                        .done(done, done);
                });
            });
            describe("#localPackage.install.revert", function () {
                afterEach(function () {
                    cleanupTest();
                });
                before(function () {
                    return setupScenario(ScenarioInstallWithRevert);
                });
                beforeEach(function () {
                    return prepareTest();
                });
                it("localPackage.install.revert.dorevert", function (done) {
                    mockResponse = { updateInfo: getMockResponse() };
                    setupUpdateScenario(UpdateDeviceReady, "Update 1 (bad update)")
                        .then(projectManager.createUpdateArchive.bind(undefined, updatesDirectory, targetPlatform))
                        .then(function (updatePath) {
                        var deferred = Q.defer();
                        mockUpdatePackagePath = updatePath;
                        testMessageCallback = verifyMessages([su.TestMessage.UPDATE_INSTALLED, su.TestMessage.DEVICE_READY_AFTER_UPDATE], deferred);
                        projectManager.runPlatform(testRunDirectory, targetPlatform);
                        return deferred.promise;
                    })
                        .then(function () {
                        var deferred = Q.defer();
                        testMessageCallback = verifyMessages([su.TestMessage.UPDATE_FAILED_PREVIOUSLY], deferred);
                        projectManager.restartApplication(TestNamespace, targetPlatform);
                        return deferred.promise;
                    })
                        .then(function () {
                        console.log("Creating a second failed update.");
                        var deferred = Q.defer();
                        mockResponse = { updateInfo: getMockResponse() };
                        testMessageCallback = verifyMessages([su.TestMessage.UPDATE_INSTALLED, su.TestMessage.DEVICE_READY_AFTER_UPDATE], deferred);
                        projectManager.restartApplication(TestNamespace, targetPlatform);
                        return deferred.promise;
                    })
                        .then(function () {
                        var deferred = Q.defer();
                        testMessageCallback = verifyMessages([su.TestMessage.UPDATE_FAILED_PREVIOUSLY], deferred);
                        projectManager.restartApplication(TestNamespace, targetPlatform);
                        return deferred.promise;
                    })
                        .done(done, done);
                });
                it("localPackage.install.revert.norevert", function (done) {
                    mockResponse = { updateInfo: getMockResponse() };
                    setupUpdateScenario(UpdateNotifyApplicationReady, "Update 1 (good update)")
                        .then(projectManager.createUpdateArchive.bind(undefined, updatesDirectory, targetPlatform))
                        .then(function (updatePath) {
                        var deferred = Q.defer();
                        mockUpdatePackagePath = updatePath;
                        testMessageCallback = verifyMessages([su.TestMessage.UPDATE_INSTALLED, su.TestMessage.DEVICE_READY_AFTER_UPDATE, su.TestMessage.NOTIFY_APP_READY_SUCCESS], deferred);
                        projectManager.runPlatform(testRunDirectory, targetPlatform);
                        return deferred.promise;
                    })
                        .then(function () {
                        var deferred = Q.defer();
                        testMessageCallback = verifyMessages([su.TestMessage.DEVICE_READY_AFTER_UPDATE, su.TestMessage.NOTIFY_APP_READY_SUCCESS], deferred);
                        projectManager.restartApplication(TestNamespace, targetPlatform);
                        return deferred.promise;
                    })
                        .done(done, done);
                });
            });
        }
        describe("#localPackage.installOnNextResume", function () {
            afterEach(function () {
                cleanupTest();
            });
            before(function () {
                return setupScenario(ScenarioInstallOnResumeWithRevert);
            });
            beforeEach(function () {
                return prepareTest();
            });
            it("localPackage.installOnNextResume.dorevert", function (done) {
                mockResponse = { updateInfo: getMockResponse() };
                setupUpdateScenario(UpdateDeviceReady, "Update 1")
                    .then(function () { return projectManager.createUpdateArchive(updatesDirectory, targetPlatform); })
                    .then(function (updatePath) {
                    var deferred = Q.defer();
                    mockUpdatePackagePath = updatePath;
                    testMessageCallback = verifyMessages([su.TestMessage.UPDATE_INSTALLED], deferred);
                    projectManager.runPlatform(testRunDirectory, targetPlatform);
                    return deferred.promise;
                })
                    .then(function () {
                    var deferred = Q.defer();
                    testMessageCallback = verifyMessages([su.TestMessage.DEVICE_READY_AFTER_UPDATE], deferred);
                    projectManager.resumeApplication(TestNamespace, targetPlatform);
                    return deferred.promise;
                })
                    .then(function () {
                    var deferred = Q.defer();
                    testMessageCallback = verifyMessages([su.TestMessage.UPDATE_FAILED_PREVIOUSLY], deferred);
                    projectManager.restartApplication(TestNamespace, targetPlatform);
                    return deferred.promise;
                })
                    .done(done, done);
            });
            if (!onlyRunCoreTests) {
                it("localPackage.installOnNextResume.norevert", function (done) {
                    mockResponse = { updateInfo: getMockResponse() };
                    setupUpdateScenario(UpdateNotifyApplicationReady, "Update 1 (good update)")
                        .then(projectManager.createUpdateArchive.bind(undefined, updatesDirectory, targetPlatform))
                        .then(function (updatePath) {
                        var deferred = Q.defer();
                        mockUpdatePackagePath = updatePath;
                        testMessageCallback = verifyMessages([su.TestMessage.UPDATE_INSTALLED], deferred);
                        projectManager.runPlatform(testRunDirectory, targetPlatform);
                        return deferred.promise;
                    })
                        .then(function () {
                        var deferred = Q.defer();
                        testMessageCallback = verifyMessages([su.TestMessage.DEVICE_READY_AFTER_UPDATE, su.TestMessage.NOTIFY_APP_READY_SUCCESS], deferred);
                        projectManager.resumeApplication(TestNamespace, targetPlatform);
                        return deferred.promise;
                    })
                        .then(function () {
                        var deferred = Q.defer();
                        testMessageCallback = verifyMessages([su.TestMessage.DEVICE_READY_AFTER_UPDATE, su.TestMessage.NOTIFY_APP_READY_SUCCESS], deferred);
                        projectManager.restartApplication(TestNamespace, targetPlatform);
                        return deferred.promise;
                    })
                        .done(done, done);
                });
            }
        });
        describe("#localPackage.installOnNextRestart", function () {
            afterEach(function () {
                cleanupTest();
            });
            before(function () {
                return setupScenario(ScenarioInstallOnRestartWithRevert);
            });
            beforeEach(function () {
                return prepareTest();
            });
            if (!onlyRunCoreTests) {
                it("localPackage.installOnNextRestart.dorevert", function (done) {
                    mockResponse = { updateInfo: getMockResponse() };
                    setupUpdateScenario(UpdateDeviceReady, "Update 1")
                        .then(function () { return projectManager.createUpdateArchive(updatesDirectory, targetPlatform); })
                        .then(function (updatePath) {
                        var deferred = Q.defer();
                        mockUpdatePackagePath = updatePath;
                        testMessageCallback = verifyMessages([su.TestMessage.UPDATE_INSTALLED], deferred);
                        projectManager.runPlatform(testRunDirectory, targetPlatform);
                        return deferred.promise;
                    })
                        .then(function () {
                        var deferred = Q.defer();
                        testMessageCallback = verifyMessages([su.TestMessage.DEVICE_READY_AFTER_UPDATE], deferred);
                        console.log("Update hash: " + mockResponse.updateInfo.packageHash);
                        projectManager.restartApplication(TestNamespace, targetPlatform);
                        return deferred.promise;
                    })
                        .then(function () {
                        var deferred = Q.defer();
                        testMessageCallback = verifyMessages([su.TestMessage.UPDATE_FAILED_PREVIOUSLY], deferred);
                        console.log("Update hash: " + mockResponse.updateInfo.packageHash);
                        projectManager.restartApplication(TestNamespace, targetPlatform);
                        return deferred.promise;
                    })
                        .done(done, done);
                });
            }
            it("localPackage.installOnNextRestart.norevert", function (done) {
                mockResponse = { updateInfo: getMockResponse() };
                setupUpdateScenario(UpdateNotifyApplicationReady, "Update 1 (good update)")
                    .then(projectManager.createUpdateArchive.bind(undefined, updatesDirectory, targetPlatform))
                    .then(function (updatePath) {
                    var deferred = Q.defer();
                    mockUpdatePackagePath = updatePath;
                    testMessageCallback = verifyMessages([su.TestMessage.UPDATE_INSTALLED], deferred);
                    projectManager.runPlatform(testRunDirectory, targetPlatform);
                    return deferred.promise;
                })
                    .then(function () {
                    var deferred = Q.defer();
                    testMessageCallback = verifyMessages([su.TestMessage.DEVICE_READY_AFTER_UPDATE, su.TestMessage.NOTIFY_APP_READY_SUCCESS], deferred);
                    projectManager.restartApplication(TestNamespace, targetPlatform);
                    return deferred.promise;
                })
                    .then(function () {
                    var deferred = Q.defer();
                    testMessageCallback = verifyMessages([su.TestMessage.DEVICE_READY_AFTER_UPDATE, su.TestMessage.NOTIFY_APP_READY_SUCCESS], deferred);
                    projectManager.restartApplication(TestNamespace, targetPlatform);
                    return deferred.promise;
                })
                    .done(done, done);
            });
            if (!onlyRunCoreTests) {
                it("localPackage.installOnNextRestart.revertToPrevious", function (done) {
                    mockResponse = { updateInfo: getMockResponse() };
                    setupUpdateScenario(UpdateNotifyApplicationReadyConditional, "Update 1 (good update)")
                        .then(projectManager.createUpdateArchive.bind(undefined, updatesDirectory, targetPlatform))
                        .then(function (updatePath) {
                        var deferred = Q.defer();
                        mockUpdatePackagePath = updatePath;
                        testMessageCallback = verifyMessages([su.TestMessage.UPDATE_INSTALLED], deferred);
                        projectManager.runPlatform(testRunDirectory, targetPlatform);
                        return deferred.promise;
                    })
                        .then(function () {
                        var deferred = Q.defer();
                        testMessageCallback = verifyMessages([su.TestMessage.DEVICE_READY_AFTER_UPDATE, su.TestMessage.NOTIFY_APP_READY_SUCCESS, su.TestMessage.UPDATE_INSTALLED], deferred);
                        mockResponse = { updateInfo: getMockResponse() };
                        setupUpdateScenario(UpdateDeviceReady, "Update 2 (bad update)")
                            .then(projectManager.createUpdateArchive.bind(undefined, updatesDirectory, targetPlatform))
                            .then(function () { return projectManager.restartApplication(TestNamespace, targetPlatform); });
                        return deferred.promise;
                    })
                        .then(function () {
                        var deferred = Q.defer();
                        testMessageCallback = verifyMessages([su.TestMessage.DEVICE_READY_AFTER_UPDATE], deferred);
                        projectManager.restartApplication(TestNamespace, targetPlatform);
                        return deferred.promise;
                    })
                        .then(function () {
                        var deferred = Q.defer();
                        testMessageResponse = su.TestMessageResponse.SKIP_NOTIFY_APPLICATION_READY;
                        testMessageCallback = verifyMessages([su.TestMessage.DEVICE_READY_AFTER_UPDATE, su.TestMessage.SKIPPED_NOTIFY_APPLICATION_READY], deferred);
                        projectManager.restartApplication(TestNamespace, targetPlatform);
                        return deferred.promise;
                    })
                        .then(function () {
                        var deferred = Q.defer();
                        testMessageResponse = undefined;
                        testMessageCallback = verifyMessages([su.TestMessage.DEVICE_READY_AFTER_UPDATE, su.TestMessage.NOTIFY_APP_READY_SUCCESS, su.TestMessage.UPDATE_FAILED_PREVIOUSLY], deferred);
                        projectManager.restartApplication(TestNamespace, targetPlatform);
                        return deferred.promise;
                    })
                        .done(done, done);
                });
            }
        });
        if (!onlyRunCoreTests) {
            describe("#localPackage.installOnNextRestart2x", function () {
                afterEach(function () {
                    cleanupTest();
                });
                before(function () {
                    return setupScenario(ScenarioInstallOnRestart2xWithRevert);
                });
                beforeEach(function () {
                    return prepareTest();
                });
                it("localPackage.installOnNextRestart2x.revertToFirst", function (done) {
                    mockResponse = { updateInfo: getMockResponse() };
                    updateCheckCallback = function () {
                        mockResponse.packageHash = "randomHash-" + Math.floor(Math.random() * 10000);
                    };
                    setupUpdateScenario(UpdateDeviceReady, "Bad Update")
                        .then(projectManager.createUpdateArchive.bind(undefined, updatesDirectory, targetPlatform))
                        .then(function (updatePath) {
                        var deferred = Q.defer();
                        mockUpdatePackagePath = updatePath;
                        testMessageCallback = verifyMessages([su.TestMessage.UPDATE_INSTALLED, su.TestMessage.UPDATE_INSTALLED], deferred);
                        projectManager.runPlatform(testRunDirectory, targetPlatform);
                        return deferred.promise;
                    })
                        .then(function () {
                        var deferred = Q.defer();
                        testMessageCallback = verifyMessages([su.TestMessage.DEVICE_READY_AFTER_UPDATE], deferred);
                        projectManager.restartApplication(TestNamespace, targetPlatform);
                        return deferred.promise;
                    })
                        .then(function () {
                        var deferred = Q.defer();
                        testMessageCallback = verifyMessages([su.TestMessage.UPDATE_FAILED_PREVIOUSLY], deferred);
                        projectManager.restartApplication(TestNamespace, targetPlatform);
                        return deferred.promise;
                    })
                        .done(done, done);
                });
            });
        }
        describe("#codePush.restartApplication", function () {
            afterEach(function () {
                cleanupTest();
            });
            before(function () {
                return setupScenario(ScenarioRestart);
            });
            beforeEach(function () {
                return prepareTest();
            });
            it("codePush.restartApplication.checkPackages", function (done) {
                mockResponse = { updateInfo: getMockResponse() };
                setupUpdateScenario(UpdateNotifyApplicationReady, "Update 1")
                    .then(function () { return projectManager.createUpdateArchive(updatesDirectory, targetPlatform); })
                    .then(function (updatePath) {
                    var deferred = Q.defer();
                    mockUpdatePackagePath = updatePath;
                    testMessageCallback = verifyMessages([
                        new su.AppMessage(su.TestMessage.PENDING_PACKAGE, [null]),
                        new su.AppMessage(su.TestMessage.CURRENT_PACKAGE, [null]),
                        new su.AppMessage(su.TestMessage.SYNC_STATUS, [su.TestMessage.SYNC_CHECKING_FOR_UPDATE]),
                        new su.AppMessage(su.TestMessage.SYNC_STATUS, [su.TestMessage.SYNC_DOWNLOADING_PACKAGE]),
                        new su.AppMessage(su.TestMessage.SYNC_STATUS, [su.TestMessage.SYNC_INSTALLING_UPDATE]),
                        new su.AppMessage(su.TestMessage.SYNC_STATUS, [su.TestMessage.SYNC_UPDATE_INSTALLED]),
                        new su.AppMessage(su.TestMessage.PENDING_PACKAGE, [mockResponse.updateInfo.packageHash]),
                        new su.AppMessage(su.TestMessage.CURRENT_PACKAGE, [null]),
                        su.TestMessage.DEVICE_READY_AFTER_UPDATE,
                        su.TestMessage.NOTIFY_APP_READY_SUCCESS
                    ], deferred);
                    projectManager.runPlatform(testRunDirectory, targetPlatform);
                    return deferred.promise;
                })
                    .then(function () {
                    var deferred = Q.defer();
                    testMessageCallback = verifyMessages([
                        su.TestMessage.DEVICE_READY_AFTER_UPDATE, su.TestMessage.NOTIFY_APP_READY_SUCCESS
                    ], deferred);
                    projectManager.restartApplication(TestNamespace, targetPlatform);
                    return deferred.promise;
                })
                    .done(done, done);
            });
        });
        describe("#window.codePush.sync", function () {
            if (!onlyRunCoreTests) {
                describe("#window.codePush.sync 1x", function () {
                    afterEach(function () {
                        cleanupTest();
                    });
                    before(function () {
                        return setupScenario(ScenarioSync1x);
                    });
                    beforeEach(function () {
                        return prepareTest();
                    });
                    it("window.codePush.sync.noupdate", function (done) {
                        var noUpdateResponse = createDefaultResponse();
                        noUpdateResponse.isAvailable = false;
                        noUpdateResponse.appVersion = "0.0.1";
                        mockResponse = { updateInfo: noUpdateResponse };
                        Q({})
                            .then(function (p) {
                            var deferred = Q.defer();
                            testMessageCallback = verifyMessages([
                                new su.AppMessage(su.TestMessage.SYNC_STATUS, [su.TestMessage.SYNC_CHECKING_FOR_UPDATE]),
                                new su.AppMessage(su.TestMessage.SYNC_STATUS, [su.TestMessage.SYNC_UP_TO_DATE])
                            ], deferred);
                            projectManager.runPlatform(testRunDirectory, targetPlatform).done();
                            return deferred.promise;
                        })
                            .done(done, done);
                    });
                    it("window.codePush.sync.checkerror", function (done) {
                        mockResponse = "invalid {{ json";
                        Q({})
                            .then(function (p) {
                            var deferred = Q.defer();
                            testMessageCallback = verifyMessages([
                                new su.AppMessage(su.TestMessage.SYNC_STATUS, [su.TestMessage.SYNC_CHECKING_FOR_UPDATE]),
                                new su.AppMessage(su.TestMessage.SYNC_STATUS, [su.TestMessage.SYNC_ERROR])
                            ], deferred);
                            projectManager.runPlatform(testRunDirectory, targetPlatform).done();
                            return deferred.promise;
                        })
                            .done(done, done);
                    });
                    it("window.codePush.sync.downloaderror", function (done) {
                        var invalidUrlResponse = createMockResponse();
                        invalidUrlResponse.downloadURL = path.join(templatePath, "invalid_path.zip");
                        mockResponse = { updateInfo: invalidUrlResponse };
                        Q({})
                            .then(function (p) {
                            var deferred = Q.defer();
                            testMessageCallback = verifyMessages([
                                new su.AppMessage(su.TestMessage.SYNC_STATUS, [su.TestMessage.SYNC_CHECKING_FOR_UPDATE]),
                                new su.AppMessage(su.TestMessage.SYNC_STATUS, [su.TestMessage.SYNC_DOWNLOADING_PACKAGE]),
                                new su.AppMessage(su.TestMessage.SYNC_STATUS, [su.TestMessage.SYNC_ERROR])
                            ], deferred);
                            projectManager.runPlatform(testRunDirectory, targetPlatform).done();
                            return deferred.promise;
                        })
                            .done(done, done);
                    });
                    it("window.codePush.sync.dorevert", function (done) {
                        mockResponse = { updateInfo: getMockResponse() };
                        setupUpdateScenario(UpdateDeviceReady, "Update 1 (bad update)")
                            .then(projectManager.createUpdateArchive.bind(undefined, updatesDirectory, targetPlatform))
                            .then(function (updatePath) {
                            var deferred = Q.defer();
                            mockUpdatePackagePath = updatePath;
                            testMessageCallback = verifyMessages([
                                new su.AppMessage(su.TestMessage.SYNC_STATUS, [su.TestMessage.SYNC_CHECKING_FOR_UPDATE]),
                                new su.AppMessage(su.TestMessage.SYNC_STATUS, [su.TestMessage.SYNC_DOWNLOADING_PACKAGE]),
                                new su.AppMessage(su.TestMessage.SYNC_STATUS, [su.TestMessage.SYNC_INSTALLING_UPDATE]),
                                new su.AppMessage(su.TestMessage.SYNC_STATUS, [su.TestMessage.SYNC_UPDATE_INSTALLED]),
                                su.TestMessage.DEVICE_READY_AFTER_UPDATE
                            ], deferred);
                            projectManager.runPlatform(testRunDirectory, targetPlatform).done();
                            return deferred.promise;
                        })
                            .then(function () {
                            var deferred = Q.defer();
                            testMessageCallback = verifyMessages([
                                new su.AppMessage(su.TestMessage.SYNC_STATUS, [su.TestMessage.SYNC_CHECKING_FOR_UPDATE]),
                                new su.AppMessage(su.TestMessage.SYNC_STATUS, [su.TestMessage.SYNC_UP_TO_DATE])
                            ], deferred);
                            projectManager.restartApplication(TestNamespace, targetPlatform).done();
                            return deferred.promise;
                        })
                            .done(done, done);
                    });
                    it("window.codePush.sync.update", function (done) {
                        mockResponse = { updateInfo: getMockResponse() };
                        setupUpdateScenario(UpdateSync, "Update 1 (good update)")
                            .then(projectManager.createUpdateArchive.bind(undefined, updatesDirectory, targetPlatform))
                            .then(function (updatePath) {
                            var deferred = Q.defer();
                            mockUpdatePackagePath = updatePath;
                            testMessageCallback = verifyMessages([
                                new su.AppMessage(su.TestMessage.SYNC_STATUS, [su.TestMessage.SYNC_CHECKING_FOR_UPDATE]),
                                new su.AppMessage(su.TestMessage.SYNC_STATUS, [su.TestMessage.SYNC_DOWNLOADING_PACKAGE]),
                                new su.AppMessage(su.TestMessage.SYNC_STATUS, [su.TestMessage.SYNC_INSTALLING_UPDATE]),
                                new su.AppMessage(su.TestMessage.SYNC_STATUS, [su.TestMessage.SYNC_UPDATE_INSTALLED]),
                                su.TestMessage.DEVICE_READY_AFTER_UPDATE
                            ], deferred);
                            projectManager.runPlatform(testRunDirectory, targetPlatform).done();
                            return deferred.promise;
                        })
                            .then(function () {
                            var deferred = Q.defer();
                            var noUpdateResponse = createDefaultResponse();
                            noUpdateResponse.isAvailable = false;
                            noUpdateResponse.appVersion = "0.0.1";
                            mockResponse = { updateInfo: noUpdateResponse };
                            testMessageCallback = verifyMessages([su.TestMessage.DEVICE_READY_AFTER_UPDATE], deferred);
                            projectManager.restartApplication(TestNamespace, targetPlatform).done();
                            return deferred.promise;
                        })
                            .done(done, done);
                    });
                });
            }
            describe("#window.codePush.sync 2x", function () {
                afterEach(function () {
                    cleanupTest();
                });
                before(function () {
                    return setupScenario(ScenarioSync2x);
                });
                beforeEach(function () {
                    return prepareTest();
                });
                if (!onlyRunCoreTests) {
                    it("window.codePush.sync.2x.noupdate", function (done) {
                        var noUpdateResponse = createDefaultResponse();
                        noUpdateResponse.isAvailable = false;
                        noUpdateResponse.appVersion = "0.0.1";
                        mockResponse = { updateInfo: noUpdateResponse };
                        Q({})
                            .then(function (p) {
                            var deferred = Q.defer();
                            testMessageCallback = verifyMessages([
                                new su.AppMessage(su.TestMessage.SYNC_STATUS, [su.TestMessage.SYNC_CHECKING_FOR_UPDATE]),
                                new su.AppMessage(su.TestMessage.SYNC_STATUS, [su.TestMessage.SYNC_IN_PROGRESS]),
                                new su.AppMessage(su.TestMessage.SYNC_STATUS, [su.TestMessage.SYNC_UP_TO_DATE])
                            ], deferred);
                            projectManager.runPlatform(testRunDirectory, targetPlatform).done();
                            return deferred.promise;
                        })
                            .done(done, done);
                    });
                    it("window.codePush.sync.2x.checkerror", function (done) {
                        mockResponse = "invalid {{ json";
                        Q({})
                            .then(function (p) {
                            var deferred = Q.defer();
                            testMessageCallback = verifyMessages([
                                new su.AppMessage(su.TestMessage.SYNC_STATUS, [su.TestMessage.SYNC_CHECKING_FOR_UPDATE]),
                                new su.AppMessage(su.TestMessage.SYNC_STATUS, [su.TestMessage.SYNC_IN_PROGRESS]),
                                new su.AppMessage(su.TestMessage.SYNC_STATUS, [su.TestMessage.SYNC_ERROR])
                            ], deferred);
                            projectManager.runPlatform(testRunDirectory, targetPlatform).done();
                            return deferred.promise;
                        })
                            .done(done, done);
                    });
                    it("window.codePush.sync.2x.downloaderror", function (done) {
                        var invalidUrlResponse = createMockResponse();
                        invalidUrlResponse.downloadURL = path.join(templatePath, "invalid_path.zip");
                        mockResponse = { updateInfo: invalidUrlResponse };
                        Q({})
                            .then(function (p) {
                            var deferred = Q.defer();
                            testMessageCallback = verifyMessages([
                                new su.AppMessage(su.TestMessage.SYNC_STATUS, [su.TestMessage.SYNC_CHECKING_FOR_UPDATE]),
                                new su.AppMessage(su.TestMessage.SYNC_STATUS, [su.TestMessage.SYNC_IN_PROGRESS]),
                                new su.AppMessage(su.TestMessage.SYNC_STATUS, [su.TestMessage.SYNC_DOWNLOADING_PACKAGE]),
                                new su.AppMessage(su.TestMessage.SYNC_STATUS, [su.TestMessage.SYNC_ERROR])
                            ], deferred);
                            projectManager.runPlatform(testRunDirectory, targetPlatform).done();
                            return deferred.promise;
                        })
                            .done(done, done);
                    });
                    it("window.codePush.sync.2x.dorevert", function (done) {
                        mockResponse = { updateInfo: getMockResponse() };
                        setupUpdateScenario(UpdateDeviceReady, "Update 1 (bad update)")
                            .then(projectManager.createUpdateArchive.bind(undefined, updatesDirectory, targetPlatform))
                            .then(function (updatePath) {
                            var deferred = Q.defer();
                            mockUpdatePackagePath = updatePath;
                            testMessageCallback = verifyMessages([
                                new su.AppMessage(su.TestMessage.SYNC_STATUS, [su.TestMessage.SYNC_CHECKING_FOR_UPDATE]),
                                new su.AppMessage(su.TestMessage.SYNC_STATUS, [su.TestMessage.SYNC_IN_PROGRESS]),
                                new su.AppMessage(su.TestMessage.SYNC_STATUS, [su.TestMessage.SYNC_DOWNLOADING_PACKAGE]),
                                new su.AppMessage(su.TestMessage.SYNC_STATUS, [su.TestMessage.SYNC_INSTALLING_UPDATE]),
                                new su.AppMessage(su.TestMessage.SYNC_STATUS, [su.TestMessage.SYNC_UPDATE_INSTALLED]),
                                su.TestMessage.DEVICE_READY_AFTER_UPDATE
                            ], deferred);
                            projectManager.runPlatform(testRunDirectory, targetPlatform).done();
                            return deferred.promise;
                        })
                            .then(function () {
                            var deferred = Q.defer();
                            testMessageCallback = verifyMessages([
                                new su.AppMessage(su.TestMessage.SYNC_STATUS, [su.TestMessage.SYNC_CHECKING_FOR_UPDATE]),
                                new su.AppMessage(su.TestMessage.SYNC_STATUS, [su.TestMessage.SYNC_IN_PROGRESS]),
                                new su.AppMessage(su.TestMessage.SYNC_STATUS, [su.TestMessage.SYNC_UP_TO_DATE])
                            ], deferred);
                            projectManager.restartApplication(TestNamespace, targetPlatform).done();
                            return deferred.promise;
                        })
                            .done(done, done);
                    });
                }
                it("window.codePush.sync.2x.update", function (done) {
                    mockResponse = { updateInfo: getMockResponse() };
                    setupUpdateScenario(UpdateSync2x, "Update 1 (good update)")
                        .then(projectManager.createUpdateArchive.bind(undefined, updatesDirectory, targetPlatform))
                        .then(function (updatePath) {
                        var deferred = Q.defer();
                        mockUpdatePackagePath = updatePath;
                        testMessageCallback = verifyMessages([
                            new su.AppMessage(su.TestMessage.SYNC_STATUS, [su.TestMessage.SYNC_CHECKING_FOR_UPDATE]),
                            new su.AppMessage(su.TestMessage.SYNC_STATUS, [su.TestMessage.SYNC_IN_PROGRESS]),
                            new su.AppMessage(su.TestMessage.SYNC_STATUS, [su.TestMessage.SYNC_DOWNLOADING_PACKAGE]),
                            new su.AppMessage(su.TestMessage.SYNC_STATUS, [su.TestMessage.SYNC_INSTALLING_UPDATE]),
                            new su.AppMessage(su.TestMessage.SYNC_STATUS, [su.TestMessage.SYNC_UPDATE_INSTALLED]),
                            su.TestMessage.DEVICE_READY_AFTER_UPDATE,
                            new su.AppMessage(su.TestMessage.SYNC_STATUS, [su.TestMessage.SYNC_IN_PROGRESS])
                        ], deferred);
                        projectManager.runPlatform(testRunDirectory, targetPlatform).done();
                        return deferred.promise;
                    })
                        .then(function () {
                        var deferred = Q.defer();
                        var noUpdateResponse = createDefaultResponse();
                        noUpdateResponse.isAvailable = false;
                        noUpdateResponse.appVersion = "0.0.1";
                        mockResponse = { updateInfo: noUpdateResponse };
                        testMessageCallback = verifyMessages([
                            su.TestMessage.DEVICE_READY_AFTER_UPDATE,
                            new su.AppMessage(su.TestMessage.SYNC_STATUS, [su.TestMessage.SYNC_IN_PROGRESS])
                        ], deferred);
                        projectManager.restartApplication(TestNamespace, targetPlatform).done();
                        return deferred.promise;
                    })
                        .done(done, done);
                });
            });
            if (!onlyRunCoreTests) {
                describe("#window.codePush.sync minimum background duration tests", function () {
                    afterEach(function () {
                        cleanupTest();
                    });
                    beforeEach(function () {
                        return prepareTest();
                    });
                    it("defaults to no minimum", function (done) {
                        mockResponse = { updateInfo: getMockResponse() };
                        setupScenario(ScenarioSyncResume).then(function () {
                            return setupUpdateScenario(UpdateSync, "Update 1 (good update)");
                        })
                            .then(projectManager.createUpdateArchive.bind(undefined, updatesDirectory, targetPlatform))
                            .then(function (updatePath) {
                            var deferred = Q.defer();
                            mockUpdatePackagePath = updatePath;
                            testMessageCallback = verifyMessages([
                                new su.AppMessage(su.TestMessage.SYNC_STATUS, [su.TestMessage.SYNC_UPDATE_INSTALLED])
                            ], deferred);
                            projectManager.runPlatform(testRunDirectory, targetPlatform).done();
                            return deferred.promise;
                        })
                            .then(function () {
                            var deferred = Q.defer();
                            var noUpdateResponse = createDefaultResponse();
                            noUpdateResponse.isAvailable = false;
                            noUpdateResponse.appVersion = "0.0.1";
                            mockResponse = { updateInfo: noUpdateResponse };
                            testMessageCallback = verifyMessages([
                                su.TestMessage.DEVICE_READY_AFTER_UPDATE
                            ], deferred);
                            projectManager.resumeApplication(TestNamespace, targetPlatform).done();
                            return deferred.promise;
                        })
                            .done(done, done);
                    });
                    it("min background duration 5s", function (done) {
                        mockResponse = { updateInfo: getMockResponse() };
                        setupScenario(ScenarioSyncResumeDelay).then(function () {
                            return setupUpdateScenario(UpdateSync, "Update 1 (good update)");
                        })
                            .then(projectManager.createUpdateArchive.bind(undefined, updatesDirectory, targetPlatform))
                            .then(function (updatePath) {
                            var deferred = Q.defer();
                            mockUpdatePackagePath = updatePath;
                            testMessageCallback = verifyMessages([
                                new su.AppMessage(su.TestMessage.SYNC_STATUS, [su.TestMessage.SYNC_UPDATE_INSTALLED])
                            ], deferred);
                            projectManager.runPlatform(testRunDirectory, targetPlatform).done();
                            return deferred.promise;
                        })
                            .then(function () {
                            var noUpdateResponse = createDefaultResponse();
                            noUpdateResponse.isAvailable = false;
                            noUpdateResponse.appVersion = "0.0.1";
                            mockResponse = { updateInfo: noUpdateResponse };
                            return projectManager.resumeApplication(TestNamespace, targetPlatform, 3 * 1000);
                        })
                            .then(function () {
                            var deferred = Q.defer();
                            testMessageCallback = verifyMessages([
                                su.TestMessage.DEVICE_READY_AFTER_UPDATE
                            ], deferred);
                            projectManager.resumeApplication(TestNamespace, targetPlatform, 6 * 1000).done();
                            return deferred.promise;
                        })
                            .done(done, done);
                    });
                    it("has no effect on restart", function (done) {
                        mockResponse = { updateInfo: getMockResponse() };
                        setupScenario(ScenarioSyncRestartDelay).then(function () {
                            return setupUpdateScenario(UpdateSync, "Update 1 (good update)");
                        })
                            .then(projectManager.createUpdateArchive.bind(undefined, updatesDirectory, targetPlatform))
                            .then(function (updatePath) {
                            var deferred = Q.defer();
                            mockUpdatePackagePath = updatePath;
                            testMessageCallback = verifyMessages([
                                new su.AppMessage(su.TestMessage.SYNC_STATUS, [su.TestMessage.SYNC_UPDATE_INSTALLED])
                            ], deferred);
                            projectManager.runPlatform(testRunDirectory, targetPlatform).done();
                            return deferred.promise;
                        })
                            .then(function () {
                            var deferred = Q.defer();
                            var noUpdateResponse = createDefaultResponse();
                            noUpdateResponse.isAvailable = false;
                            noUpdateResponse.appVersion = "0.0.1";
                            mockResponse = { updateInfo: noUpdateResponse };
                            testMessageCallback = verifyMessages([su.TestMessage.DEVICE_READY_AFTER_UPDATE], deferred);
                            projectManager.restartApplication(TestNamespace, targetPlatform).done();
                            return deferred.promise;
                        })
                            .done(done, done);
                    });
                });
                describe("#window.codePush.sync mandatory install mode tests", function () {
                    afterEach(function () {
                        cleanupTest();
                    });
                    beforeEach(function () {
                        return prepareTest();
                    });
                    it("defaults to IMMEDIATE", function (done) {
                        mockResponse = { updateInfo: getMockResponse(true) };
                        setupScenario(ScenarioSyncMandatoryDefault).then(function () {
                            return setupUpdateScenario(UpdateDeviceReady, "Update 1 (good update)");
                        })
                            .then(projectManager.createUpdateArchive.bind(undefined, updatesDirectory, targetPlatform))
                            .then(function (updatePath) {
                            var deferred = Q.defer();
                            mockUpdatePackagePath = updatePath;
                            testMessageCallback = verifyMessages([
                                new su.AppMessage(su.TestMessage.SYNC_STATUS, [su.TestMessage.SYNC_UPDATE_INSTALLED]),
                                su.TestMessage.DEVICE_READY_AFTER_UPDATE
                            ], deferred);
                            projectManager.runPlatform(testRunDirectory, targetPlatform).done();
                            return deferred.promise;
                        })
                            .done(done, done);
                    });
                    it("works correctly when update is mandatory and mandatory install mode is specified", function (done) {
                        mockResponse = { updateInfo: getMockResponse(true) };
                        setupScenario(ScenarioSyncMandatoryResume).then(function () {
                            return setupUpdateScenario(UpdateDeviceReady, "Update 1 (good update)");
                        })
                            .then(projectManager.createUpdateArchive.bind(undefined, updatesDirectory, targetPlatform))
                            .then(function (updatePath) {
                            var deferred = Q.defer();
                            mockUpdatePackagePath = updatePath;
                            testMessageCallback = verifyMessages([
                                new su.AppMessage(su.TestMessage.SYNC_STATUS, [su.TestMessage.SYNC_UPDATE_INSTALLED])
                            ], deferred);
                            projectManager.runPlatform(testRunDirectory, targetPlatform).done();
                            return deferred.promise;
                        })
                            .then(function () {
                            var deferred = Q.defer();
                            var noUpdateResponse = createDefaultResponse();
                            noUpdateResponse.isAvailable = false;
                            noUpdateResponse.appVersion = "0.0.1";
                            mockResponse = { updateInfo: noUpdateResponse };
                            testMessageCallback = verifyMessages([
                                su.TestMessage.DEVICE_READY_AFTER_UPDATE
                            ], deferred);
                            projectManager.resumeApplication(TestNamespace, targetPlatform, 5 * 1000).done();
                            return deferred.promise;
                        })
                            .done(done, done);
                    });
                    it("has no effect on updates that are not mandatory", function (done) {
                        mockResponse = { updateInfo: getMockResponse() };
                        setupScenario(ScenarioSyncMandatoryRestart).then(function () {
                            return setupUpdateScenario(UpdateDeviceReady, "Update 1 (good update)");
                        })
                            .then(projectManager.createUpdateArchive.bind(undefined, updatesDirectory, targetPlatform))
                            .then(function (updatePath) {
                            var deferred = Q.defer();
                            mockUpdatePackagePath = updatePath;
                            testMessageCallback = verifyMessages([
                                new su.AppMessage(su.TestMessage.SYNC_STATUS, [su.TestMessage.SYNC_UPDATE_INSTALLED]),
                                su.TestMessage.DEVICE_READY_AFTER_UPDATE
                            ], deferred);
                            projectManager.runPlatform(testRunDirectory, targetPlatform).done();
                            return deferred.promise;
                        })
                            .done(done, done);
                    });
                });
            }
        });
    });
}
describe("CodePush Cordova Plugin", function () {
    this.timeout(100 * 60 * 1000);
    if (shouldSetup)
        describe("Setting Up For Tests", function () { return setupTests(); });
    else {
        targetPlatforms.forEach(function (platform) {
            var prefix = (onlyRunCoreTests ? "Core Tests " : "Tests ") + thisPluginPath + " on ";
            if (platform.getCordovaName() === "ios") {
                if (shouldUseWkWebView === 0 || shouldUseWkWebView === 2)
                    describe(prefix + platform.getCordovaName() + " with UIWebView", function () { return runTests(platform, false); });
                if (shouldUseWkWebView === 1 || shouldUseWkWebView === 2)
                    describe(prefix + platform.getCordovaName() + " with WkWebView", function () { return runTests(platform, true); });
            }
            else {
                describe(prefix + platform.getCordovaName(), function () { return runTests(platform, false); });
            }
        });
    }
});
