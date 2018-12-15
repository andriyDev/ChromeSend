
var accessToken;
var thisDeviceName;

var devices;
var deviceNames;

function authenticate(interactive)
{
    return new Promise(function(resolve, reject){
        if(accessToken)
        {
            resolve(accessToken);
            return;
        }
        chrome.identity.getAuthToken({interactive: interactive}, function(token) {
            if (token == undefined) {
                reject("Failed to acquire authentication token.");
                return;
            }
            accessToken = token;
            thisDeviceName = undefined;

            resolve(accessToken);
        });
    });
}

function onFailReauth(err) {
    // If the problem we had was that we do not have permission, that means our token was invalid.
    if (accessToken && err && err.status && err.status == 401) {
        // In that case, remove the cached token, and then try again to authorize.
        return new Promise(resolve => {
            chrome.identity.removeCachedAuthToken({'token': accessToken}, () => {
                accessToken = undefined;
                resolve();
            });
        }).then(() => {
            return authenticate(false);
        });
    } else {
        throw err;
    }
}

function ensureValidDeviceName()
{
    return getStoredDeviceName().then(function(name){
        thisDeviceName = name;
        return updateDeviceList();
    }, err => {
        thisDeviceName = undefined;
        return updateDeviceList();
    }).then(function(newDevices){
        devices = newDevices;
        deviceNames = new Array();
        devices.forEach(function(elem){
            deviceNames.push(elem.name);
        });

        if(thisDeviceName && deviceNames.indexOf(thisDeviceName) == -1)
        {
            return clearStoredDeviceName().then(function(){
                thisDeviceName = undefined;
                console.log("Invalid device name.");
            }, function(err){
                console.log("Invalid device name.");
            });
        }
        else
        {
            return Promise.resolve(thisDeviceName);
        }
    }).catch(err => {
        return onFailReauth(err).then(() => {
            return ensureValidDeviceName();
        });
    });
}

function getDeviceName()
{
    return ensureValidDeviceName().then(function(){
        createDeviceList();
    });
}

function createDeviceList()
{
    chrome.contextMenus.removeAll(function(){
        chrome.contextMenus.create({
            title: "Send tab to device",
            contexts: ["page"],
            id: "deviceList",
            onclick: updateDevices
        });

        if(devices.length <= 1)
        {
            chrome.contextMenus.create({
                title: "No devices to send to",
                enabled: false,
                parentId: "deviceList",
                contexts: ["page"],
                id: "noDevices"
            });
        }
        else
        {
            chrome.contextMenus.create({
                title: "Send to all other devices",
                parentId: "deviceList",
                contexts: ["page"],
                id: "allDevices",
                onclick: sendTabToAllDevices
            });

            devices.forEach(function(elem){
                if(elem.name != thisDeviceName)
                {
                    chrome.contextMenus.create({
                        title: elem.name,
                        contexts: ["page"],
                        id: elem.id,
                        parentId: "deviceList",
                        onclick: sendTabToDevice
                    });
                }
            });
        }
    });
}

function updateDevices()
{
    thisDeviceName = undefined;

    getDeviceName().catch(err => {
        console.error(err);
    });
}

function sendTabToAllDevices(info, tab)
{
    devices.forEach(function(elem){
        if(elem.name == thisDeviceName)
        {
            return;
        }
        addTabToDevice(elem.id, tab);
    });
}

function sendTabToDevice(info, tab)
{
    addTabToDevice(info.menuItemId)
}

function addTabToDevice(deviceId, tab) {
    return GetFileData(deviceId).then(data => {
        if(data == "")
        {
            data += tab.url;
        }
        else
        {
            data += "\n" + tab.url;
        }
        return UpdateFileOnDrive(deviceId, data, "text/plain");
    }).catch(err => {
        return authenticate(false).then(() => {
            return addTabToDevice(deviceId, tab);
        });
    });
}

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse){
    if(request.greeting == "update")
    {
        authenticate(false).then(() => {
            return getDeviceName();
        }).catch(err => {
            console.error(err);
        });
    }
});

authenticate(false).then(() => {
    return getDeviceName();
}).catch(err => {
    console.error(err);
});
