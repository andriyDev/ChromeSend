
let accessToken;
let thisDeviceId;
let thisDeviceName;
let devices;
let deviceNames;

function updateContextMenus()
{
    chrome.runtime.sendMessage({greeting: "update"});
}

function openTabs()
{
    GetFileData(thisDeviceId).then(function(data){
        data.split('\n').forEach(function(elem){
            if(elem != "")
            {
                chrome.tabs.create({url: elem, active: false})
            }
        });
        return UpdateFileOnDrive(thisDeviceId, "", "text/plain");
    }).catch(err => {
        console.error(err);
    });
}

function authorize(interactive)
{
    if(accessToken)
    {
        return Promise.resolve(accessToken);
    }
    return new Promise((resolve, reject) => {
        chrome.identity.getAuthToken({interactive: interactive}, token => {
            if (token == undefined) {
                reject("Failed to acquire token!");
                return;
            }
            resolve(token);
        });
    }).then(token => {
        accessToken = token;
    
        $('#needsAuth').hide();
        return getStoredDeviceName();
    }).then(name => {
        thisDeviceName = name;
        return updateDeviceList();
    }, error => {
        // Failed to get stored device name.
        thisDeviceId = undefined;
        thisDeviceName = undefined;
        return updateDeviceList();
    }).then(newDevices => {
        applyDeviceList(newDevices);
        if(deviceNames.indexOf(thisDeviceName) == -1)
        {
            clearStoredDeviceName().finally(() => {
                thisDeviceName = undefined;
                thisDeviceId = undefined;
                $('#needsUserName').show();
            });
        }
        else
        {
            $('#deviceName').text(thisDeviceName);
            $('#readyToSend').show();
            $('#settingsLink').show();
            updateContextMenus();
            openTabs();
        }
    }).catch(err => {
        // If the problem we had was that we do not have permission, that means our token was invalid.
        if (accessToken && err && err.status && err.status == 401) {
            // In that case, remove the cached token, and then try again to authorize.
            return new Promise((resolve, reject) => {
                chrome.identity.removeCachedAuthToken({'token': accessToken}, () => {
                    accessToken = undefined;
                    resolve();
                });
            }).then(() => {
                $('#needsAuth').show();
                return authorize(interactive);
            });
        } else {
            throw err;
            console.error(err);
        }
    });
}

function applyDeviceList(newDevices)
{
    devices = newDevices;
    deviceNames = new Array();
    devices.map(elem => {
        if(elem.name == thisDeviceName)
        {
            thisDeviceId = elem.id;
        }
        deviceNames.push(elem.name);
    });
    populateDeviceLists();
}

function populateDeviceLists()
{
    var list = $('.deviceList');
    list.empty();
    devices.forEach(function(elem){
        if(elem.id != thisDeviceId)
        {
            list.append("<li class='list-group-item'>" + elem.name + "</li>");
        }
    });

    list = $('#deleteDevice');
    list.empty();
    devices.forEach(function(elem){
        if(elem.id == thisDeviceId)
        {
            return;
        }
        const devName = $("<h5></h5>").text(elem.name);
        const delBtn = $("<button></button>").data("deldev", elem.id).addClass("btn btn-danger btn-sm").text("Delete");
        const container = $('<div></div>').addClass("deleteElem").append(devName).append(delBtn);
        const newElem = $('<li class="list-group-item"></li>').append(container);
        list.append(newElem);
        delBtn.click(() => {
            deleteDevice(elem.id);
        });
    });
}

function deleteSelf()
{
    if(!thisDeviceId)
    {
        return;
    }
    deleteDevice(thisDeviceId).then(() => {
        thisDeviceId = undefined;
        thisDeviceName = undefined;
        return clearStoredDeviceName();
    }).then(function(){
        $('#needsAuth').show();
        $('#needsUserName').hide();
        $('#readyToSend').hide();

        $('#readyIdle').show();
        $('#readySettings').hide();

        accessToken = undefined;

        return authorize(false);
    }).catch(err => {
        console.error(err);
    });
}

function deleteDevice(id)
{
    return DeleteFileOnDrive(id).then(function(){
        return updateDeviceList();
    }).then(function(newDevices){
        applyDeviceList(newDevices);
        populateDeviceLists();
    }).catch(err => {
        console.error(err);
    });
}

function editingName()
{
    $('#sendUser').prop('disabled', devices.indexOf($('#username').val()) != -1);
}

function completeName()
{
    $('#changeDeviceNameStatus').hide();
    if(!accessToken)
    {
        $('#changeDeviceNameStatus').show().text("No authorization!");
        return;
    }
    const name = $('#username').val();
    if(deviceNames.indexOf(name) != -1)
    {
        $('#changeDeviceNameStatus').show().text("Device name is not unique!");
        return;
    }
    setStoredDeviceName(name).then(function(){
        return CreateFileOnDrive(name, "", 'text/plain', true);
    }).then(file => {
        $('#needsUserName').hide();
        $('#deviceName').text(name);
        $('#readyToSend').show();
        $('#settingsLink').show();

        devices.push({name: name, id: file.id});
        deviceNames.push(name);

        thisDeviceId = file.id;
        thisDeviceName = name;

        populateDeviceLists();
        
        updateContextMenus();
        openTabs();
    }).catch(err => {
        $('#changeDeviceNameStatus').show().text("Failed to update device name!");
    });
}

document.addEventListener("DOMContentLoaded", function(e){
    
    $('#needsAuth').show();
    $('#needsUserName').hide();
    $('#readyToSend').hide();

    $('#readyIdle').show();
    $('#readySettings').hide();

    $('#changeDeviceNameStatus').hide();
    $('#settingsLink').hide();

    authorize(false).catch(error => {
        console.error(error);
    });

    $('#authorize-button').click(function(e){ authorize(true); });
    $('#username').keypress(function(e){ editingName(); });
    $('#assignUserName').submit(function(e){ completeName(); return false; });
    $('#reset').click(function(e){ deleteSelf(); });
    $('#settingsLink').click(e => { $('#readyIdle').toggle(); $('#readySettings').toggle(); });
});
