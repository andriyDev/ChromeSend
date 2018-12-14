
var accessToken;
var thisDeviceId;
var thisDeviceName;
var devices;
var deviceNames;

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
        UpdateFileOnDrive(thisDeviceId, "", "text/plain").then(function(){
            
        }, function(err){
            console.error(err);
        });
    }, function(err){
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
            if (!token) {
                reject("Failed to acquire token!");
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
            $('#deviceName').append(thisDeviceName);
            $('#readyToSend').show();
            $('#settingsLink').show();
            updateContextMenus();
            openTabs();
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
        if(elem.id != thisDeviceId)
        {
            const devName = $("<span></span>").text(elem.name);
            const delBtn = $("<button></button>").data("deldev", elem.id).addClass("btn btn-danger").text("Delete");
            const newElem = $('<li class="list-group-item deleteElem"></li>').append(devName).append(delBtn);
            list.append(newElem);
            delBtn.click(() => {
                deleteDevice(elem.id);
            });
        }
    });
}

function deleteSelf()
{
    if(thisDeviceId)
    {
        deleteDevice(thisDeviceId);
        thisDeviceId = undefined;
        thisDeviceName = undefined;
        clearStoredDeviceName().then(function(){
            $('#needsAuth').show();
            $('#needsUserName').hide();
            $('#readyToSend').hide();

            $('#readyIdle').show();
            $('#readySettings').hide();

            accessToken = undefined;

            authorize(false);
        }, function(err){
            console.error(err);
        });
    }
}

function deleteDevice(id)
{
    DeleteFileOnDrive(id).then(function(){
        updateDeviceList().then(function(newDevices){
            applyDeviceList(newDevices);
            populateDeviceLists();
        }, function(err){
            console.error(err);
        });
    }, function(err){
        console.error(err);
    });
}

function editingName()
{
    $('#sendUser').prop('disabled', devices.indexOf($('#username').val()) != -1);
}

function completeName()
{
    $('#changeDeviceNameStatus').empty();
    if(accessToken)
    {
        var name = $('#username').val();
        if(deviceNames.indexOf(name) == -1)
        {
            setStoredDeviceName(name).then(function(){
                CreateFileOnDrive(name, "", 'text/plain', true).then(function(file){
                    $('#needsUserName').hide();
                    $('#deviceName').empty().append(name);
                    $('#readyToSend').show();

                    devices.push({name: name, id: file.id});
                    deviceNames.push(name);

                    thisDeviceId = file.id;
                    thisDeviceName = name;

                    populateDeviceLists();
                    
                    updateContextMenus();
                    openTabs();
                }, function (err){
                    $('changeDeviceNameStatus').append("<span style='color:red'>Failed to update device name!</span>");
                });
            }, function(err) {
                $('changeDeviceNameStatus').append("<span style='color:red'>Failed to update device name!</span>");
            });
        }
        else
        {
            $('changeDeviceNameStatus').append("<span style='color:red'>Device name is not unique!</span>");
        }
    }
    else
    {
        $('changeDeviceNameStatus').append("<span style='color:red'>No authorization!</span>");
    }
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
