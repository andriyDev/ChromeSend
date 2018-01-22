
var accessToken;
var thisDeviceName;

var devices;
var deviceNames;

function authenticate(interactive)
{
    return new Promise(function(resolve, reject){
        if(!accessToken)
        {
            chrome.identity.getAuthToken({interactive: interactive}, function(token) {
                if (token) {
                    accessToken = token;
                    thisDeviceName = undefined;

                    resolve(accessToken);
                }
                else
                {
                    reject(Error("Failed to acquire authentication token."));
                }
            });
        }
        else
        {
            resolve(accessToken);
        }
    });
}

function ensureValidDeviceName()
{
    return new Promise(function(resolve, reject){
        getStoredDeviceName().then(function(name){
            updateDeviceList().then(function(newDevices){
                devices = newDevices;
                deviceNames = new Array();
                devices.forEach(function(elem){
                    deviceNames.push(elem.name);
                });

                if(deviceNames.indexOf(name) == -1)
                {
                    EditFileOnDrive(name, "", "text/plain", true).then(function(file){
                        thisDeviceName = name;
                        deviceNames.push(elem.title);
                        devices.push({name: elem.title, id: elem.id});
                        resolve(name);
                    }, function(){
                        thisDeviceName = undefined;
                        reject(Error("Invalid device name."));
                    });
                }
                else
                {
                    thisDeviceName = name;
                    resolve(name);
                }
            });
        }, function(err){
            updateDeviceList().then(function(newDevices){
                devices = newDevices;
                deviceNames = new Array();
                devices.forEach(function(elem){
                    deviceNames.push(elem.name);
                });
                thisDeviceName = undefined;
                reject(Error(err));
            }, function(errInner){
                reject(Error(errInner));
            });
        });
    });
}

function tryAuth()
{
    authenticate(false).then(function(){
        tryGetDeviceName();
    }, function(err){
        console.error(err);
    });
}

function tryGetDeviceName()
{
    ensureValidDeviceName().then(function(){
        createDeviceList();
    }, function(err){
        console.error(err);
    });
}

function createDeviceList()
{
    chrome.contextMenus.removeAll(function(){
        chrome.contextMenus.create({
            title: "Send tab to device",
            contexts: ["page"],
            id: "deviceList"
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

function sendTabToAllDevices(info, tab)
{
    devices.forEach(function(elem){
        GetFileData(elem.id).then(function(data){
            data += "\n" + tab.url;
            EditFileOnDrive(elem.id, data, 'text/plain', false, true).then(function(){
                
            }, function(err){
                console.error(err);
            });
        }, function(err){
            console.error(err);
        });
    });
}

function sendTabToDevice(info, tab)
{
    GetFileData(info.menuItemId).then(function(data){
        data += "\n" + tab.url;
        EditFileOnDrive(info.menuItemId, data, "text/plain", false, true).then(function(){
        
        }, function(err){
            console.error(err);
        });
    }, function(err){
        console.error(err);
    });
}

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse){
    if(request.greeting == "update")
    {
        if(!accessToken)
        {
            tryAuth();
        }
        else if(!thisDeviceName)
        {
            tryGetDeviceName();
        }
    }
});

tryAuth();
