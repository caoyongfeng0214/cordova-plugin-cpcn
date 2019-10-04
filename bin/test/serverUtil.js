
 /******************************************************************************************** 
 	 THIS FILE HAS BEEN COMPILED FROM TYPESCRIPT SOURCES. 
 	 PLEASE DO NOT MODIFY THIS FILE DIRECTLY AS YOU WILL LOSE YOUR CHANGES WHEN RECOMPILING. 
 	 INSTEAD, EDIT THE TYPESCRIPT SOURCES UNDER THE WWW FOLDER, AND THEN RUN GULP. 
 	 FOR MORE INFORMATION, PLEASE SEE CONTRIBUTING.md. 
 *********************************************************************************************/ 


"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var CheckForUpdateResponseMock = (function () {
    function CheckForUpdateResponseMock() {
    }
    return CheckForUpdateResponseMock;
}());
exports.CheckForUpdateResponseMock = CheckForUpdateResponseMock;
var UpdateCheckRequestMock = (function () {
    function UpdateCheckRequestMock() {
    }
    return UpdateCheckRequestMock;
}());
exports.UpdateCheckRequestMock = UpdateCheckRequestMock;
var TestMessage = (function () {
    function TestMessage() {
    }
    TestMessage.CHECK_UP_TO_DATE = "CHECK_UP_TO_DATE";
    TestMessage.CHECK_UPDATE_AVAILABLE = "CHECK_UPDATE_AVAILABLE";
    TestMessage.CHECK_ERROR = "CHECK_ERROR";
    TestMessage.DOWNLOAD_SUCCEEDED = "DOWNLOAD_SUCCEEDED";
    TestMessage.DOWNLOAD_ERROR = "DOWNLOAD_ERROR";
    TestMessage.UPDATE_INSTALLED = "UPDATE_INSTALLED";
    TestMessage.INSTALL_ERROR = "INSTALL_ERROR";
    TestMessage.DEVICE_READY_AFTER_UPDATE = "DEVICE_READY_AFTER_UPDATE";
    TestMessage.UPDATE_FAILED_PREVIOUSLY = "UPDATE_FAILED_PREVIOUSLY";
    TestMessage.NOTIFY_APP_READY_SUCCESS = "NOTIFY_APP_READY_SUCCESS";
    TestMessage.NOTIFY_APP_READY_FAILURE = "NOTIFY_APP_READY_FAILURE";
    TestMessage.SKIPPED_NOTIFY_APPLICATION_READY = "SKIPPED_NOTIFY_APPLICATION_READY";
    TestMessage.SYNC_STATUS = "SYNC_STATUS";
    TestMessage.RESTART_SUCCEEDED = "RESTART_SUCCEEDED";
    TestMessage.RESTART_FAILED = "RESTART_FAILED";
    TestMessage.PENDING_PACKAGE = "PENDING_PACKAGE";
    TestMessage.CURRENT_PACKAGE = "CURRENT_PACKAGE";
    TestMessage.SYNC_UP_TO_DATE = 0;
    TestMessage.SYNC_UPDATE_INSTALLED = 1;
    TestMessage.SYNC_UPDATE_IGNORED = 2;
    TestMessage.SYNC_ERROR = 3;
    TestMessage.SYNC_IN_PROGRESS = 4;
    TestMessage.SYNC_CHECKING_FOR_UPDATE = 5;
    TestMessage.SYNC_AWAITING_USER_ACTION = 6;
    TestMessage.SYNC_DOWNLOADING_PACKAGE = 7;
    TestMessage.SYNC_INSTALLING_UPDATE = 8;
    return TestMessage;
}());
exports.TestMessage = TestMessage;
var TestMessageResponse = (function () {
    function TestMessageResponse() {
    }
    TestMessageResponse.SKIP_NOTIFY_APPLICATION_READY = "SKIP_NOTIFY_APPLICATION_READY";
    return TestMessageResponse;
}());
exports.TestMessageResponse = TestMessageResponse;
var AppMessage = (function () {
    function AppMessage(message, args) {
        this.message = message;
        this.args = args;
    }
    AppMessage.fromString = function (message) {
        return new AppMessage(message, undefined);
    };
    return AppMessage;
}());
exports.AppMessage = AppMessage;
function areEqual(m1, m2) {
    if (m1 === m2) {
        return true;
    }
    if (!m1 || !m2 || m1.message !== m2.message) {
        return false;
    }
    if (m1.args === m2.args) {
        return true;
    }
    if (!m1.args || !m2.args || m1.args.length !== m2.args.length) {
        return false;
    }
    for (var i = 0; i < m1.args.length; i++) {
        if (m1.args[i] !== m2.args[i]) {
            return false;
        }
    }
    return true;
}
exports.areEqual = areEqual;
